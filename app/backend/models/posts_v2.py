from core.database import Base
from sqlalchemy import Boolean, Column, Integer, String


class Posts_v2(Base):
    __tablename__ = "posts_v2"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    content = Column(String, nullable=False)
    post_type = Column(String, nullable=False)
    is_anonymous = Column(Boolean, nullable=True, default=False, server_default='false')
    review_status = Column(String, nullable=True, default='approved', server_default='approved')
    reward_points = Column(Integer, nullable=True, default=0, server_default='0')
    is_solved = Column(Boolean, nullable=True, default=False, server_default='false')
    solver_id = Column(String, nullable=True)
    likes_count = Column(Integer, nullable=True, default=0, server_default='0')
    comments_count = Column(Integer, nullable=True, default=0, server_default='0')
    created_at = Column(String, nullable=True)