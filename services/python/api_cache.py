"""
Redis Caching Layer for External APIs
Provides caching, rate limiting, and circuit breaker patterns
"""

import os
import json
import time
import hashlib
from typing import Any, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps
from enum import Enum

from shared.logger import get_logger
logger = get_logger("api-cache")


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


class APICache:
    """
    Caching layer with Redis backend
    
    Features:
    - TTL-based caching
    - Rate limiting per API
    - Circuit breaker pattern
    - Usage tracking
    """
    
    def __init__(self):
        self.use_redis = os.getenv('USE_REDIS_CACHE', 'false').lower() == 'true'
        self.redis_client = None
        
        if self.use_redis:
            try:
                import redis
                redis_host = os.getenv('REDIS_HOST', 'localhost')
                redis_port = int(os.getenv('REDIS_PORT', 6379))
                redis_password = os.getenv('REDIS_PASSWORD')
                
                self.redis_client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    password=redis_password,
                    decode_responses=True,
                    socket_connect_timeout=5
                )
                
                # Test connection
                self.redis_client.ping()
                logger.info(f"Redis cache connected: {redis_host}:{redis_port}")
                
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}. Using in-memory cache.")
                self.use_redis = False
        
        # Fallback in-memory cache
        if not self.use_redis:
            self.memory_cache = {}
            self.cache_timestamps = {}
            logger.info("Using in-memory cache")
        
        # Rate limiting configuration
        self.rate_limits = {
            'earth_engine': {'requests': 1000, 'period': 86400},  # 1000/day
            'worldbank': {'requests': 10000, 'period': 86400},    # Unlimited, but cap at 10k
            'scraper': {'requests': 1000, 'period': 3600},        # 1000/hour
        }
        
        # Circuit breaker configuration
        self.circuit_breakers = {}
        self.failure_threshold = 5  # Open circuit after 5 failures
        self.recovery_timeout = 60  # Try recovery after 60 seconds
    
    def _generate_cache_key(self, api_name: str, endpoint: str, params: dict) -> str:
        """Generate unique cache key"""
        # Sort params for consistent keys
        param_str = json.dumps(params, sort_keys=True)
        param_hash = hashlib.md5(param_str.encode()).hexdigest()
        return f"api_cache:{api_name}:{endpoint}:{param_hash}"
    
    def get(self, api_name: str, endpoint: str, params: dict) -> Optional[Any]:
        """
        Get cached response
        
        Args:
            api_name: Name of the API (earth_engine, worldbank, scraper)
            endpoint: API endpoint
            params: Request parameters
        
        Returns:
            Cached response or None if not found/expired
        """
        cache_key = self._generate_cache_key(api_name, endpoint, params)
        
        try:
            if self.use_redis:
                cached = self.redis_client.get(cache_key)
                if cached:
                    logger.debug(f"Cache HIT: {cache_key}")
                    return json.loads(cached)
            else:
                # In-memory cache
                if cache_key in self.memory_cache:
                    timestamp = self.cache_timestamps.get(cache_key, 0)
                    if time.time() - timestamp < self._get_ttl(api_name):
                        logger.debug(f"Memory cache HIT: {cache_key}")
                        return self.memory_cache[cache_key]
                    else:
                        # Expired
                        del self.memory_cache[cache_key]
                        del self.cache_timestamps[cache_key]
            
            logger.debug(f"Cache MISS: {cache_key}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting cache: {e}")
            return None
    
    def set(
        self,
        api_name: str,
        endpoint: str,
        params: dict,
        response: Any,
        ttl: Optional[int] = None
    ):
        """
        Cache API response
        
        Args:
            api_name: Name of the API
            endpoint: API endpoint
            params: Request parameters
            response: Response to cache
            ttl: Time to live in seconds (optional, uses default if not provided)
        """
        cache_key = self._generate_cache_key(api_name, endpoint, params)
        
        if ttl is None:
            ttl = self._get_ttl(api_name)
        
        try:
            if self.use_redis:
                self.redis_client.setex(
                    cache_key,
                    ttl,
                    json.dumps(response)
                )
            else:
                # In-memory cache
                self.memory_cache[cache_key] = response
                self.cache_timestamps[cache_key] = time.time()
            
            logger.debug(f"Cached response: {cache_key} (TTL: {ttl}s)")
            
        except Exception as e:
            logger.error(f"Error setting cache: {e}")
    
    def _get_ttl(self, api_name: str) -> int:
        """Get TTL for API"""
        ttls = {
            'earth_engine': 2592000,  # 30 days (satellite imagery changes slowly)
            'worldbank': 604800,      # 7 days (economic indicators updated monthly)
            'scraper': 86400,         # 24 hours (market listings change daily)
        }
        return ttls.get(api_name, 3600)  # Default 1 hour
    
    def check_rate_limit(self, api_name: str, user_id: str = 'default') -> bool:
        """
        Check if rate limit allows request
        
        Args:
            api_name: Name of the API
            user_id: User identifier for per-user rate limiting
        
        Returns:
            True if request allowed, False if rate limited
        """
        if api_name not in self.rate_limits:
            return True  # No rate limit configured
        
        limit_config = self.rate_limits[api_name]
        max_requests = limit_config['requests']
        period = limit_config['period']
        
        rate_key = f"rate_limit:{api_name}:{user_id}"
        
        try:
            if self.use_redis:
                # Increment counter
                current = self.redis_client.incr(rate_key)
                
                # Set expiry on first request
                if current == 1:
                    self.redis_client.expire(rate_key, period)
                
                if current > max_requests:
                    logger.warning(f"Rate limit exceeded for {api_name}: {current}/{max_requests}")
                    return False
                
                return True
                
            else:
                # In-memory rate limiting (simplified)
                if rate_key not in self.memory_cache:
                    self.memory_cache[rate_key] = {'count': 0, 'reset_time': time.time() + period}
                
                rate_data = self.memory_cache[rate_key]
                
                # Reset if period expired
                if time.time() > rate_data['reset_time']:
                    rate_data['count'] = 0
                    rate_data['reset_time'] = time.time() + period
                
                rate_data['count'] += 1
                
                if rate_data['count'] > max_requests:
                    logger.warning(f"Rate limit exceeded for {api_name}: {rate_data['count']}/{max_requests}")
                    return False
                
                return True
                
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True  # Allow on error
    
    def get_circuit_state(self, api_name: str) -> CircuitState:
        """Get current circuit breaker state"""
        if api_name not in self.circuit_breakers:
            self.circuit_breakers[api_name] = {
                'state': CircuitState.CLOSED,
                'failure_count': 0,
                'last_failure_time': 0,
                'last_success_time': time.time()
            }
        
        breaker = self.circuit_breakers[api_name]
        
        # Check if we should transition from OPEN to HALF_OPEN
        if breaker['state'] == CircuitState.OPEN:
            if time.time() - breaker['last_failure_time'] > self.recovery_timeout:
                breaker['state'] = CircuitState.HALF_OPEN
                logger.info(f"Circuit breaker for {api_name} transitioning to HALF_OPEN")
        
        return breaker['state']
    
    def record_success(self, api_name: str):
        """Record successful API call"""
        if api_name not in self.circuit_breakers:
            return
        
        breaker = self.circuit_breakers[api_name]
        breaker['failure_count'] = 0
        breaker['last_success_time'] = time.time()
        
        if breaker['state'] != CircuitState.CLOSED:
            breaker['state'] = CircuitState.CLOSED
            logger.info(f"Circuit breaker for {api_name} CLOSED (recovered)")
    
    def record_failure(self, api_name: str):
        """Record failed API call"""
        if api_name not in self.circuit_breakers:
            self.circuit_breakers[api_name] = {
                'state': CircuitState.CLOSED,
                'failure_count': 0,
                'last_failure_time': 0,
                'last_success_time': time.time()
            }
        
        breaker = self.circuit_breakers[api_name]
        breaker['failure_count'] += 1
        breaker['last_failure_time'] = time.time()
        
        # Open circuit if threshold exceeded
        if breaker['failure_count'] >= self.failure_threshold:
            if breaker['state'] != CircuitState.OPEN:
                breaker['state'] = CircuitState.OPEN
                logger.error(f"Circuit breaker for {api_name} OPENED after {breaker['failure_count']} failures")
    
    def track_usage(self, api_name: str, cost: float = 0.0):
        """
        Track API usage for monitoring and billing
        
        Args:
            api_name: Name of the API
            cost: Cost of the API call (if applicable)
        """
        usage_key = f"api_usage:{api_name}:{datetime.now().strftime('%Y-%m-%d')}"
        
        try:
            if self.use_redis:
                # Increment request count
                self.redis_client.hincrby(usage_key, 'requests', 1)
                
                # Add cost
                if cost > 0:
                    self.redis_client.hincrbyfloat(usage_key, 'cost', cost)
                
                # Set expiry (keep for 90 days)
                self.redis_client.expire(usage_key, 7776000)
            else:
                # In-memory tracking (simplified)
                if usage_key not in self.memory_cache:
                    self.memory_cache[usage_key] = {'requests': 0, 'cost': 0.0}
                
                self.memory_cache[usage_key]['requests'] += 1
                self.memory_cache[usage_key]['cost'] += cost
                
        except Exception as e:
            logger.error(f"Error tracking usage: {e}")
    
    def get_usage_stats(self, api_name: str, date: Optional[str] = None) -> dict:
        """
        Get usage statistics for an API
        
        Args:
            api_name: Name of the API
            date: Date in YYYY-MM-DD format (default: today)
        
        Returns:
            Dict with usage statistics
        """
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        usage_key = f"api_usage:{api_name}:{date}"
        
        try:
            if self.use_redis:
                stats = self.redis_client.hgetall(usage_key)
                return {
                    'api_name': api_name,
                    'date': date,
                    'requests': int(stats.get('requests', 0)),
                    'cost': float(stats.get('cost', 0.0))
                }
            else:
                stats = self.memory_cache.get(usage_key, {'requests': 0, 'cost': 0.0})
                return {
                    'api_name': api_name,
                    'date': date,
                    'requests': stats['requests'],
                    'cost': stats['cost']
                }
                
        except Exception as e:
            logger.error(f"Error getting usage stats: {e}")
            return {'api_name': api_name, 'date': date, 'requests': 0, 'cost': 0.0}
    
    def clear_cache(self, api_name: Optional[str] = None):
        """Clear cache for specific API or all APIs"""
        try:
            if self.use_redis:
                if api_name:
                    pattern = f"api_cache:{api_name}:*"
                    keys = self.redis_client.keys(pattern)
                    if keys:
                        self.redis_client.delete(*keys)
                        logger.info(f"Cleared cache for {api_name}: {len(keys)} keys")
                else:
                    self.redis_client.flushdb()
                    logger.info("Cleared all cache")
            else:
                if api_name:
                    keys_to_delete = [k for k in self.memory_cache.keys() if k.startswith(f"api_cache:{api_name}:")]
                    for key in keys_to_delete:
                        del self.memory_cache[key]
                        if key in self.cache_timestamps:
                            del self.cache_timestamps[key]
                    logger.info(f"Cleared memory cache for {api_name}: {len(keys_to_delete)} keys")
                else:
                    self.memory_cache.clear()
                    self.cache_timestamps.clear()
                    logger.info("Cleared all memory cache")
                    
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")


