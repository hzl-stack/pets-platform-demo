from core.database import Base
from sqlalchemy import Column, Integer, String


class Order_logistics(Base):
    __tablename__ = "order_logistics"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    order_id = Column(Integer, nullable=False)
    tracking_number = Column(String, nullable=True)
    carrier = Column(String, nullable=True)
    status = Column(String, nullable=False)
    current_location = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)