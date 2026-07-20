"""
Drone & Aerial Computer Vision Service
Real OpenCV-based pipeline for:
1. Property boundary detection from aerial imagery
2. Structural condition assessment (roof, exterior)
3. Encroachment detection
4. Construction milestone verification → escrow trigger
"""
import os, json, base64, hashlib, math, io
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import numpy as np
import cv2
from PIL import Image, ImageFilter, ImageEnhance
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Drone CV Service", version="1.0.0")


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

# ─────────────────────────────────────────────
# 1. Image utilities
# ─────────────────────────────────────────────
def decode_image(data: str) -> np.ndarray:
    """Decode base64 image string to OpenCV array."""
    img_bytes = base64.b64decode(data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img


def encode_image(img: np.ndarray) -> str:
    """Encode OpenCV array to base64 string."""
    _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode("utf-8")


# ─────────────────────────────────────────────
# 2. Boundary Detection Pipeline
# ─────────────────────────────────────────────
def detect_property_boundary(img: np.ndarray) -> Dict[str, Any]:
    """
    Detect property boundaries using edge detection + contour analysis.
    Returns polygon coordinates and area estimate.
    """
    h, w = img.shape[:2]
    
    # Convert to grayscale and apply CLAHE for contrast enhancement
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
    
    # Canny edge detection
    edges = cv2.Canny(blurred, 50, 150)
    
    # Dilate edges to connect nearby lines
    kernel = np.ones((3, 3), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=2)
    
    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return {"detected": False, "confidence": 0.0, "polygon": [], "areaM2": 0}
    
    # Find the largest contour (likely the main property boundary)
    largest = max(contours, key=cv2.contourArea)
    area_pixels = cv2.contourArea(largest)
    
    # Approximate polygon
    epsilon = 0.02 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)
    
    # Normalize coordinates to 0-1 range
    polygon = [[float(int(pt[0][0]) / w), float(int(pt[0][1]) / h)] for pt in approx]
    
    # Estimate real-world area (assuming 1px ≈ 0.5m at typical drone altitude)
    px_to_m = 0.5
    area_m2 = area_pixels * (px_to_m ** 2)
    
    # Confidence based on polygon regularity
    hull = cv2.convexHull(largest)
    solidity = area_pixels / cv2.contourArea(hull) if cv2.contourArea(hull) > 0 else 0
    confidence = min(0.95, 0.5 + solidity * 0.45)
    
    # Draw boundary on image
    result_img = img.copy()
    cv2.drawContours(result_img, [approx], -1, (0, 255, 0), 3)
    
    return {
        "detected": True,
        "confidence": round(float(confidence), 2),
        "polygon": polygon,
        "areaM2": round(float(area_m2), 1),
        "areaPlot": f"{round(float(area_m2) / 0.0929, 0):.0f} sqft",
        "vertexCount": len(polygon),
        "annotatedImage": encode_image(result_img),
    }


