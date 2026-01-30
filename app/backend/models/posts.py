from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Posts(Base):
    __tablename__ = "posts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    content = Column(String, nullable=False)
    images = Column(String, nullable=True)
    is_anonymous = Column(Boolean, nullable=True)
    likes_count = Column(Integer, nullable=True)
    created_at = Column(String, nullable=False)