from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(title="Fraud Detection Service")

class Transaction(BaseModel):
    user_id: str
    amount: float
    currency: str
    payment_method: str
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    location: Optional[str] = None
    
class FraudScore(BaseModel):
    risk_score: float  # 0-100
    risk_level: str  # low, medium, high, critical
    flags: List[str]
    recommendation: str
    details: Dict

class FraudDetectionService:
    """Fraud detection and risk scoring service"""
    
    def __init__(self):
        self.suspicious_ips = set()
        self.transaction_history = {}
        self.max_amount_threshold = 10000000  # ₦10M
        self.velocity_threshold = 5  # max transactions per hour
        
    def analyze_transaction(self, transaction: Transaction) -> FraudScore:
        """Analyze transaction for fraud indicators"""
        risk_score = 0.0
        flags = []
        
        # Check 1: Unusual amount
        if transaction.amount > self.max_amount_threshold:
            risk_score += 30
            flags.append("UNUSUAL_AMOUNT")
        
        # Check 2: High-risk payment method
        if transaction.payment_method.lower() in ["crypto", "wire_transfer"]:
            risk_score += 15
            flags.append("HIGH_RISK_PAYMENT_METHOD")
        
        # Check 3: Suspicious IP
        if transaction.ip_address in self.suspicious_ips:
            risk_score += 40
            flags.append("SUSPICIOUS_IP")
        
        # Check 4: Transaction velocity
        user_txns = self.transaction_history.get(transaction.user_id, [])
        recent_txns = [
            t for t in user_txns 
            if (datetime.now() - t["timestamp"]) < timedelta(hours=1)
        ]
        
        if len(recent_txns) >= self.velocity_threshold:
            risk_score += 25
            flags.append("HIGH_VELOCITY")
        
        # Check 5: First transaction with large amount
        if len(user_txns) == 0 and transaction.amount > 1000000:
            risk_score += 20
            flags.append("FIRST_LARGE_TRANSACTION")
        
        # Check 6: Unusual location
        if transaction.location and transaction.location.lower() not in [
            "nigeria", "lagos", "abuja", "port harcourt"
        ]:
            risk_score += 10
            flags.append("UNUSUAL_LOCATION")
        
        # Determine risk level
        if risk_score >= 75:
            risk_level = "critical"
            recommendation = "BLOCK_TRANSACTION"
        elif risk_score >= 50:
            risk_level = "high"
            recommendation = "MANUAL_REVIEW"
        elif risk_score >= 25:
            risk_level = "medium"
            recommendation = "ADDITIONAL_VERIFICATION"
        else:
            risk_level = "low"
            recommendation = "APPROVE"
        
        # Store transaction
        if transaction.user_id not in self.transaction_history:
            self.transaction_history[transaction.user_id] = []
        
        self.transaction_history[transaction.user_id].append({
            "amount": transaction.amount,
            "timestamp": datetime.now(),
            "risk_score": risk_score,
        })
        
        details = {
            "amount_check": transaction.amount <= self.max_amount_threshold,
            "velocity_check": len(recent_txns) < self.velocity_threshold,
            "ip_check": transaction.ip_address not in self.suspicious_ips,
            "total_user_transactions": len(user_txns) + 1,
        }
        
        return FraudScore(
            risk_score=round(risk_score, 2),
            risk_level=risk_level,
            flags=flags,
            recommendation=recommendation,
            details=details,
        )
    
    def analyze_user_behavior(self, user_id: str) -> Dict:
        """Analyze user's transaction behavior"""
        user_txns = self.transaction_history.get(user_id, [])
        
        if not user_txns:
            return {
                "total_transactions": 0,
                "average_amount": 0,
                "risk_profile": "new_user",
            }
        
        amounts = [t["amount"] for t in user_txns]
        risk_scores = [t["risk_score"] for t in user_txns]
        
        return {
            "total_transactions": len(user_txns),
            "average_amount": sum(amounts) / len(amounts),
            "max_amount": max(amounts),
            "average_risk_score": sum(risk_scores) / len(risk_scores),
            "high_risk_transactions": sum(1 for s in risk_scores if s >= 50),
            "risk_profile": "high_risk" if sum(risk_scores) / len(risk_scores) > 40 else "normal",
        }

fraud_service = FraudDetectionService()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "fraud-detection"}

@app.post("/api/v1/fraud/analyze", response_model=FraudScore)
def analyze_transaction(transaction: Transaction):
    """Analyze transaction for fraud"""
    try:
        return fraud_service.analyze_transaction(transaction)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/fraud/user/{user_id}")
def get_user_risk_profile(user_id: str):
    """Get user's risk profile"""
    try:
        return fraud_service.analyze_user_behavior(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/fraud/batch-analyze")
def batch_analyze(transactions: List[Transaction]):
    """Batch analyze multiple transactions"""
    try:
        results = [fraud_service.analyze_transaction(txn) for txn in transactions]
        return {"analyses": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002)
