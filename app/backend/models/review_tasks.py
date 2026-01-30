from core.database import Base
from sqlalchemy import Column, Integer, String


class Review_tasks(Base):
    __tablename__ = "review_tasks"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    task_type = Column(String, nullable=False)
    target_id = Column(Integer, nullable=False)
    assigned_to = Column(String, nullable=True)
    status = Column(String, nullable=True, default='pending', server_default='pending')
    created_at = Column(String, nullable=True)