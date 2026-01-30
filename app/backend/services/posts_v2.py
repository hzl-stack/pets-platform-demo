import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.posts_v2 import Posts_v2

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Posts_v2Service:
    """Service layer for Posts_v2 operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Posts_v2]:
        """Create a new posts_v2"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Posts_v2(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created posts_v2 with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating posts_v2: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for posts_v2 {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Posts_v2]:
        """Get posts_v2 by ID (user can only see their own records)"""
        try:
            query = select(Posts_v2).where(Posts_v2.id == obj_id)
            if user_id:
                query = query.where(Posts_v2.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching posts_v2 {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of posts_v2s (user can only see their own records)"""
        try:
            query = select(Posts_v2)
            count_query = select(func.count(Posts_v2.id))
            
            if user_id:
                query = query.where(Posts_v2.user_id == user_id)
                count_query = count_query.where(Posts_v2.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Posts_v2, field):
                        query = query.where(getattr(Posts_v2, field) == value)
                        count_query = count_query.where(getattr(Posts_v2, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Posts_v2, field_name):
                        query = query.order_by(getattr(Posts_v2, field_name).desc())
                else:
                    if hasattr(Posts_v2, sort):
                        query = query.order_by(getattr(Posts_v2, sort))
            else:
                query = query.order_by(Posts_v2.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching posts_v2 list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Posts_v2]:
        """Update posts_v2 (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Posts_v2 {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated posts_v2 {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating posts_v2 {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete posts_v2 (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Posts_v2 {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted posts_v2 {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting posts_v2 {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Posts_v2]:
        """Get posts_v2 by any field"""
        try:
            if not hasattr(Posts_v2, field_name):
                raise ValueError(f"Field {field_name} does not exist on Posts_v2")
            result = await self.db.execute(
                select(Posts_v2).where(getattr(Posts_v2, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching posts_v2 by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Posts_v2]:
        """Get list of posts_v2s filtered by field"""
        try:
            if not hasattr(Posts_v2, field_name):
                raise ValueError(f"Field {field_name} does not exist on Posts_v2")
            result = await self.db.execute(
                select(Posts_v2)
                .where(getattr(Posts_v2, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Posts_v2.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching posts_v2s by {field_name}: {str(e)}")
            raise