from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import pytest
from authlib.integrations.base_client.errors import OAuthError
from httpx import ASGITransport, AsyncClient
from jose import jwt

from app.api import auth as auth_module
from app.core import security
from app.core.rate_limit import limiter
from app.models.user import User
from main import app
from tests.conftest import error_code

PASSWORD = "correct-horse-battery"


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def mint(claims: dict, secret: str = security.SECRET_KEY) -> str:
    return jwt.encode(claims, secret, algorithm=security.ALGORITHM)


def ts(dt: datetime) -> int:
    return int(dt.timestamp())


NOW = lambda: datetime.now(timezone.utc)  # noqa: E731


# --------------------------------------------------------------------------
# Signup
# --------------------------------------------------------------------------
class TestSignup:
    async def test_signup_signs_the_user_in(self, client):
        res = await client.post("/auth/signup", json={"email": "new@example.com", "password": PASSWORD})
        assert res.status_code == 201
        body = res.json()
        assert body["token_type"] == "bearer"
        assert body["email"] == "new@example.com"
        assert body["expires_at"]

        me = await client.get("/auth/me", headers=bearer(body["access_token"]))
        assert me.status_code == 200
        assert me.json() == {"email": "new@example.com"}

    async def test_email_is_trimmed_and_lowercased(self, client):
        res = await client.post("/auth/signup", json={"email": "  Mixed.Case@Example.COM ", "password": PASSWORD})
        assert res.status_code == 201
        assert res.json()["email"] == "mixed.case@example.com"

    async def test_duplicate_email_is_rejected(self, client, make_user):
        await make_user("taken@example.com")
        res = await client.post("/auth/signup", json={"email": "taken@example.com", "password": PASSWORD})
        assert res.status_code == 409
        assert error_code(res) == "AUTH_EMAIL_TAKEN"

    async def test_duplicate_check_ignores_case(self, client, make_user):
        await make_user("Taken@Example.com")
        res = await client.post("/auth/signup", json={"email": "taken@example.com", "password": PASSWORD})
        assert res.status_code == 409
        assert error_code(res) == "AUTH_EMAIL_TAKEN"

    async def test_signup_over_existing_google_account_is_rejected(self, client, make_user):
        await make_user("g@example.com", password=None)
        res = await client.post("/auth/signup", json={"email": "g@example.com", "password": PASSWORD})
        assert res.status_code == 409
        assert error_code(res) == "AUTH_EMAIL_TAKEN"

    @pytest.mark.parametrize("email", ["", "plainaddress", "no-at.example.com", "a@b", "a b@example.com", "@example.com"])
    async def test_invalid_email_is_rejected(self, client, email):
        res = await client.post("/auth/signup", json={"email": email, "password": PASSWORD})
        assert res.status_code == 422
        assert error_code(res) == "AUTH_EMAIL_INVALID"

    async def test_email_longer_than_254_is_rejected(self, client):
        email = "a" * 250 + "@example.com"
        res = await client.post("/auth/signup", json={"email": email, "password": PASSWORD})
        assert res.status_code == 422
        assert error_code(res) == "AUTH_EMAIL_INVALID"

    @pytest.mark.parametrize("password", ["", "short", "1234567"])
    async def test_short_password_is_rejected(self, client, password):
        res = await client.post("/auth/signup", json={"email": "p@example.com", "password": password})
        assert res.status_code == 422
        assert error_code(res) == "AUTH_PASSWORD_TOO_SHORT"
        assert res.json()["error"]["min_length"] == 8

    async def test_password_of_exactly_8_chars_is_accepted(self, client):
        res = await client.post("/auth/signup", json={"email": "p8@example.com", "password": "12345678"})
        assert res.status_code == 201

    async def test_password_over_72_bytes_is_rejected(self, client):
        # 25 characters, but 75 bytes: bcrypt would silently ignore the tail.
        res = await client.post("/auth/signup", json={"email": "long@example.com", "password": "€" * 25})
        assert res.status_code == 422
        assert error_code(res) == "AUTH_PASSWORD_TOO_LONG"

    async def test_password_of_exactly_72_bytes_is_accepted(self, client):
        res = await client.post("/auth/signup", json={"email": "p72@example.com", "password": "a" * 72})
        assert res.status_code == 201

    async def test_missing_fields_report_each_field(self, client):
        res = await client.post("/auth/signup", json={})
        assert res.status_code == 422
        err = res.json()["error"]
        assert err["code"] == "VALIDATION_FAILED"
        assert {f["field"] for f in err["fields"]} == {"email", "password"}

    async def test_non_json_body_is_a_validation_error(self, client):
        res = await client.post("/auth/signup", content=b"not json", headers={"Content-Type": "application/json"})
        assert res.status_code == 422
        assert error_code(res) == "VALIDATION_FAILED"

    async def test_oversized_password_payload_is_rejected(self, client):
        res = await client.post("/auth/signup", json={"email": "big@example.com", "password": "x" * 5000})
        assert res.status_code == 422
        assert error_code(res) == "VALIDATION_FAILED"


