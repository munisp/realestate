from fastapi import APIRouter, HTTPException, status
from typing import List
import logging

from app.models.property import ValuationRequest, ValuationResult
from app.services.valuation_service import ValuationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/valuations", tags=["valuations"])

# Initialize service
valuation_service = ValuationService()


@router.post("", response_model=ValuationResult, status_code=status.HTTP_200_OK)
async def valuate_property(request: ValuationRequest):
    """
    Valuate a single property
    
    Performs ML-based valuation combined with comparative market analysis
    """
    try:
        result = await valuation_service.valuate_property(request)
        return result
    except Exception as e:
        logger.error(f"Valuation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Valuation failed: {str(e)}"
        )


@router.post("/batch", response_model=List[ValuationResult], status_code=status.HTTP_200_OK)
async def valuate_properties_batch(requests: List[ValuationRequest]):
    """
    Valuate multiple properties in batch
    
    Uses distributed processing for improved performance
    """
    try:
        if len(requests) > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 100 properties per batch request"
            )
        
        results = await valuation_service.batch_valuate(requests)
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch valuation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch valuation failed: {str(e)}"
        )


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "valuation-service",
        "version": "1.0.0"
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check():
    """Readiness check endpoint"""
    # Check if model is loaded
    if valuation_service.predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded"
        )
    
    return {
        "status": "ready",
        "model_version": valuation_service.predictor.model.__class__.__name__
    }
