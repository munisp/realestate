import pytest
import asyncio
from pathlib import Path
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

class TestOCRAccuracy:
    """Test OCR accuracy with sample documents"""
    
    def test_nigerian_passport_ocr(self):
        """Test OCR on Nigerian passport"""
        with open("tests/data/sample-passport-ng.jpg", "rb") as f:
            response = client.post(
                "/api/ocr/extract",
                files={"image": f},
                data={"document_type": "passport"}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify extracted fields
        assert "passport_number" in data
        assert "full_name" in data
        assert "date_of_birth" in data
        assert "nationality" in data
        assert data["nationality"] == "NIGERIA"
        
        # Check confidence scores
        assert data["confidence"] > 0.85
        
    def test_nin_card_ocr(self):
        """Test OCR on NIN card"""
        with open("tests/data/sample-nin.jpg", "rb") as f:
            response = client.post(
                "/api/ocr/extract",
                files={"image": f},
                data={"document_type": "national_id"}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "nin" in data
        assert len(data["nin"]) == 11
        assert data["nin"].isdigit()
        assert "full_name" in data
        
    def test_international_passport_ocr(self):
        """Test OCR on international passport (UK, US, etc.)"""
        with open("tests/data/sample-passport-intl.jpg", "rb") as f:
            response = client.post(
                "/api/ocr/extract",
                files={"image": f},
                data={"document_type": "passport"}
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "passport_number" in data
        assert "mrz" in data  # Machine Readable Zone
        assert len(data["mrz"]) > 0

class TestFaceMatching:
    """Test face matching accuracy"""
    
    def test_face_match_success(self):
        """Test successful face match between document and selfie"""
        with open("tests/data/sample-passport-ng.jpg", "rb") as doc, \
             open("tests/data/sample-selfie-match.jpg", "rb") as selfie:
            response = client.post(
                "/api/verification/face-match",
                files={
                    "document_image": doc,
                    "selfie_image": selfie
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["match"] is True
        assert data["confidence"] > 0.75
        assert data["distance"] < 0.6
        
    def test_face_match_failure(self):
        """Test face match failure with different persons"""
        with open("tests/data/sample-passport-ng.jpg", "rb") as doc, \
             open("tests/data/sample-selfie-nomatch.jpg", "rb") as selfie:
            response = client.post(
                "/api/verification/face-match",
                files={
                    "document_image": doc,
                    "selfie_image": selfie
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["match"] is False
        assert data["distance"] > 0.6

class TestVerificationTiers:
    """Test verification tier routing"""
    
    def test_full_verification_resident(self):
        """Test full verification for Nigerian resident"""
        response = client.post(
            "/api/verification/check-eligibility",
            json={
                "user_id": "test-user-1",
                "booking_amount": 500000,  # ₦500k
                "property_value": 2000000,
                "is_resident": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["required_tier"] == "full"
        assert data["booking_allowed"] is False  # Requires NIN+BVN
        
    def test_international_verification_diaspora(self):
        """Test international verification for diaspora"""
        response = client.post(
            "/api/verification/check-eligibility",
            json={
                "user_id": "test-user-2",
                "booking_amount": 300000,  # ₦300k
                "property_value": 1000000,
                "is_resident": False
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["required_tier"] == "international"
        assert "passport" in data["upgrade_path"]["steps"][0].lower()
        
    def test_social_verification_low_risk(self):
        """Test social verification for low-risk booking"""
        response = client.post(
            "/api/verification/check-eligibility",
            json={
                "user_id": "test-user-3",
                "booking_amount": 30000,  # ₦30k
                "property_value": 100000,
                "is_resident": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["required_tier"] in ["social", "basic"]

class TestBookingLimits:
    """Test booking limit enforcement"""
    
    def test_booking_limit_enforcement(self):
        """Test that booking limits are enforced correctly"""
        # Create basic tier user
        client.post("/api/verification/oauth", json={
            "user_id": "test-user-4",
            "provider": "google",
            "token": "mock-token"
        })
        
        # Try to book above limit (₦100k for basic tier)
        response = client.post(
            "/api/verification/check-eligibility",
            json={
                "user_id": "test-user-4",
                "booking_amount": 150000,  # Above ₦100k limit
                "property_value": 500000,
                "is_resident": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["booking_allowed"] is False
        assert "upgrade" in data["message"].lower()

class TestBatchProcessing:
    """Test batch OCR processing"""
    
    def test_batch_ocr_performance(self):
        """Test batch processing of multiple documents"""
        files = []
        for i in range(5):
            files.append(
                ("images", open(f"tests/data/sample-passport-{i}.jpg", "rb"))
            )
        
        response = client.post("/api/ocr/batch", files=files)
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["results"]) == 5
        assert data["processing_time"] < 5.0  # Should process 5 docs in <5s on GPU

class TestOAuthIntegration:
    """Test OAuth verification"""
    
    def test_google_oauth_verification(self):
        """Test Google OAuth creates social tier"""
        response = client.post(
            "/api/verification/oauth",
            json={
                "user_id": "test-user-5",
                "provider": "google",
                "token": "mock-google-token"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "social"
        assert data["booking_limit"] == 50000
        
    def test_facebook_oauth_verification(self):
        """Test Facebook OAuth creates social tier"""
        response = client.post(
            "/api/verification/oauth",
            json={
                "user_id": "test-user-6",
                "provider": "facebook",
                "token": "mock-facebook-token"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tier"] == "social"

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