# --------------------------------------------------------------------------
# Login
# --------------------------------------------------------------------------
class TestLogin:
    async def test_valid_credentials_return_a_session(self, client, make_user):
        await make_user("u@example.com")
        res = await client.post("/auth/login", json={"email": "u@example.com", "password": PASSWORD})
        assert res.status_code == 200
        body = res.json()
        assert body["email"] == "u@example.com"
        me = await client.get("/auth/me", headers=bearer(body["access_token"]))
        assert me.status_code == 200

    async def test_email_match_ignores_case_and_whitespace(self, client, make_user):
        await make_user("u@example.com")
        res = await client.post("/auth/login", json={"email": "  U@EXAMPLE.com ", "password": PASSWORD})
        assert res.status_code == 200

    async def test_legacy_mixed_case_account_keeps_its_stored_email(self, client, make_user):
        # Accounts created before normalisation own their data under the exact stored address.
        await make_user("Legacy.User@Example.com")
        res = await client.post("/auth/login", json={"email": "legacy.user@example.com", "password": PASSWORD})
        assert res.status_code == 200
        assert res.json()["email"] == "Legacy.User@Example.com"
        claims = jwt.get_unverified_claims(res.json()["access_token"])
        assert claims["sub"] == "Legacy.User@Example.com"

    async def test_legacy_short_password_can_still_sign_in(self, client, make_user):
        # The 8-character minimum applies to new passwords, not to existing accounts.
        await make_user("old@example.com", password="abc123")
        res = await client.post("/auth/login", json={"email": "old@example.com", "password": "abc123"})
        assert res.status_code == 200

    async def test_wrong_password(self, client, make_user):
        await make_user("u@example.com")
        res = await client.post("/auth/login", json={"email": "u@example.com", "password": "wrong-password"})
        assert res.status_code == 401
        assert error_code(res) == "AUTH_INVALID_CREDENTIALS"

    async def test_unknown_email_is_indistinguishable_from_wrong_password(self, client, make_user):
        await make_user("u@example.com")
        wrong_pw = await client.post("/auth/login", json={"email": "u@example.com", "password": "nope-nope"})
        unknown = await client.post("/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
        assert unknown.status_code == wrong_pw.status_code == 401
        assert unknown.json()["error"]["code"] == wrong_pw.json()["error"]["code"]
        assert unknown.json()["error"]["message"] == wrong_pw.json()["error"]["message"]

    async def test_google_only_account_is_told_to_use_google(self, client, make_user):
        await make_user("g@example.com", password=None)
        res = await client.post("/auth/login", json={"email": "g@example.com", "password": PASSWORD})
        assert res.status_code == 401
        assert error_code(res) == "AUTH_USE_GOOGLE_SIGNIN"

    async def test_empty_password(self, client, make_user):
        await make_user("u@example.com")
        res = await client.post("/auth/login", json={"email": "u@example.com", "password": ""})
        assert res.status_code == 401
        assert error_code(res) == "AUTH_INVALID_CREDENTIALS"

    async def test_missing_password_field(self, client):
        res = await client.post("/auth/login", json={"email": "u@example.com"})
        assert res.status_code == 422
        assert error_code(res) == "VALIDATION_FAILED"

    async def test_login_is_rate_limited(self, client, make_user):
        await make_user("u@example.com")
        limiter.enabled = True
        limiter.reset()
        codes = []
        for _ in range(11):
            res = await client.post("/auth/login", json={"email": "u@example.com", "password": "wrong-password"})
            codes.append(res.status_code)
        assert codes[:10] == [401] * 10
        assert codes[10] == 429
        assert error_code(res) == "RATE_LIMITED"
        assert res.headers.get("Retry-After")

    async def test_signup_is_rate_limited(self, client):
        limiter.enabled = True
        limiter.reset()
        for i in range(5):
            res = await client.post("/auth/signup", json={"email": f"r{i}@example.com", "password": PASSWORD})
            assert res.status_code == 201
        res = await client.post("/auth/signup", json={"email": "r6@example.com", "password": PASSWORD})
        assert res.status_code == 429
        assert error_code(res) == "RATE_LIMITED"


# --------------------------------------------------------------------------
# Protected routes & token validation
# --------------------------------------------------------------------------
class TestTokenValidation:
    async def test_no_token(self, client):
        res = await client.get("/auth/me")
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_MISSING"

    async def test_empty_bearer(self, client):
        res = await client.get("/auth/me", headers={"Authorization": "Bearer "})
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_MISSING"

    async def test_non_bearer_scheme_is_ignored(self, client):
        res = await client.get("/auth/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_MISSING"

    async def test_garbage_token(self, client):
        res = await client.get("/auth/me", headers=bearer("not-a-jwt"))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_INVALID"

    async def test_the_string_undefined(self, client):
        # What the old signup flow stored in localStorage.
        res = await client.get("/auth/me", headers=bearer("undefined"))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_INVALID"

    async def test_token_signed_with_another_secret(self, client, make_user):
        await make_user("u@example.com")
        token = mint({"sub": "u@example.com", "exp": ts(NOW() + timedelta(hours=1))}, secret="rotated-secret")
        res = await client.get("/auth/me", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_INVALID"

    async def test_tampered_payload(self, client, make_user):
        await make_user("u@example.com")
        await make_user("victim@example.com")
        token = security.create_access_token({"sub": "u@example.com"})
        header, _, signature = token.split(".")
        forged_payload = jwt.encode({"sub": "victim@example.com"}, "x").split(".")[1]
        res = await client.get("/auth/me", headers=bearer(f"{header}.{forged_payload}.{signature}"))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_INVALID"

    async def test_alg_none_is_rejected(self, client, make_user):
        await make_user("u@example.com")
        import base64
        import json

        def b64(d):
            return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()

        token = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': 'u@example.com'})}."
        res = await client.get("/auth/me", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_INVALID"

    async def test_token_without_subject(self, client):
        token = mint({"exp": ts(NOW() + timedelta(hours=1))})
        res = await client.get("/auth/me", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_INVALID"

    async def test_expired_token(self, client, make_user):
        await make_user("u@example.com")
        token = mint({"sub": "u@example.com", "exp": ts(NOW() - timedelta(seconds=5))})
        res = await client.get("/auth/me", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_EXPIRED"

    async def test_deleted_account(self, client, make_user, db_sessionmaker):
        user = await make_user("gone@example.com")
        token = security.create_access_token({"sub": user.email})
        async with db_sessionmaker() as session:
            await session.delete(await session.get(User, user.id))
            await session.commit()
        res = await client.get("/auth/me", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_USER_NOT_FOUND"

    async def test_bearer_scheme_is_case_insensitive(self, client, make_user):
        await make_user("u@example.com")
        token = security.create_access_token({"sub": "u@example.com"})
        res = await client.get("/auth/me", headers={"Authorization": f"bearer {token}"})
        assert res.status_code == 200

    async def test_cookie_token_is_accepted(self, client, make_user):
        await make_user("u@example.com")
        token = security.create_access_token({"sub": "u@example.com"})
        client.cookies.set("token", token)
        res = await client.get("/auth/me")
        client.cookies.clear()
        assert res.status_code == 200

    async def test_legacy_token_without_new_claims_still_works(self, client, make_user):
        # Tokens issued before this change carry only sub + exp.
        await make_user("u@example.com")
        token = mint({"sub": "u@example.com", "exp": ts(NOW() + timedelta(days=3))})
        res = await client.get("/auth/me", headers=bearer(token))
        assert res.status_code == 200

    @pytest.mark.parametrize(
        "method,path",
        [
            ("get", "/documents/"),
            ("get", "/conversations/"),
            ("get", "/api-key/status"),
            ("get", "/status/some-doc"),
            ("delete", "/documents/some-doc"),
        ],
    )
    async def test_protected_routes_share_the_same_auth_errors(self, client, method, path):
        res = await getattr(client, method)(path)
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_MISSING"

        expired = mint({"sub": "u@example.com", "exp": ts(NOW() - timedelta(seconds=5))})
        res = await getattr(client, method)(path, headers=bearer(expired))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_EXPIRED"


# --------------------------------------------------------------------------
# Session lifetime: idle timeout + absolute cap
# --------------------------------------------------------------------------
class TestSessionLifetime:
    def test_policy_is_7_idle_days_capped_at_30_days(self):
        assert security.ACCESS_TOKEN_EXPIRE_MINUTES == 7 * 24 * 60
        assert security.SESSION_MAX_AGE == timedelta(days=30)

    def test_fresh_token_expires_after_the_idle_window(self):
        token = security.create_access_token({"sub": "u@example.com"})
        exp = security.token_expiry(token)
        assert abs((exp - NOW()) - timedelta(days=7)) < timedelta(seconds=5)

    async def test_refresh_issues_a_new_token_with_a_later_expiry(self, client, make_user):
        await make_user("u@example.com")
        started = NOW() - timedelta(days=5)
        old = mint(
            {
                "sub": "u@example.com",
                "iat": ts(started),
                "auth_time": ts(started),
                "exp": ts(started + timedelta(days=7)),
            }
        )
        res = await client.post("/auth/refresh", headers=bearer(old))
        assert res.status_code == 200
        new = res.json()["access_token"]
        new_claims = jwt.get_unverified_claims(new)
        assert new_claims["exp"] > jwt.get_unverified_claims(old)["exp"]
        # The original sign-in time is preserved across refreshes.
        assert new_claims["auth_time"] == ts(started)
        assert abs(new_claims["exp"] - ts(NOW() + timedelta(days=7))) <= 5

    async def test_refresh_never_extends_past_the_absolute_cap(self, client, make_user):
        await make_user("u@example.com")
        started = NOW() - timedelta(days=29)
        old = mint({"sub": "u@example.com", "auth_time": ts(started), "exp": ts(NOW() + timedelta(days=1))})
        res = await client.post("/auth/refresh", headers=bearer(old))
        assert res.status_code == 200
        exp = jwt.get_unverified_claims(res.json()["access_token"])["exp"]
        assert exp <= ts(started + timedelta(days=30)) + 1
        assert exp < ts(NOW() + timedelta(days=2))

    async def test_session_idle_for_more_than_7_days_must_sign_in_again(self, client, make_user):
        await make_user("u@example.com")
        issued = NOW() - timedelta(days=7, minutes=1)
        token = mint(
            {"sub": "u@example.com", "iat": ts(issued), "auth_time": ts(issued), "exp": ts(issued + timedelta(days=7))}
        )
        res = await client.post("/auth/refresh", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_EXPIRED"

    async def test_session_idle_for_6_days_is_still_valid(self, client, make_user):
        await make_user("u@example.com")
        issued = NOW() - timedelta(days=6)
        token = mint(
            {"sub": "u@example.com", "iat": ts(issued), "auth_time": ts(issued), "exp": ts(issued + timedelta(days=7))}
        )
        res = await client.post("/auth/refresh", headers=bearer(token))
        assert res.status_code == 200

    async def test_session_older_than_30_days_expires_even_if_active(self, client, make_user):
        await make_user("u@example.com")
        started = NOW() - timedelta(days=30, minutes=1)
        # A token refreshed yesterday is still capped at auth_time + 30 days.
        token = security.create_access_token({"sub": "u@example.com"}, auth_time=started)
        res = await client.post("/auth/refresh", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_EXPIRED"

    async def test_refresh_of_legacy_token_starts_a_capped_session(self, client, make_user):
        await make_user("u@example.com")
        legacy = mint({"sub": "u@example.com", "exp": ts(NOW() + timedelta(days=2))})
        res = await client.post("/auth/refresh", headers=bearer(legacy))
        assert res.status_code == 200
        claims = jwt.get_unverified_claims(res.json()["access_token"])
        assert "auth_time" in claims

    async def test_refresh_requires_a_token(self, client):
        res = await client.post("/auth/refresh")
        assert res.status_code == 401
        assert error_code(res) == "AUTH_TOKEN_MISSING"

    async def test_refresh_for_deleted_account(self, client, make_user, db_sessionmaker):
        user = await make_user("gone@example.com")
        token = security.create_access_token({"sub": user.email})
        async with db_sessionmaker() as session:
            await session.delete(await session.get(User, user.id))
            await session.commit()
        res = await client.post("/auth/refresh", headers=bearer(token))
        assert res.status_code == 401
        assert error_code(res) == "AUTH_USER_NOT_FOUND"


# --------------------------------------------------------------------------
# Google OAuth callback
# --------------------------------------------------------------------------
def fragment_of(response) -> dict:
    location = response.headers["location"]
    parsed = urlparse(location)
    assert f"{parsed.scheme}://{parsed.netloc}" == "http://frontend.test"
    assert parsed.path == "/auth/google-callback"
    assert parsed.query == "", "tokens and errors must not travel in the query string"
    return {k: v[0] for k, v in parse_qs(parsed.fragment).items()}


@pytest.fixture
def google(monkeypatch):
    state = {"token": None, "error": None}

    async def fake_authorize_access_token(request, **kwargs):
        if state["error"]:
            raise state["error"]
        return state["token"]

    async def fake_userinfo(**kwargs):
        return {}

    monkeypatch.setattr(auth_module.oauth.google, "authorize_access_token", fake_authorize_access_token)
    monkeypatch.setattr(auth_module.oauth.google, "userinfo", fake_userinfo)
    return state


class TestGoogleCallback:
    async def test_user_cancelled_consent(self, client):
        res = await client.get("/auth/google/callback?error=access_denied")
        assert res.status_code == 307
        assert fragment_of(res) == {"error": "AUTH_OAUTH_CANCELLED"}

    async def test_other_provider_error(self, client):
        res = await client.get("/auth/google/callback?error=server_error")
        assert fragment_of(res) == {"error": "AUTH_OAUTH_FAILED"}

    async def test_state_mismatch_or_token_exchange_failure(self, client, google):
        google["error"] = OAuthError(error="mismatching_state")
        res = await client.get("/auth/google/callback?code=abc&state=xyz")
        assert fragment_of(res) == {"error": "AUTH_OAUTH_FAILED"}

    async def test_missing_email(self, client, google):
        google["token"] = {"userinfo": {"sub": "123"}}
        res = await client.get("/auth/google/callback?code=abc")
        assert fragment_of(res) == {"error": "AUTH_OAUTH_EMAIL_MISSING"}

    async def test_unverified_email(self, client, google):
        google["token"] = {"userinfo": {"email": "u@example.com", "email_verified": False}}
        res = await client.get("/auth/google/callback?code=abc")
        assert fragment_of(res) == {"error": "AUTH_OAUTH_EMAIL_UNVERIFIED"}

    async def test_new_user_is_created_and_signed_in(self, client, google, db_sessionmaker):
        google["token"] = {"userinfo": {"email": "New.Google@Example.com", "email_verified": True}}
        res = await client.get("/auth/google/callback?code=abc")
        params = fragment_of(res)
        assert params["auth_type"] == "google"
        me = await client.get("/auth/me", headers=bearer(params["token"]))
        assert me.json() == {"email": "new.google@example.com"}

    async def test_existing_account_is_matched_case_insensitively(self, client, google, make_user, db_sessionmaker):
        await make_user("Existing@Example.com")
        google["token"] = {"userinfo": {"email": "existing@example.com", "email_verified": True}}
        res = await client.get("/auth/google/callback?code=abc")
        params = fragment_of(res)
        claims = jwt.get_unverified_claims(params["token"])
        assert claims["sub"] == "Existing@Example.com"

        from sqlalchemy import func, select

        async with db_sessionmaker() as session:
            count = await session.scalar(select(func.count()).select_from(User))
        assert count == 1


# --------------------------------------------------------------------------
# Logout
# --------------------------------------------------------------------------
class TestLogout:
    async def test_logout_clears_cookies(self, client):
        res = await client.post("/auth/logout")
        assert res.status_code == 204
        set_cookie = " ".join(res.headers.get_list("set-cookie"))
        assert "token=" in set_cookie and "auth_type=" in set_cookie

    async def test_logout_rejects_get(self, client):
        res = await client.get("/auth/logout")
        assert res.status_code == 405
        assert error_code(res) == "METHOD_NOT_ALLOWED"


# --------------------------------------------------------------------------
# Error envelope
# --------------------------------------------------------------------------
class TestErrorEnvelope:
    async def test_shape_is_stable(self, client):
        res = await client.get("/auth/me")
        body = res.json()
        assert set(body) == {"error", "detail"}
        assert set(body["error"]) >= {"code", "message", "status", "request_id"}
        assert body["error"]["status"] == 401
        assert body["detail"] == body["error"]["message"]

    async def test_request_id_is_returned(self, client):
        res = await client.get("/auth/me")
        assert res.headers["X-Request-ID"] == res.json()["error"]["request_id"]

    async def test_caller_request_id_is_echoed(self, client):
        res = await client.get("/auth/me", headers={"X-Request-ID": "trace-123"})
        assert res.headers["X-Request-ID"] == "trace-123"
        assert res.json()["error"]["request_id"] == "trace-123"

    async def test_unsafe_request_id_is_replaced(self, client):
        res = await client.get("/auth/me", headers={"X-Request-ID": "bad id<script>"})
        assert res.headers["X-Request-ID"] != "bad id<script>"
        assert len(res.headers["X-Request-ID"]) == 32

    async def test_unknown_route(self, client):
        res = await client.get("/definitely-not-a-route")
        assert res.status_code == 404
        assert error_code(res) == "NOT_FOUND"

    async def test_unexpected_errors_do_not_leak_internals(self, db_sessionmaker, monkeypatch):
        async def explode(*args, **kwargs):
            raise RuntimeError("database password is hunter2")

        monkeypatch.setattr(auth_module, "find_user_by_email", explode)
        limiter.enabled = False
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://api.test") as ac:
            res = await ac.post("/auth/login", json={"email": "u@example.com", "password": PASSWORD})
        limiter.enabled = True
        assert res.status_code == 500
        assert error_code(res) == "INTERNAL_ERROR"
        assert "hunter2" not in res.text
