"""
Python Temporal Activity Worker
Handles ML, analytics, fraud detection, OCR, and image processing activities
"""

import asyncio
import logging
from datetime import timedelta
from typing import Dict, List, Any, Optional
import os

from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.worker import Worker

# Import activity implementations
from activities.ml_activities import (
    rank_properties_ml,
    run_ml_valuation,
    calculate_optimal_price,
    rank_shortlet_properties,
    rank_builders_by_match,
)
from activities.fraud_activities import (
    detect_document_fraud,
    detect_listing_fraud,
    verify_identity_document,
)
from activities.ocr_activities import (
    run_ocr_extraction,
    validate_inspection_photos,
    extract_document_metadata,
)
from activities.image_activities import (
    optimize_property_image,
    generate_thumbnail,
    detect_image_quality,
)
from activities.analytics_activities import (
    analyze_demand,
    analyze_project_budget,
    analyze_project_timeline,
    calculate_project_progress,
)
from activities.data_activities import (
    enrich_geospatial_data,
    find_comparable_properties,
    get_event_based_pricing,
    scrape_competitor_pricing,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    """Main worker entry point"""
    
    # Get Temporal server address from environment
    temporal_host = os.getenv("TEMPORAL_HOST_PORT", "localhost:7233")
    temporal_namespace = os.getenv("TEMPORAL_NAMESPACE", "default")
    
    logger.info(f"Connecting to Temporal server at {temporal_host}")
    
    # Create Temporal client
    client = await Client.connect(temporal_host, namespace=temporal_namespace)
    
    # Define all activities
    activities = [
        # ML Activities
        rank_properties_ml,
        run_ml_valuation,
        calculate_optimal_price,
        rank_shortlet_properties,
        rank_builders_by_match,
        
        # Fraud Detection Activities
        detect_document_fraud,
        detect_listing_fraud,
        verify_identity_document,
        
        # OCR Activities
        run_ocr_extraction,
        validate_inspection_photos,
        extract_document_metadata,
        
        # Image Processing Activities
        optimize_property_image,
        generate_thumbnail,
        detect_image_quality,
        
        # Analytics Activities
        analyze_demand,
        analyze_project_budget,
        analyze_project_timeline,
        calculate_project_progress,
        
        # Data Activities
        enrich_geospatial_data,
        find_comparable_properties,
        get_event_based_pricing,
        scrape_competitor_pricing,
    ]
    
    # Create worker
    worker = Worker(
        client,
        task_queue="realestate-workflows",
        activities=activities,
        max_concurrent_activities=50,  # Handle up to 50 concurrent activities
    )
    
    logger.info("Starting Python Temporal worker...")
    logger.info(f"Registered {len(activities)} activities")
    
    # Run worker
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
