from core.database import Base
from sqlalchemy import Column, Integer, String


class Post_reviews(Base):
    __tablename__ = "post_reviews"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    post_id = Column(Integer, nullable=False)
    reviewer_id = Column(String, nullable=False)
    status = Column(String, nullable=False)
    review_comment = Column(String, nullable=True)
    created_at = Column(String, nullable=True)