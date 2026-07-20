"""
SHAP Explainability API
Provides model explanations for fraud detection and credit scoring decisions.
Compliant with CBN Consumer Protection Framework (right to explanation).
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import numpy as np
import torch
import json
import os
import sys
import logging

sys.path.insert(0, os.path.dirname(__file__))
from shared.logger import get_logger

logger = get_logger("shap-api")
app = FastAPI(title="ML Explainability API", version="1.0.0")

WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "weights")

# ── Feature names ─────────────────────────────────────────────────────────────
FRAUD_FEATURES = [
    "amount_log", "hour_of_day", "day_of_week", "is_weekend",
    "amount_zscore", "user_tx_count_30d", "user_avg_amount_30d",
    "amount_vs_avg_ratio", "unique_merchants_30d", "failed_tx_7d",
    "is_new_device", "is_new_location", "velocity_1h", "velocity_24h",
    "is_international", "amount_round", "is_night_tx", "merchant_risk_score",
    "user_account_age_days", "kyc_level"
]

CREDIT_FEATURES = [
    "income_log", "age", "employment_years", "loan_amount_log",
    "ltv_ratio", "dti_ratio", "credit_score_normalized",
    "payment_history_score", "active_loans", "defaulted_loans",
    "inquiries_6m", "account_age_months", "employment_type_encoded",
    "property_type_encoded", "state_encoded", "loan_purpose_encoded",
    "income_stability", "has_guarantor", "collateral_value_ratio",
    "monthly_obligations_ratio"
]

# ── Request/Response models ───────────────────────────────────────────────────
class FraudExplainRequest(BaseModel):
    features: dict
    transaction_id: Optional[str] = None
    top_k: int = 10

class CreditExplainRequest(BaseModel):
    features: dict
    application_id: Optional[str] = None
    top_k: int = 10

class ExplanationResponse(BaseModel):
    prediction: float
    decision: str
    confidence: float
    top_factors: list
    explanation_text: str
    cbn_explanation: Optional[str] = None
    model_version: str

# ── SHAP approximation using gradient-based attribution ──────────────────────
def compute_gradient_attribution(model, input_tensor, feature_names, top_k=10):
    """
    Compute gradient-based feature attribution (approximates SHAP values).
    Uses integrated gradients for better accuracy than vanilla gradients.
    """
    model.eval()
    input_tensor.requires_grad_(True)
    
    # Integrated gradients: interpolate from baseline (zeros) to input
    baseline = torch.zeros_like(input_tensor)
    n_steps = 50
    attributions = torch.zeros_like(input_tensor)
    
    for step in range(n_steps):
        alpha = step / n_steps
        interpolated = baseline + alpha * (input_tensor - baseline)
        interpolated.requires_grad_(True)
        
        output = model(interpolated)
        if output.dim() > 1:
            output = output[:, 0]
        
        model.zero_grad()
        output.backward(torch.ones_like(output))
        
        if interpolated.grad is not None:
            attributions += interpolated.grad.detach()
    
    # Scale by (input - baseline)
    attributions = attributions / n_steps * (input_tensor.detach() - baseline)
    attributions = attributions.squeeze().numpy()
    
    # Get top-k features by absolute attribution
    abs_attr = np.abs(attributions)
    top_indices = np.argsort(abs_attr)[::-1][:top_k]
    
    factors = []
    for idx in top_indices:
        if idx < len(feature_names):
            factors.append({
                "feature": feature_names[idx],
                "attribution": float(attributions[idx]),
                "impact": "increases_risk" if attributions[idx] > 0 else "decreases_risk",
                "magnitude": float(abs_attr[idx]),
            })
    
    return factors, attributions

# ── Load models ───────────────────────────────────────────────────────────────
fraud_model = None
credit_model = None

def load_models():
    global fraud_model, credit_model
    
    fraud_path = os.path.join(WEIGHTS_DIR, "fraud_best.pt")
    credit_path = os.path.join(WEIGHTS_DIR, "credit_best.pt")
    
    if os.path.exists(fraud_path):
        try:
            fraud_model = torch.load(fraud_path, map_location="cpu", weights_only=False)
            fraud_model.eval()
            logger.info("Fraud model loaded for SHAP API")
        except Exception as e:
            logger.warning(f"Could not load fraud model: {e}")
    
    if os.path.exists(credit_path):
        try:
            credit_model = torch.load(credit_path, map_location="cpu", weights_only=False)
            credit_model.eval()
            logger.info("Credit model loaded for SHAP API")
        except Exception as e:
            logger.warning(f"Could not load credit model: {e}")

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    load_models()

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "fraud_model_loaded": fraud_model is not None,
        "credit_model_loaded": credit_model is not None,
    }

@app.post("/explain/fraud", response_model=ExplanationResponse)
async def explain_fraud(req: FraudExplainRequest):
    if fraud_model is None:
        raise HTTPException(503, "Fraud model not loaded")
    
    # Build feature vector
    feature_vector = []
    for feat in FRAUD_FEATURES:
        feature_vector.append(float(req.features.get(feat, 0.0)))
    
    input_tensor = torch.tensor([feature_vector], dtype=torch.float32)
    
    with torch.no_grad():
        output = fraud_model(input_tensor)
        prob = torch.sigmoid(output).item() if output.shape[-1] == 1 else torch.softmax(output, dim=-1)[0, 1].item()
    
    # Compute attributions
    top_factors, _ = compute_gradient_attribution(fraud_model, input_tensor.clone(), FRAUD_FEATURES, req.top_k)
    
    decision = "FLAGGED" if prob > 0.5 else "APPROVED"
    confidence = prob if prob > 0.5 else 1 - prob
    
    # Human-readable explanation
    top_3 = top_factors[:3]
    explanation_parts = []
    for f in top_3:
        feat_name = f["feature"].replace("_", " ").title()
        if f["impact"] == "increases_risk":
            explanation_parts.append(f"{feat_name} increases fraud risk")
        else:
            explanation_parts.append(f"{feat_name} reduces fraud risk")
    
    explanation = f"Transaction {decision.lower()} with {confidence*100:.1f}% confidence. " + "; ".join(explanation_parts) + "."
    
    cbn_text = None
    if decision == "FLAGGED":
        cbn_text = (
            f"CBN Fraud Alert Explanation: This transaction has been flagged for review "
            f"with a risk score of {prob*100:.1f}%. "
            f"Primary risk factors: {', '.join([f['feature'].replace('_', ' ') for f in top_3])}. "
            f"You may contact customer support to dispute this decision."
        )
    
    return ExplanationResponse(
        prediction=round(prob, 4),
        decision=decision,
        confidence=round(confidence, 4),
        top_factors=top_factors,
        explanation_text=explanation,
        cbn_explanation=cbn_text,
        model_version="fraud_v1",
    )

@app.post("/explain/credit", response_model=ExplanationResponse)
async def explain_credit(req: CreditExplainRequest):
    if credit_model is None:
        raise HTTPException(503, "Credit model not loaded")
    
    feature_vector = []
    for feat in CREDIT_FEATURES:
        feature_vector.append(float(req.features.get(feat, 0.0)))
    
    input_tensor = torch.tensor([feature_vector], dtype=torch.float32)
    
    with torch.no_grad():
        output = credit_model(input_tensor)
        prob = torch.sigmoid(output).item() if output.shape[-1] == 1 else torch.softmax(output, dim=-1)[0, 1].item()
    
    top_factors, _ = compute_gradient_attribution(credit_model, input_tensor.clone(), CREDIT_FEATURES, req.top_k)
    
    decision = "APPROVED" if prob > 0.5 else "DECLINED"
    confidence = prob if prob > 0.5 else 1 - prob
    
    top_3 = top_factors[:3]
    explanation_parts = []
    for f in top_3:
        feat_name = f["feature"].replace("_", " ").title()
        if f["impact"] == "decreases_risk":
            explanation_parts.append(f"{feat_name} supports approval")
        else:
            explanation_parts.append(f"{feat_name} is a concern")
    
    explanation = f"Credit application {decision.lower()} with {confidence*100:.1f}% confidence. " + "; ".join(explanation_parts) + "."
    
    cbn_text = (
        f"CBN Credit Decision Explanation (as required by CBN Consumer Protection Framework): "
        f"Your application was {decision.lower()}. "
        f"Key factors: {', '.join([f['feature'].replace('_', ' ') for f in top_3])}. "
        f"Credit score used: {req.features.get('credit_score_normalized', 'N/A')}. "
        f"You have the right to request a full credit report from NIBSS."
    )
    
    return ExplanationResponse(
        prediction=round(prob, 4),
        decision=decision,
        confidence=round(confidence, 4),
        top_factors=top_factors,
        explanation_text=explanation,
        cbn_explanation=cbn_text,
        model_version="credit_v1",
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003, log_level="info")
