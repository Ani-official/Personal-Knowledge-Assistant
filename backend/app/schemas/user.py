from pydantic import BaseModel, Field


class AuthRequest(BaseModel):
    # Upper bounds only guard against oversized payloads; the real rules live in
    # app.core.security so they can return specific error codes.
    email: str = Field(max_length=320)
    password: str = Field(max_length=1024)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: str
    email: str
