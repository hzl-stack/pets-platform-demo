from core.database import Base
from sqlalchemy import Column, Integer, String


class Inspectors(Base):
    __tablename__ = "inspectors"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    appointed_at = Column(String, nullable=True)
    appointed_by = Column(String, nullable=True)