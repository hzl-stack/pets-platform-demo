from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Shops_v2(Base):
    __tablename__ = "shops_v2"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    shop_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    status = Column(String, nullable=True, default='pending', server_default='pending')
    average_rating = Column(Float, nullable=True, default=0, server_default='0')
    created_at = Column(String, nullable=True)