import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.product_ratings import Product_ratings

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Product_ratingsService:
    """Service layer for Product_ratings operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Product_ratings]:
        """Create a new product_ratings"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Product_ratings(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created product_ratings with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating product_ratings: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for product_ratings {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Product_ratings]:
        """Get product_ratings by ID (user can only see their own records)"""
        try:
            query = select(Product_ratings).where(Product_ratings.id == obj_id)
            if user_id:
                query = query.where(Product_ratings.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching product_ratings {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of product_ratingss (user can only see their own records)"""
        try:
            query = select(Product_ratings)
            count_query = select(func.count(Product_ratings.id))
            
            if user_id:
                query = query.where(Product_ratings.user_id == user_id)
                count_query = count_query.where(Product_ratings.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Product_ratings, field):
                        query = query.where(getattr(Product_ratings, field) == value)
                        count_query = count_query.where(getattr(Product_ratings, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Product_ratings, field_name):
                        query = query.order_by(getattr(Product_ratings, field_name).desc())
                else:
                    if hasattr(Product_ratings, sort):
                        query = query.order_by(getattr(Product_ratings, sort))
            else:
                query = query.order_by(Product_ratings.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching product_ratings list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Product_ratings]:
        """Update product_ratings (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Product_ratings {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated product_ratings {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating product_ratings {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete product_ratings (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Product_ratings {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted product_ratings {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting product_ratings {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Product_ratings]:
        """Get product_ratings by any field"""
        try:
            if not hasattr(Product_ratings, field_name):
                raise ValueError(f"Field {field_name} does not exist on Product_ratings")
            result = await self.db.execute(
                select(Product_ratings).where(getattr(Product_ratings, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching product_ratings by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Product_ratings]:
        """Get list of product_ratingss filtered by field"""
        try:
            if not hasattr(Product_ratings, field_name):
                raise ValueError(f"Field {field_name} does not exist on Product_ratings")
            result = await self.db.execute(
                select(Product_ratings)
                .where(getattr(Product_ratings, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Product_ratings.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching product_ratingss by {field_name}: {str(e)}")
            raise