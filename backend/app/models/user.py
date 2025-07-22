from sqlalchemy import Column, String, Integer, Enum
from app.db.base import Base
import enum

class SubscriptionLevel(str, enum.Enum):
    free = "free"
    pro = "pro"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    subscription = Column(Enum(SubscriptionLevel), default=SubscriptionLevel.free)