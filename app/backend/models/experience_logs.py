from core.database import Base
from sqlalchemy import Column, Integer, String


class Experience_logs(Base):
    __tablename__ = "experience_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    experience_change = Column(Integer, nullable=True)
    points_change = Column(Integer, nullable=True)
    created_at = Column(String, nullable=True)