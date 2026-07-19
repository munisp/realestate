from fastapi import APIRouter, Query
from typing import Optional
from analytics import PropertyAnalytics, MarketAnalytics, UserAnalytics

router = APIRouter()

@router.get("/properties/{property_id}/views")
async def get_property_views(
    property_id: str,
    days: int = Query(30, ge=1, le=365)
):
    total_views, unique_users, avg_duration = PropertyAnalytics.get_property_views(property_id, days)
    return {
        "property_id": property_id,
        "total_views": total_views,
        "unique_users": unique_users,
        "avg_duration": avg_duration
    }

@router.get("/properties/top")
async def get_top_properties(
    limit: int = Query(10, ge=1, le=100),
    days: int = Query(7, ge=1, le=365)
):
    results = PropertyAnalytics.get_top_properties(limit, days)
    return [
        {
            "property_id": row[0],
            "view_count": row[1],
            "unique_users": row[2]
        }
        for row in results
    ]

@router.get("/market/trends")
async def get_market_trends(
    city: Optional[str] = None,
    days: int = Query(30, ge=1, le=365)
):
    results = MarketAnalytics.get_market_trends(city, days)
    return [
        {
            "date": str(row[0]),
            "avg_price": row[1],
            "total_listings": row[2],
            "total_views": row[3],
            "total_transactions": row[4]
        }
        for row in results
    ]

@router.get("/users/{user_id}/journey")
async def get_user_journey(
    user_id: str,
    days: int = Query(30, ge=1, le=365)
):
    results = UserAnalytics.get_user_journey(user_id, days)
    return [
        {
            "event_type": row[0],
            "timestamp": str(row[1]),
            "page_url": row[2],
            "properties": row[3]
        }
        for row in results
    ]

@router.get("/conversion/funnel")
async def get_conversion_funnel(days: int = Query(30, ge=1, le=365)):
    results = UserAnalytics.get_conversion_funnel(days)
    total = sum(row[1] for row in results) if results else 1
    
    return [
        {
            "stage": row[0],
            "count": row[1],
            "conversion_rate": (row[1] / total) * 100
        }
        for row in results
    ]
