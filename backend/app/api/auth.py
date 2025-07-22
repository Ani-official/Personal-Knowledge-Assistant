from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi.responses import RedirectResponse
from app.db.session import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.user import AuthRequest
from app.core.config import settings

from authlib.integrations.starlette_client import OAuth

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

# ----------------------
# Signup (Email/Password)
# ----------------------
@router.post("/signup")
async def signup(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    await db.commit()
    return {"message": "User created"}

# ----------------------
# Login (Email/Password)
# ----------------------
@router.post("/login")
async def login(payload: AuthRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

# ----------------------
# Login with Google
# ----------------------
@router.get("/login/google")
async def login_google(request: Request):
    redirect_uri = request.url_for("auth_google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

# ----------------------
# Google OAuth Callback
# ----------------------
@router.get("/google/callback")
async def auth_google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)

    try:
        user_info = await oauth.google.parse_id_token(request, token)
    except Exception:
        user_info = await oauth.google.userinfo(token=token)

    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google email not found")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, hashed_password=None)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    jwt_token = create_access_token({"sub": user.email})

    # ✅ Set both token and auth_type cookies
    response = RedirectResponse(url=settings.FRONTEND_DASHBOARD_URL)
    response.set_cookie(
        key="token",
        value=jwt_token,
        httponly=True,
        secure=False,
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    response.set_cookie(
        key="auth_type",
        value="google",
        httponly=False,
        secure=False,
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    return response


# ----------------------
# Current User (for frontend)
# ----------------------
@router.get("/me")
async def get_me(email: str = Depends(get_current_user)):
    return {"email": email}

# ----------------------
# Logout (Cookie Clear)
# ----------------------
@router.get("/logout")
async def logout():
    response = RedirectResponse(url="http://localhost:3000")
    response.delete_cookie("token")
    response.delete_cookie("auth_type")
    return response
