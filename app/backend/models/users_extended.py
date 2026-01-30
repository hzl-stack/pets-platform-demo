from core.database import Base
from sqlalchemy import Column, Integer, String


class Users_extended(Base):
    __tablename__ = "users_extended"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    username = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    experience = Column(Integer, nullable=True, default=0, server_default='0')
    level = Column(Integer, nullable=True, default=1, server_default='1')
    points = Column(Integer, nullable=True, default=0, server_default='0')
    created_at = Column(String, nullable=True)