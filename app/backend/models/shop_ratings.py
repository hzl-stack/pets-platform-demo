from core.database import Base
from sqlalchemy import Column, Integer, String


class Shop_ratings(Base):
    __tablename__ = "shop_ratings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    shop_id = Column(Integer, nullable=False)
    user_id = Column(String, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String, nullable=True)
    created_at = Column(String, nullable=True)