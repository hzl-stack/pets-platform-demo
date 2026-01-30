"""
Order logistics API routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from models.order_logistics import Order_logistics
from models.orders import Orders
from models.shops_v2 import Shops_v2
from services.user_system import UserSystemService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/logistics", tags=["logistics"])


class CreateLogisticsRequest(BaseModel):
    order_id: int
    tracking_number: str
    carrier: str


class UpdateLogisticsRequest(BaseModel):
    status: str
    current_location: str = ""


@router.post("")
async def create_logistics(
    data: CreateLogisticsRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create logistics information for an order (seller only)"""
    try:
        # Get order
        result = await db.execute(
            select(Orders).where(Orders.id == data.order_id)
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="订单不存在")
        
        # Check if user owns the shop
        result = await db.execute(
            select(Shops_v2).where(
                Shops_v2.id == order.shop_id,
                Shops_v2.user_id == current_user.id
            )
        )
        shop = result.scalar_one_or_none()
        
        if not shop:
            raise HTTPException(status_code=403, detail="只有商家可以添加物流信息")
        
        # Check if logistics already exists
        result = await db.execute(
            select(Order_logistics).where(Order_logistics.order_id == data.order_id)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(status_code=400, detail="该订单已有物流信息")
        
        # Create logistics
        logistics = Order_logistics(
            order_id=data.order_id,
            tracking_number=data.tracking_number,
            carrier=data.carrier,
            status='shipped',
            current_location='',
            updated_at=UserSystemService._get_current_time(None)
        )
        db.add(logistics)
        
        # Update order status
        order.status = 'shipped'
        
        await db.commit()
        
        return {
            'success': True,
            'message': '物流信息添加成功'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating logistics: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/order/{order_id}")
async def get_logistics_by_order(
    order_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get logistics information for an order"""
    try:
        # Get order
        result = await db.execute(
            select(Orders).where(Orders.id == order_id)
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="订单不存在")
        
        # Check if user owns the order or the shop
        result = await db.execute(
            select(Shops_v2).where(Shops_v2.id == order.shop_id)
        )
        shop = result.scalar_one_or_none()
        
        if order.user_id != current_user.id and (not shop or shop.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="无权查看该订单物流")
        
        # Get logistics
        result = await db.execute(
            select(Order_logistics).where(Order_logistics.order_id == order_id)
        )
        logistics = result.scalar_one_or_none()
        
        if not logistics:
            return {
                'exists': False,
                'message': '暂无物流信息'
            }
        
        return {
            'exists': True,
            'id': logistics.id,
            'order_id': logistics.order_id,
            'tracking_number': logistics.tracking_number,
            'carrier': logistics.carrier,
            'status': logistics.status,
            'current_location': logistics.current_location,
            'updated_at': logistics.updated_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting logistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{logistics_id}")
async def update_logistics(
    logistics_id: int,
    data: UpdateLogisticsRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update logistics status (seller only)"""
    try:
        # Get logistics
        result = await db.execute(
            select(Order_logistics).where(Order_logistics.id == logistics_id)
        )
        logistics = result.scalar_one_or_none()
        
        if not logistics:
            raise HTTPException(status_code=404, detail="物流信息不存在")
        
        # Get order and check ownership
        result = await db.execute(
            select(Orders).where(Orders.id == logistics.order_id)
        )
        order = result.scalar_one_or_none()
        
        result = await db.execute(
            select(Shops_v2).where(
                Shops_v2.id == order.shop_id,
                Shops_v2.user_id == current_user.id
            )
        )
        shop = result.scalar_one_or_none()
        
        if not shop:
            raise HTTPException(status_code=403, detail="只有商家可以更新物流信息")
        
        # Update logistics
        logistics.status = data.status
        logistics.current_location = data.current_location
        logistics.updated_at = UserSystemService._get_current_time(None)
        
        # Update order status if delivered
        if data.status == 'delivered':
            order.status = 'completed'
        
        await db.commit()
        
        return {
            'success': True,
            'message': '物流信息更新成功'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating logistics: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))