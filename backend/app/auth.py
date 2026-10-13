import base64
import functools
import logging
import jwt
from jwt import PyJWKClient
from fastapi import Header, Cookie, Query, HTTPException, status
from app.config import settings

logger = logging.getLogger("plantcare.auth")

@functools.lru_cache(maxsize=1)
def get_jwk_client_for_key(publishable_key: str) -> PyJWKClient:
    """
    Derives the JWKS URL from settings.CLERK_PUBLISHABLE_KEY:
    take the part after the second underscore of 'pk_test_...' or 'pk_live_...',
    base64-decode it (add padding), strip the trailing '$', which gives the domain;
    the URL is https://<domain>/.well-known/jwks.json.
    """
    if not publishable_key:
        raise ValueError("CLERK_PUBLISHABLE_KEY is not configured.")
    parts = publishable_key.split("_", 2)
    if len(parts) < 3:
        raise ValueError("Invalid CLERK_PUBLISHABLE_KEY format.")
    raw_b64 = parts[2]
    padded = raw_b64 + "=" * (-len(raw_b64) % 4)
    domain = base64.b64decode(padded).decode("utf-8").rstrip("$")
    jwks_url = f"https://{domain}/.well-known/jwks.json"
    return PyJWKClient(jwks_url)

def verify_clerk_jwt(token: str) -> str:
    """Verifies Clerk JWT token signature against JWKS and returns the user subject ID."""
    try:
        jwk_client = get_jwk_client_for_key(settings.CLERK_PUBLISHABLE_KEY)
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_signature": True},
            leeway=60
        )
        user_id = payload.get("sub")
        if user_id and str(user_id).strip():
            return str(user_id).strip()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims. Please sign in again."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Clerk JWT signature verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please sign in again."
        )

async def get_current_user_id(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    session_cookie: str | None = Cookie(default=None, alias="__session"),
    token_param: str | None = Query(default=None, alias="token")
) -> str:
    """
    Validates user authentication:
    - If Authorization Bearer, __session cookie, or token query param is provided,
      verifies token signature (RS256) against Clerk's JWKS.
    - If in non-production environment (ENVIRONMENT != "production") and
      ALLOW_DEV_USER_HEADER is explicitly enabled, allows X-User-Id.
    - In production, dev header bypass is strictly disabled and verified Clerk authentication is required.
    - Otherwise raises HTTP 401 "Please sign in."
    """
    token = None
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    elif session_cookie:
        token = session_cookie
    elif token_param:
        token = token_param

    if token:
        return verify_clerk_jwt(token)

    # In production, dev user bypass is strictly prohibited
    is_production = settings.ENVIRONMENT.lower() == "production"
    if is_production:
        if x_user_id:
            logger.warning("Rejected unverified X-User-Id header attempt in production mode.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in with verified Clerk authentication."
        )

    # In development mode only, accept X-User-Id if explicitly enabled
    if settings.ALLOW_DEV_USER_HEADER and x_user_id and x_user_id.strip():
        return x_user_id.strip()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in."
    )

async def get_optional_user_id(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    session_cookie: str | None = Cookie(default=None, alias="__session"),
    token_param: str | None = Query(default=None, alias="token")
) -> str | None:
    """Returns verified user_id if valid credentials are provided, or None without raising 401."""
    try:
        return await get_current_user_id(
            authorization=authorization,
            x_user_id=x_user_id,
            session_cookie=session_cookie,
            token_param=token_param
        )
    except HTTPException:
        return None
