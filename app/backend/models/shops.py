from core.database import Base
from sqlalchemy import Column, Integer, String


class Shops(Base):
    __tablename__ = "shops"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    shop_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)