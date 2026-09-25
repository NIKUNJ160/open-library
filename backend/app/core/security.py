import time
import logging
from collections import defaultdict
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.config import settings

logger = logging.getLogger(__name__)

class RateLimiter:
    """
    Sliding-window IP rate limiter.
    Maintains timestamps of requests within rolling 60-second windows.
    """
    def __init__(self, limit_per_minute: int = 60):
        self.limit = limit_per_minute
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def check(self, client_ip: str) -> tuple[bool, int, int]:
        """
        Returns: (is_allowed, remaining_requests, retry_after_seconds)
        """
        now = time.time()
        window_start = now - 60.0

        # Purge timestamps outside current 60s window
        valid_timestamps = [t for t in self.requests[client_ip] if t > window_start]
        self.requests[client_ip] = valid_timestamps

        if len(valid_timestamps) >= self.limit:
            oldest = valid_timestamps[0]
            retry_after = max(1, int(oldest + 60.0 - now))
            return False, 0, retry_after

        self.requests[client_ip].append(now)
        remaining = self.limit - len(self.requests[client_ip])
        return True, remaining, 0

    def reset(self):
        """Clears all tracking state (used in testing)."""
        self.requests.clear()

rate_limiter = RateLimiter(limit_per_minute=settings.RATE_LIMIT_PER_MINUTE)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware enforcing sliding-window rate limits per client IP.
    Exempts health and documentation endpoints.
    """
    EXEMPT_PATHS = {"/health", "/api/v1/health", "/docs", "/redoc", "/openapi.json", "/"}

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED or request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Extract client IP supporting X-Forwarded-For reverse proxy
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"

        allowed, remaining, retry_after = rate_limiter.check(client_ip)

        if not allowed:
            logger.warning(f"Rate limit exceeded for IP {client_ip} on path {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "detail": f"Rate limit of {settings.RATE_LIMIT_PER_MINUTE} requests per minute exceeded.",
                    "retry_after": retry_after
                },
                headers={
                    "X-RateLimit-Limit": str(settings.RATE_LIMIT_PER_MINUTE),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(retry_after)
                }
            )

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_PER_MINUTE)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects OWASP-compliant security headers into all HTTP responses.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response
