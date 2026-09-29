"""
Structured API errors.

Every error response has the same shape so clients can branch on a stable
machine-readable ``code`` instead of parsing English messages:

    {
      "error": {
        "code": "AUTH_TOKEN_EXPIRED",
        "message": "Your session has expired. Please sign in again.",
        "status": 401,
        "request_id": "5f0c…"
      },
      "detail": "Your session has expired. Please sign in again."
    }

``detail`` mirrors ``error.message`` so older clients that read FastAPI's
default ``detail`` field keep working.
"""
import logging
import re
import uuid
from enum import Enum
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,64}")


class ErrorCode(str, Enum):
    # Authentication — the caller must (re)authenticate
    AUTH_TOKEN_MISSING = "AUTH_TOKEN_MISSING"
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_USER_NOT_FOUND = "AUTH_USER_NOT_FOUND"
    AUTH_SESSION_REVOKED = "AUTH_SESSION_REVOKED"

    # Credentials / account
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_USE_GOOGLE_SIGNIN = "AUTH_USE_GOOGLE_SIGNIN"
    AUTH_EMAIL_TAKEN = "AUTH_EMAIL_TAKEN"
    AUTH_EMAIL_INVALID = "AUTH_EMAIL_INVALID"
    AUTH_PASSWORD_TOO_SHORT = "AUTH_PASSWORD_TOO_SHORT"
    AUTH_PASSWORD_TOO_LONG = "AUTH_PASSWORD_TOO_LONG"

    # Google OAuth
    AUTH_OAUTH_CANCELLED = "AUTH_OAUTH_CANCELLED"
    AUTH_OAUTH_FAILED = "AUTH_OAUTH_FAILED"
    AUTH_OAUTH_EMAIL_MISSING = "AUTH_OAUTH_EMAIL_MISSING"
    AUTH_OAUTH_EMAIL_UNVERIFIED = "AUTH_OAUTH_EMAIL_UNVERIFIED"

    # Generic
    VALIDATION_FAILED = "VALIDATION_FAILED"
    RATE_LIMITED = "RATE_LIMITED"
    BAD_REQUEST = "BAD_REQUEST"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    NOT_FOUND = "NOT_FOUND"
    METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED"
    CONFLICT = "CONFLICT"
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    UNSUPPORTED_MEDIA_TYPE = "UNSUPPORTED_MEDIA_TYPE"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# Codes that mean "this session can no longer be used — sign in again".
SESSION_ENDED_CODES = frozenset(
    {
        ErrorCode.AUTH_TOKEN_MISSING,
        ErrorCode.AUTH_TOKEN_INVALID,
        ErrorCode.AUTH_TOKEN_EXPIRED,
        ErrorCode.AUTH_USER_NOT_FOUND,
        ErrorCode.AUTH_SESSION_REVOKED,
    }
)

# Fallback code for plain HTTPExceptions raised by routes that predate AppError.
_STATUS_CODES: dict[int, ErrorCode] = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHORIZED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    405: ErrorCode.METHOD_NOT_ALLOWED,
    409: ErrorCode.CONFLICT,
    413: ErrorCode.PAYLOAD_TOO_LARGE,
    415: ErrorCode.UNSUPPORTED_MEDIA_TYPE,
    422: ErrorCode.VALIDATION_FAILED,
    429: ErrorCode.RATE_LIMITED,
    503: ErrorCode.SERVICE_UNAVAILABLE,
}


class AppError(HTTPException):
    """An HTTPException that carries a stable error code."""

    def __init__(
        self,
        status_code: int,
        code: ErrorCode,
        message: str,
        *,
        headers: dict[str, str] | None = None,
        extra: dict[str, Any] | None = None,
    ):
        super().__init__(status_code=status_code, detail=message, headers=headers)
        self.code = code
        self.message = message
        self.extra = extra or {}


def request_id_of(request: Request) -> str:
    return getattr(request.state, "request_id", None) or "-"


def error_response(
    request: Request,
    status_code: int,
    code: ErrorCode | str,
    message: str,
    *,
    headers: dict[str, str] | None = None,
    extra: dict[str, Any] | None = None,
) -> JSONResponse:
    code_value = code.value if isinstance(code, ErrorCode) else code
    body: dict[str, Any] = {
        "error": {
            "code": code_value,
            "message": message,
            "status": status_code,
            "request_id": request_id_of(request),
            **(extra or {}),
        },
        "detail": message,
    }
    return JSONResponse(status_code=status_code, content=body, headers=headers)


def _message_for_status(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Request failed"


async def _handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if isinstance(exc, AppError):
        return error_response(
            request, exc.status_code, exc.code, exc.message, headers=exc.headers, extra=exc.extra
        )

    code = _STATUS_CODES.get(
        exc.status_code,
        ErrorCode.INTERNAL_ERROR if exc.status_code >= 500 else ErrorCode.BAD_REQUEST,
    )
    message = exc.detail if isinstance(exc.detail, str) else _message_for_status(exc.status_code)
    return error_response(request, exc.status_code, code, message, headers=getattr(exc, "headers", None))


async def _handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    fields = [
        {
            "field": ".".join(str(part) for part in err.get("loc", []) if part != "body"),
            "message": err.get("msg", "Invalid value"),
        }
        for err in exc.errors()
    ]
    return error_response(
        request,
        422,
        ErrorCode.VALIDATION_FAILED,
        "Some fields are missing or invalid.",
        extra={"fields": fields},
    )


async def _handle_rate_limit(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = "60"
    limit = getattr(exc, "limit", None)
    if limit is not None and getattr(limit, "limit", None) is not None:
        retry_after = str(limit.limit.get_expiry())
    return error_response(
        request,
        429,
        ErrorCode.RATE_LIMITED,
        "Too many attempts. Please wait a minute and try again.",
        headers={"Retry-After": retry_after},
    )


async def _handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s (request_id=%s)", request.method, request.url.path, request_id_of(request))
    return error_response(
        request,
        500,
        ErrorCode.INTERNAL_ERROR,
        "Something went wrong on our side. Please try again.",
    )


def install_error_handling(app: FastAPI) -> None:
    @app.middleware("http")
    async def assign_request_id(request: Request, call_next):
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        request.state.request_id = incoming if _REQUEST_ID_PATTERN.fullmatch(incoming) else uuid.uuid4().hex
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = request.state.request_id
        return response

    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(RateLimitExceeded, _handle_rate_limit)
    app.add_exception_handler(Exception, _handle_unexpected)
