import base64
import functools
import logging
import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException, status
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

async def get_current_user_id(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None)
) -> str:
    """
    Validates user authentication:
    - If Authorization: Bearer <token> is present, verifies token signature (RS256)
      using PyJWT's PyJWKClient against Clerk's JWKS. Returns 'sub' claim.
    - If X-User-Id is provided and settings.ALLOW_DEV_USER_HEADER is True, returns it.
    - Otherwise raises HTTP 401 "Please sign in."
    """
    # 1. Verify Bearer token if present
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
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

    # 2. Accept X-User-Id only if ALLOW_DEV_USER_HEADER is enabled
    if settings.ALLOW_DEV_USER_HEADER and x_user_id and x_user_id.strip():
        return x_user_id.strip()

    # 3. Otherwise reject with HTTP 401
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in."
    )
