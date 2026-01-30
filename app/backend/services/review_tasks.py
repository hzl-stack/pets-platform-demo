import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.review_tasks import Review_tasks

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Review_tasksService:
    """Service layer for Review_tasks operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Review_tasks]:
        """Create a new review_tasks"""
        try:
            obj = Review_tasks(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created review_tasks with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating review_tasks: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Review_tasks]:
        """Get review_tasks by ID"""
        try:
            query = select(Review_tasks).where(Review_tasks.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching review_tasks {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of review_taskss"""
        try:
            query = select(Review_tasks)
            count_query = select(func.count(Review_tasks.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Review_tasks, field):
                        query = query.where(getattr(Review_tasks, field) == value)
                        count_query = count_query.where(getattr(Review_tasks, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Review_tasks, field_name):
                        query = query.order_by(getattr(Review_tasks, field_name).desc())
                else:
                    if hasattr(Review_tasks, sort):
                        query = query.order_by(getattr(Review_tasks, sort))
            else:
                query = query.order_by(Review_tasks.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching review_tasks list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Review_tasks]:
        """Update review_tasks"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Review_tasks {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated review_tasks {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating review_tasks {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete review_tasks"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Review_tasks {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted review_tasks {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting review_tasks {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Review_tasks]:
        """Get review_tasks by any field"""
        try:
            if not hasattr(Review_tasks, field_name):
                raise ValueError(f"Field {field_name} does not exist on Review_tasks")
            result = await self.db.execute(
                select(Review_tasks).where(getattr(Review_tasks, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching review_tasks by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Review_tasks]:
        """Get list of review_taskss filtered by field"""
        try:
            if not hasattr(Review_tasks, field_name):
                raise ValueError(f"Field {field_name} does not exist on Review_tasks")
            result = await self.db.execute(
                select(Review_tasks)
                .where(getattr(Review_tasks, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Review_tasks.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching review_taskss by {field_name}: {str(e)}")
            raise