import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.order_logistics import Order_logistics

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Order_logisticsService:
    """Service layer for Order_logistics operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Order_logistics]:
        """Create a new order_logistics"""
        try:
            obj = Order_logistics(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created order_logistics with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating order_logistics: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Order_logistics]:
        """Get order_logistics by ID"""
        try:
            query = select(Order_logistics).where(Order_logistics.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching order_logistics {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of order_logisticss"""
        try:
            query = select(Order_logistics)
            count_query = select(func.count(Order_logistics.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Order_logistics, field):
                        query = query.where(getattr(Order_logistics, field) == value)
                        count_query = count_query.where(getattr(Order_logistics, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Order_logistics, field_name):
                        query = query.order_by(getattr(Order_logistics, field_name).desc())
                else:
                    if hasattr(Order_logistics, sort):
                        query = query.order_by(getattr(Order_logistics, sort))
            else:
                query = query.order_by(Order_logistics.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching order_logistics list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Order_logistics]:
        """Update order_logistics"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Order_logistics {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated order_logistics {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating order_logistics {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete order_logistics"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Order_logistics {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted order_logistics {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting order_logistics {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Order_logistics]:
        """Get order_logistics by any field"""
        try:
            if not hasattr(Order_logistics, field_name):
                raise ValueError(f"Field {field_name} does not exist on Order_logistics")
            result = await self.db.execute(
                select(Order_logistics).where(getattr(Order_logistics, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching order_logistics by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Order_logistics]:
        """Get list of order_logisticss filtered by field"""
        try:
            if not hasattr(Order_logistics, field_name):
                raise ValueError(f"Field {field_name} does not exist on Order_logistics")
            result = await self.db.execute(
                select(Order_logistics)
                .where(getattr(Order_logistics, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Order_logistics.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching order_logisticss by {field_name}: {str(e)}")
            raise