# Decorator for automatic caching
def cached_api_call(api_name: str, endpoint: str):
    """
    Decorator to automatically cache API calls
    
    Usage:
        @cached_api_call('earth_engine', 'imagery')
        def get_imagery(latitude, longitude):
            # API call logic
            pass
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = APICache()
            
            # Generate cache key from function arguments
            params = {
                'args': args,
                'kwargs': kwargs
            }
            
            # Check circuit breaker
            circuit_state = cache.get_circuit_state(api_name)
            if circuit_state == CircuitState.OPEN:
                logger.error(f"Circuit breaker OPEN for {api_name}, rejecting request")
                raise Exception(f"API {api_name} is currently unavailable (circuit breaker open)")
            
            # Check rate limit
            if not cache.check_rate_limit(api_name):
                raise Exception(f"Rate limit exceeded for {api_name}")
            
            # Check cache
            cached_response = cache.get(api_name, endpoint, params)
            if cached_response is not None:
                return cached_response
            
            # Make API call
            try:
                response = func(*args, **kwargs)
                
                # Cache response
                cache.set(api_name, endpoint, params, response)
                
                # Record success
                cache.record_success(api_name)
                
                # Track usage
                cache.track_usage(api_name)
                
                return response
                
            except Exception as e:
                # Record failure
                cache.record_failure(api_name)
                raise
        
        return wrapper
    return decorator


# Global cache instance
_cache_instance = None

def get_cache() -> APICache:
    """Get global cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = APICache()
    return _cache_instance
