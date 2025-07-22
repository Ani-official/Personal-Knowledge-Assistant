from sqlalchemy import Column, String, ForeignKey
from app.db.base import Base

class UserAPIKey(Base):
    __tablename__ = "user_api_keys"

    email = Column(String, ForeignKey("users.email"), primary_key=True)
    encrypted_key = Column(String, nullable=False)
