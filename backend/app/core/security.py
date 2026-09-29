import re
from datetime import datetime, timedelta, timezone

from fastapi import Depends, Request
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AppError, ErrorCode
from app.db.session import get_db
from app.models.user import User

# Config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
SESSION_MAX_AGE = timedelta(days=settings.SESSION_MAX_AGE_DAYS)

# Password rules. bcrypt ignores everything past 72 bytes, so longer passwords
# are rejected rather than silently truncated.
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72
EMAIL_MAX_LENGTH = 254
_EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# A real hash to verify against when the email is unknown, so a missing account
# takes as long to reject as a wrong password (no timing-based enumeration).
_DUMMY_HASH = pwd_context.hash("timing-equaliser-not-a-real-password")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def burn_password_check(plain: str) -> None:
    pwd_context.verify(plain, _DUMMY_HASH)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> str:
    normalized = normalize_email(email)
    if len(normalized) > EMAIL_MAX_LENGTH or not _EMAIL_PATTERN.match(normalized):
        raise AppError(422, ErrorCode.AUTH_EMAIL_INVALID, "Enter a valid email address.")
    return normalized


def validate_new_password(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise AppError(
            422,
            ErrorCode.AUTH_PASSWORD_TOO_SHORT,
            f"Password must be at least {PASSWORD_MIN_LENGTH} characters.",
            extra={"min_length": PASSWORD_MIN_LENGTH},
        )
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise AppError(
            422,
            ErrorCode.AUTH_PASSWORD_TOO_LONG,
            f"Password must be at most {PASSWORD_MAX_BYTES} bytes.",
            extra={"max_bytes": PASSWORD_MAX_BYTES},
        )


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
    auth_time: datetime | None = None,
) -> str:
    """
    Issue a session token. ``auth_time`` is when the user originally signed in;
    it is carried across refreshes so the session can never outlive
    SESSION_MAX_AGE, whatever the idle window.
    """
    now = _now()
    auth_time = auth_time or now
    expire = min(
        now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)),
        auth_time + SESSION_MAX_AGE,
    )
    to_encode = {
        **data,
        "iat": int(now.timestamp()),
        "auth_time": int(auth_time.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError:
        raise AppError(
            401,
            ErrorCode.AUTH_TOKEN_EXPIRED,
            "Your session has expired. Please sign in again.",
        )
    except JWTError:
        raise AppError(
            401,
            ErrorCode.AUTH_TOKEN_INVALID,
            "Your session is no longer valid. Please sign in again.",
        )
    if not isinstance(payload.get("sub"), str) or not payload["sub"]:
        raise AppError(
            401,
            ErrorCode.AUTH_TOKEN_INVALID,
            "Your session is no longer valid. Please sign in again.",
        )
    return payload


def token_expiry(token: str) -> datetime:
    payload = jwt.get_unverified_claims(token)
    return datetime.fromtimestamp(payload["exp"], tz=timezone.utc)


def auth_time_of(payload: dict) -> datetime:
    """When the session started. Tokens minted before auth_time existed start now."""
    raw = payload.get("auth_time")
    if isinstance(raw, (int, float)):
        return datetime.fromtimestamp(raw, tz=timezone.utc)
    return _now()


def get_token_from_request(request: Request) -> str | None:
    """Read the token from the Authorization header, falling back to the cookie."""
    auth_header = request.headers.get("Authorization", "")
    scheme, _, credentials = auth_header.partition(" ")
    if scheme.lower() == "bearer" and credentials.strip():
        return credentials.strip()
    return request.cookies.get("token") or None


async def get_current_user_record(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = get_token_from_request(request)
    if not token:
        raise AppError(401, ErrorCode.AUTH_TOKEN_MISSING, "Please sign in to continue.")

    payload = decode_access_token(token)
    request.state.token_payload = payload

    result = await db.execute(select(User).where(User.email == payload["sub"]))
    user = result.scalar_one_or_none()
    if user is None:
        raise AppError(
            401,
            ErrorCode.AUTH_USER_NOT_FOUND,
            "This account no longer exists. Please sign in again.",
        )
    return user


async def get_current_user(user: User = Depends(get_current_user_record)) -> str:
    """The signed-in user's email, as stored on their account."""
    return user.email


async def find_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Case-insensitive lookup, so Foo@x.com and foo@x.com are the same account."""
    result = await db.execute(select(User).where(func.lower(User.email) == normalize_email(email)))
    return result.scalars().first()
