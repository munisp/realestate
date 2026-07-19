import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api import valuation, hybrid_valuation

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events
    """
    # Startup
    logger.info("Starting Valuation Service")
    logger.info(f"Model path: {settings.model_path}")
    logger.info(f"Model version: {settings.model_version}")
    
    # Initialize Ray (if configured)
    try:
        import ray
        if settings.ray_address:
            ray.init(address=settings.ray_address, namespace=settings.ray_namespace)
            logger.info(f"Connected to Ray cluster: {settings.ray_address}")
    except Exception as e:
        logger.warning(f"Ray initialization failed (optional): {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Valuation Service")
    try:
        import ray
        if ray.is_initialized():
            ray.shutdown()
            logger.info("Ray cluster disconnected")
    except Exception:
        pass


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ML-powered property valuation service with comparative market analysis",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(valuation.router)
app.include_router(hybrid_valuation.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
