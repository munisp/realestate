import httpx
from typing import Optional, Dict, Any
from datetime import datetime
import jwt
import os

from database.repository import VerificationRepository
from database.models import VerificationTierEnum, VerificationStatusEnum

class OAuthService:
    def __init__(self):
        self.repository = VerificationRepository()
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.facebook_app_id = os.getenv("FACEBOOK_APP_ID")
        self.facebook_app_secret = os.getenv("FACEBOOK_APP_SECRET")
        
    async def verify_google_token(
        self,
        token: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Verify Google OAuth token and create verification"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://oauth2.googleapis.com/tokeninfo",
                    params={"id_token": token}
                )
                
                if response.status_code != 200:
                    return {
                        "success": False,
                        "message": "Invalid Google token"
                    }
                
                user_info = response.json()
                
                # Create social verification
                verification = self.repository.create_or_update_verification(
                    user_id=user_id,
                    tier=VerificationTierEnum.SOCIAL,
                    google_id=user_info.get("sub"),
                    social_verified=True,
                    booking_limit=50000,
                    status=VerificationStatusEnum.VERIFIED,
                    ocr_data={
                        "email": user_info.get("email"),
                        "name": user_info.get("name"),
                        "picture": user_info.get("picture")
                    }
                )
                
                self.repository.log_attempt(
                    user_id=user_id,
                    verification_type="google",
                    status=VerificationStatusEnum.VERIFIED,
                    metadata=user_info
                )
                
                return {
                    "success": True,
                    "tier": "social",
                    "booking_limit": 50000,
                    "user_info": user_info
                }
                
        except Exception as e:
            self.repository.log_attempt(
                user_id=user_id,
                verification_type="google",
                status=VerificationStatusEnum.FAILED,
                error_message=str(e)
            )
            return {
                "success": False,
                "message": f"Google verification failed: {str(e)}"
            }
    
    async def verify_facebook_token(
        self,
        token: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Verify Facebook OAuth token and create verification"""
        try:
            async with httpx.AsyncClient() as client:
                # Verify token
                verify_response = await client.get(
                    "https://graph.facebook.com/debug_token",
                    params={
                        "input_token": token,
                        "access_token": f"{self.facebook_app_id}|{self.facebook_app_secret}"
                    }
                )
                
                if verify_response.status_code != 200:
                    return {
                        "success": False,
                        "message": "Invalid Facebook token"
                    }
                
                # Get user info
                user_response = await client.get(
                    "https://graph.facebook.com/me",
                    params={
                        "fields": "id,name,email,picture",
                        "access_token": token
                    }
                )
                
                if user_response.status_code != 200:
                    return {
                        "success": False,
                        "message": "Failed to get Facebook user info"
                    }
                
                user_info = user_response.json()
                
                # Create social verification
                verification = self.repository.create_or_update_verification(
                    user_id=user_id,
                    tier=VerificationTierEnum.SOCIAL,
                    facebook_id=user_info.get("id"),
                    social_verified=True,
                    booking_limit=50000,
                    status=VerificationStatusEnum.VERIFIED,
                    ocr_data={
                        "email": user_info.get("email"),
                        "name": user_info.get("name"),
                        "picture": user_info.get("picture", {}).get("data", {}).get("url")
                    }
                )
                
                self.repository.log_attempt(
                    user_id=user_id,
                    verification_type="facebook",
                    status=VerificationStatusEnum.VERIFIED,
                    metadata=user_info
                )
                
                return {
                    "success": True,
                    "tier": "social",
                    "booking_limit": 50000,
                    "user_info": user_info
                }
                
        except Exception as e:
            self.repository.log_attempt(
                user_id=user_id,
                verification_type="facebook",
                status=VerificationStatusEnum.FAILED,
                error_message=str(e)
            )
            return {
                "success": False,
                "message": f"Facebook verification failed: {str(e)}"
            }
