from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import numpy as np
from datetime import datetime
import uvicorn

app = FastAPI(title="ML Property Valuation Service")

class PropertyFeatures(BaseModel):
    bedrooms: int
    bathrooms: int
    square_feet: float
    location: str
    property_type: str
    year_built: Optional[int] = None
    amenities: Optional[List[str]] = []
    
class ValuationResponse(BaseModel):
    estimated_price: float
    confidence: float
    price_range: dict
    comparable_properties: List[dict]
    factors: dict

class PropertyValuationModel:
    """Simple ML model for property valuation"""
    
    def __init__(self):
        # Base prices per location (NGN per sqft)
        self.location_multipliers = {
            "lekki": 250000,
            "victoria_island": 300000,
            "ikoyi": 350000,
            "banana_island": 500000,
            "yaba": 150000,
            "surulere": 120000,
            "ikeja": 180000,
            "ajah": 100000,
        }
        
        self.property_type_multipliers = {
            "apartment": 1.0,
            "detached": 1.3,
            "semi_detached": 1.15,
            "terrace": 1.05,
            "penthouse": 1.5,
        }
        
    def predict(self, features: PropertyFeatures) -> ValuationResponse:
        # Get base price per sqft for location
        location_key = features.location.lower().replace(" ", "_")
        base_price_per_sqft = self.location_multipliers.get(location_key, 150000)
        
        # Apply property type multiplier
        property_multiplier = self.property_type_multipliers.get(
            features.property_type.lower(), 1.0
        )
        
        # Calculate base price
        base_price = features.square_feet * base_price_per_sqft * property_multiplier
        
        # Adjust for bedrooms/bathrooms
        bedroom_adjustment = 1 + (features.bedrooms - 3) * 0.1
        bathroom_adjustment = 1 + (features.bathrooms - 2) * 0.05
        
        # Age adjustment
        current_year = datetime.now().year
        if features.year_built:
            age = current_year - features.year_built
            age_adjustment = max(0.7, 1 - (age * 0.01))
        else:
            age_adjustment = 0.9
        
        # Amenities adjustment
        amenity_value = len(features.amenities or []) * 0.02
        amenity_adjustment = 1 + min(amenity_value, 0.15)
        
        # Final price calculation
        estimated_price = (
            base_price * 
            bedroom_adjustment * 
            bathroom_adjustment * 
            age_adjustment * 
            amenity_adjustment
        )
        
        # Calculate confidence (simplified)
        confidence = 0.75 + (min(len(features.amenities or []), 10) * 0.02)
        
        # Price range (±15%)
        price_range = {
            "min": estimated_price * 0.85,
            "max": estimated_price * 1.15,
        }
        
        # Mock comparable properties
        comparable_properties = [
            {
                "address": f"{features.location} Property 1",
                "price": estimated_price * 0.95,
                "bedrooms": features.bedrooms,
                "square_feet": features.square_feet * 0.98,
            },
            {
                "address": f"{features.location} Property 2",
                "price": estimated_price * 1.05,
                "bedrooms": features.bedrooms,
                "square_feet": features.square_feet * 1.02,
            },
        ]
        
        # Factors affecting price
        factors = {
            "location_impact": f"+{int((property_multiplier - 1) * 100)}%",
            "size_impact": f"{int(features.square_feet)} sqft",
            "age_impact": f"{int((age_adjustment - 1) * 100)}%",
            "amenities_impact": f"+{int((amenity_adjustment - 1) * 100)}%",
        }
        
        return ValuationResponse(
            estimated_price=round(estimated_price, 2),
            confidence=round(confidence, 2),
            price_range=price_range,
            comparable_properties=comparable_properties,
            factors=factors,
        )

model = PropertyValuationModel()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ml-valuation"}

@app.post("/api/v1/valuation/predict", response_model=ValuationResponse)
def predict_property_value(features: PropertyFeatures):
    """Predict property value based on features"""
    try:
        return model.predict(features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/valuation/batch")
def batch_predict(properties: List[PropertyFeatures]):
    """Batch prediction for multiple properties"""
    try:
        results = [model.predict(prop) for prop in properties]
        return {"predictions": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
