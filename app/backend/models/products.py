from core.database import Base
from sqlalchemy import Column, Float, Integer, String


class Products(Base):
    __tablename__ = "products"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    seller_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    image_url = Column(String, nullable=True)
    stock = Column(Integer, nullable=True)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)