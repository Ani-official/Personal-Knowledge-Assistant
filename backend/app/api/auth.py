import logging
from urllib.parse import urlencode

from authlib.integrations.base_client.errors import OAuthError
from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError, ErrorCode
from app.core.rate_limit import limiter
from app.core.security import (
    auth_time_of,
    burn_password_check,
    create_access_token,
    find_user_by_email,
    get_current_user_record,
    hash_password,
    token_expiry,
    validate_email,
    validate_new_password,
    verify_password,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import AuthRequest, AuthResponse

from authlib.integrations.starlette_client import OAuth

logger = logging.getLogger(__name__)

router = APIRouter()

# OAuth Setup
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def session_response(user: User, auth_time=None) -> AuthResponse:
    token = create_access_token({"sub": user.email, "uid": user.id}, auth_time=auth_time)
    return AuthResponse(
        access_token=token,
        expires_at=token_expiry(token).isoformat(),
        email=user.email,
    )


# ----------------------
# Signup (Email/Password)
# ----------------------
@router.post("/signup", status_code=201, response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup(request: Request, payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    email = validate_email(payload.email)
    validate_new_password(payload.password)

    taken = AppError(
        409,
        ErrorCode.AUTH_EMAIL_TAKEN,
        "An account with this email already exists. Sign in instead.",
    )
    if await find_user_by_email(db, email):
        raise taken

    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        # Lost a race with a concurrent signup for the same address.
        await db.rollback()
        raise taken
    await db.refresh(user)

    # Signing up signs you in, so the client never lands on the dashboard without a token.
    return session_response(user)


# ----------------------
# Login (Email/Password)
# ----------------------
@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    user = await find_user_by_email(db, payload.email)

    if user is None:
        burn_password_check(payload.password)
        raise AppError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, "Incorrect email or password.")

    if not user.hashed_password:
        burn_password_check(payload.password)
        raise AppError(
            401,
            ErrorCode.AUTH_USE_GOOGLE_SIGNIN,
            "This account uses Google sign-in. Continue with Google instead.",
        )

    if not verify_password(payload.password, user.hashed_password):
        raise AppError(401, ErrorCode.AUTH_INVALID_CREDENTIALS, "Incorrect email or password.")

    return session_response(user)


# ----------------------
# Refresh (sliding session)
# ----------------------
@router.post("/refresh", response_model=AuthResponse)
@limiter.limit("30/minute")
async def refresh(request: Request, user: User = Depends(get_current_user_record)):
    """Exchange a still-valid token for a fresh one, keeping the original sign-in time."""
    return session_response(user, auth_time=auth_time_of(request.state.token_payload))


# ----------------------
# Login with Google
# ----------------------
@router.get("/login/google")
async def login_google(request: Request):
    redirect_uri = request.url_for("auth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


def frontend_callback(**params: str) -> RedirectResponse:
    # Values travel in the URL fragment, which browsers never send to a server,
    # so the token stays out of access logs, proxies and Referer headers.
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/auth/google-callback#{urlencode(params)}")


# ----------------------
# Google OAuth Callback
# ----------------------
@router.get("/google/callback")
async def auth_google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    if request.query_params.get("error"):
        # The user declined consent (error=access_denied) or Google refused the request.
        code = (
            ErrorCode.AUTH_OAUTH_CANCELLED
            if request.query_params["error"] == "access_denied"
            else ErrorCode.AUTH_OAUTH_FAILED
        )
        return frontend_callback(error=code.value)

    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo") or await oauth.google.userinfo(token=token)
    except OAuthError as exc:
        logger.warning("Google OAuth failed: %s", exc)
        return frontend_callback(error=ErrorCode.AUTH_OAUTH_FAILED.value)

    email = user_info.get("email")
    if not email:
        return frontend_callback(error=ErrorCode.AUTH_OAUTH_EMAIL_MISSING.value)
    if user_info.get("email_verified") is False:
        return frontend_callback(error=ErrorCode.AUTH_OAUTH_EMAIL_UNVERIFIED.value)

    user = await find_user_by_email(db, email)
    if not user:
        user = User(email=email.strip().lower(), hashed_password=None)
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            user = await find_user_by_email(db, email)
            if user is None:
                return frontend_callback(error=ErrorCode.AUTH_OAUTH_FAILED.value)
        else:
            await db.refresh(user)

    session = session_response(user)
    return frontend_callback(token=session.access_token, auth_type="google")


# ----------------------
# Current User (for frontend)
# ----------------------
@router.get("/me")
async def get_me(user: User = Depends(get_current_user_record)):
    return {"email": user.email}


# ----------------------
# Logout
# ----------------------
@router.post("/logout", status_code=204)
async def logout():
    # Tokens are stateless, so the client discarding its copy is what ends the
    # session; this clears any cookie a browser may still hold.
    response = Response(status_code=204)
    response.delete_cookie("token")
    response.delete_cookie("auth_type")
    return response