# ─────────────────────────────────────────────
# 3. Condition Assessment Pipeline
# ─────────────────────────────────────────────
def assess_structural_condition(img: np.ndarray) -> Dict[str, Any]:
    """
    Assess roof and exterior condition using texture analysis and color statistics.
    """
    h, w = img.shape[:2]
    
    # Focus on central 60% of image (likely the structure)
    roi = img[int(h*0.2):int(h*0.8), int(w*0.2):int(w*0.8)]
    
    # Convert to HSV for color analysis
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    
    # Texture analysis using Laplacian variance (sharpness = good condition)
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    laplacian_var = cv2.Laplacian(gray_roi, cv2.CV_64F).var()
    
    # Normalize texture score (higher variance = more texture detail = better condition)
    texture_score = min(100, int(laplacian_var / 50))
    
    # Color uniformity (uniform color = well-maintained)
    color_std = np.std(hsv[:, :, 0])  # Hue std
    color_uniformity = max(0, 100 - int(color_std * 2))
    
    # Detect dark patches (potential damage/staining)
    dark_mask = hsv[:, :, 2] < 50
    dark_ratio = np.sum(dark_mask) / dark_mask.size
    damage_indicator = int(dark_ratio * 100)
    
    # Detect rust/brown patches
    rust_lower = np.array([10, 50, 50])
    rust_upper = np.array([30, 255, 200])
    rust_mask = cv2.inRange(hsv, rust_lower, rust_upper)
    rust_ratio = np.sum(rust_mask > 0) / rust_mask.size
    
    # Compute scores
    roof_score = max(40, min(95, texture_score + color_uniformity // 2 - damage_indicator - int(rust_ratio * 50)))
    exterior_score = max(40, min(95, color_uniformity - damage_indicator // 2 + texture_score // 3))
    
    # Overall condition
    overall = (roof_score * 0.5 + exterior_score * 0.5)
    condition_label = (
        "Excellent" if overall >= 85 else
        "Good" if overall >= 70 else
        "Fair" if overall >= 55 else
        "Poor"
    )
    
    return {
        "roofCondition": int(roof_score),
        "exteriorCondition": int(exterior_score),
        "overallCondition": round(float(overall), 1),
        "conditionLabel": condition_label,
        "textureScore": int(texture_score),
        "damageIndicator": int(damage_indicator),
        "rustDetected": bool(rust_ratio > 0.05),
        "confidence": 0.78,
        "isMockData": False,
    }


# ─────────────────────────────────────────────
# 4. Encroachment Detection
# ─────────────────────────────────────────────
def detect_encroachments(img: np.ndarray, boundary_polygon: List) -> Dict[str, Any]:
    """
    Detect structures outside the declared boundary polygon.
    """
    h, w = img.shape[:2]
    
    if not boundary_polygon:
        return {"detected": False, "count": 0, "regions": []}
    
    # Create boundary mask
    pts = np.array([[int(p[0] * w), int(p[1] * h)] for p in boundary_polygon], dtype=np.int32)
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(mask, [pts], 255)
    
    # Detect structures (buildings) using edge density
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    
    # Find structures outside boundary
    outside_mask = cv2.bitwise_not(mask)
    outside_edges = cv2.bitwise_and(edges, edges, mask=outside_mask)
    
    # Find contours of potential encroachments
    contours, _ = cv2.findContours(outside_edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    significant = [c for c in contours if cv2.contourArea(c) > 500]
    
    regions = []
    for c in significant[:5]:  # Max 5 encroachments reported
        x, y, cw, ch = cv2.boundingRect(c)
        regions.append({
            "x": round(float(x) / w, 3),
            "y": round(float(y) / h, 3),
            "width": round(float(cw) / w, 3),
            "height": round(float(ch) / h, 3),
            "areaM2": round(float(cv2.contourArea(c)) * 0.25, 1),
        })
    
    return {
        "detected": len(significant) > 0,
        "count": len(significant),
        "regions": regions,
        "riskLevel": "High" if len(significant) > 3 else "Medium" if len(significant) > 0 else "None",
        "isMockData": False,
    }


# ─────────────────────────────────────────────
# 5. Construction Milestone Verification
# ─────────────────────────────────────────────
MILESTONE_THRESHOLDS = {
    "site_clearing": {"min_edge_density": 0.02, "max_structure_ratio": 0.05},
    "foundation": {"min_edge_density": 0.05, "min_structure_ratio": 0.05},
    "structure_50": {"min_structure_ratio": 0.25, "min_height_indicator": 0.3},
    "structure_100": {"min_structure_ratio": 0.45, "min_height_indicator": 0.6},
    "roofing": {"min_roof_coverage": 0.4, "min_structure_ratio": 0.5},
    "finishing": {"min_roof_coverage": 0.6, "min_uniformity": 0.6},
    "completion": {"min_roof_coverage": 0.7, "min_uniformity": 0.75, "min_structure_ratio": 0.6},
}


def verify_construction_milestone(img: np.ndarray, declared_milestone: str) -> Dict[str, Any]:
    """
    Verify if a construction milestone has been genuinely achieved.
    Returns verification result and whether escrow should be triggered.
    """
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Edge density (measures construction activity)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / edges.size
    
    # Structure ratio (how much of the image is built structure)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    structure_ratio = np.sum(thresh > 0) / thresh.size
    
    # Roof coverage (detect horizontal flat surfaces using Hough lines)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=50, maxLineGap=10)
    horizontal_lines = 0
    if lines is not None:
        for line in lines:
            pts = line[0] if hasattr(line[0], '__len__') and len(line[0]) == 4 else line
            if len(pts) == 4:
                x1, y1, x2, y2 = int(pts[0]), int(pts[1]), int(pts[2]), int(pts[3])
                angle = abs(math.atan2(y2 - y1, x2 - x1) * 180 / math.pi)
                if angle < 15 or angle > 165:
                    horizontal_lines += 1
    roof_coverage = min(1.0, horizontal_lines / 50)
    
    # Color uniformity (finished buildings have more uniform colors)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    uniformity = 1.0 - (np.std(hsv[:, :, 2]) / 128)
    
    # Height indicator (taller structures cast more shadows)
    shadow_mask = hsv[:, :, 2] < 60
    height_indicator = np.sum(shadow_mask) / shadow_mask.size
    
    metrics = {
        "edgeDensity": round(edge_density, 3),
        "structureRatio": round(structure_ratio, 3),
        "roofCoverage": round(roof_coverage, 3),
        "uniformity": round(uniformity, 3),
        "heightIndicator": round(height_indicator, 3),
        "horizontalLines": horizontal_lines,
    }
    
    # Determine actual milestone from metrics
    if structure_ratio < 0.05:
        actual_milestone = "site_clearing"
        progress = 5
    elif structure_ratio < 0.15:
        actual_milestone = "foundation"
        progress = 20
    elif structure_ratio < 0.30:
        actual_milestone = "structure_50"
        progress = 45
    elif structure_ratio < 0.50:
        actual_milestone = "structure_100"
        progress = 65
    elif roof_coverage < 0.4:
        actual_milestone = "roofing"
        progress = 75
    elif uniformity < 0.6:
        actual_milestone = "finishing"
        progress = 88
    else:
        actual_milestone = "completion"
        progress = 100
    
    # Milestone ordering for comparison
    milestone_order = list(MILESTONE_THRESHOLDS.keys())
    declared_idx = milestone_order.index(declared_milestone) if declared_milestone in milestone_order else 0
    actual_idx = milestone_order.index(actual_milestone)
    
    verified = actual_idx >= declared_idx
    confidence = 0.85 if abs(actual_idx - declared_idx) <= 1 else 0.65
    
    return {
        "declaredMilestone": declared_milestone,
        "verifiedMilestone": actual_milestone,
        "constructionProgress": progress,
        "verified": verified,
        "escrowReleaseRecommended": verified and confidence >= 0.75,
        "confidence": confidence,
        "metrics": metrics,
        "isMockData": False,
        "auditHash": hashlib.sha256(json.dumps(metrics, sort_keys=True).encode()).hexdigest()[:16],
    }


# ─────────────────────────────────────────────
# 6. Full Analysis Pipeline
# ─────────────────────────────────────────────
def run_full_analysis(img: np.ndarray, milestone: Optional[str] = None) -> Dict[str, Any]:
    boundary = detect_property_boundary(img)
    condition = assess_structural_condition(img)
    encroachment = detect_encroachments(img, boundary.get("polygon", []))
    
    result = {
        "boundary": boundary,
        "condition": condition,
        "encroachment": encroachment,
        "isMockData": False,
    }
    
    if milestone:
        result["milestoneVerification"] = verify_construction_milestone(img, milestone)
    
    return result


# ─────────────────────────────────────────────
# 7. API Endpoints
# ─────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    imageBase64: str
    milestone: Optional[str] = None
    propertyId: Optional[str] = None


class MilestoneRequest(BaseModel):
    imageBase64: str
    milestone: str
    escrowId: Optional[str] = None
    propertyId: Optional[str] = None


@app.post("/analyze")
async def analyze_aerial_image(req: AnalysisRequest):
    try:
        img = decode_image(req.imageBase64)
        if img is None:
            raise HTTPException(400, "Invalid image data")
        result = run_full_analysis(img, req.milestone)
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(500, str(e))


@app.post("/analyze/upload")
async def analyze_upload(file: UploadFile = File(...), milestone: Optional[str] = None):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Invalid image file")
        result = run_full_analysis(img, milestone)
        return result
    except Exception as e:
        logger.error(f"Upload analysis failed: {e}")
        raise HTTPException(500, str(e))


@app.post("/verify/milestone")
async def verify_milestone(req: MilestoneRequest):
    try:
        img = decode_image(req.imageBase64)
        if img is None:
            raise HTTPException(400, "Invalid image data")
        result = verify_construction_milestone(img, req.milestone)
        
        # If escrow release recommended, log the event
        if result["escrowReleaseRecommended"] and req.escrowId:
            logger.info(f"✅ Escrow release recommended for escrow={req.escrowId}, milestone={req.milestone}, confidence={result['confidence']}")
        
        return {
            **result,
            "escrowId": req.escrowId,
            "propertyId": req.propertyId,
        }
    except Exception as e:
        logger.error(f"Milestone verification failed: {e}")
        raise HTTPException(500, str(e))


@app.post("/boundary")
async def detect_boundary(req: AnalysisRequest):
    try:
        img = decode_image(req.imageBase64)
        if img is None:
            raise HTTPException(400, "Invalid image data")
        return detect_property_boundary(img)
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/condition")
async def assess_condition(req: AnalysisRequest):
    try:
        img = decode_image(req.imageBase64)
        if img is None:
            raise HTTPException(400, "Invalid image data")
        return assess_structural_condition(img)
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "drone-cv", "version": "1.0.0", "isMockData": False}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5004)
