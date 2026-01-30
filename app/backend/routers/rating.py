"""
Product and shop rating API routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from models.product_ratings import Product_ratings
from models.shop_ratings import Shop_ratings
from models.orders import Orders
from models.order_items import Order_items
from models.products import Products
from services.user_system import UserSystemService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ratings", tags=["ratings"])


class ProductRatingRequest(BaseModel):
    product_id: int
    rating: int
    comment: str = ""


class ShopRatingRequest(BaseModel):
    shop_id: int
    rating: int
    comment: str = ""


@router.post("/product")
async def create_product_rating(
    data: ProductRatingRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a product rating (must have purchased)"""
    try:
        if data.rating < 1 or data.rating > 5:
            raise HTTPException(status_code=400, detail="评分必须在1-5之间")
        
        # Check if user has purchased this product
        result = await db.execute(
            select(Order_items)
            .join(Orders, Order_items.order_id == Orders.id)
            .where(
                Orders.user_id == current_user.id,
                Order_items.product_id == data.product_id,
                Orders.status.in_(['paid', 'completed'])
            )
        )
        order_item = result.scalar_one_or_none()
        
        if not order_item:
            raise HTTPException(status_code=403, detail="您还没有购买过该商品")
        
        # Check if already rated
        result = await db.execute(
            select(Product_ratings).where(
                Product_ratings.user_id == current_user.id,
                Product_ratings.product_id == data.product_id
            )
        )
        existing_rating = result.scalar_one_or_none()
        
        if existing_rating:
            raise HTTPException(status_code=400, detail="您已经评价过该商品")
        
        # Create rating
        rating = Product_ratings(
            product_id=data.product_id,
            user_id=current_user.id,
            rating=data.rating,
            comment=data.comment,
            created_at=UserSystemService._get_current_time(None)
        )
        db.add(rating)
        await db.commit()
        
        return {
            'success': True,
            'message': '评价成功'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating product rating: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product/{product_id}")
async def get_product_ratings(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all ratings for a product"""
    try:
        # Get all ratings
        result = await db.execute(
            select(Product_ratings)
            .where(Product_ratings.product_id == product_id)
            .order_by(Product_ratings.created_at.desc())
        )
        ratings = result.scalars().all()
        
        # Calculate average
        if ratings:
            avg_rating = sum(r.rating for r in ratings) / len(ratings)
        else:
            avg_rating = 0
        
        return {
            'average_rating': round(avg_rating, 1),
            'total_count': len(ratings),
            'ratings': [
                {
                    'id': r.id,
                    'rating': r.rating,
                    'comment': r.comment,
                    'created_at': r.created_at
                }
                for r in ratings
            ]
        }
    except Exception as e:
        logger.error(f"Error getting product ratings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/shop")
async def create_shop_rating(
    data: ShopRatingRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a shop rating (must have purchased from shop)"""
    try:
        if data.rating < 1 or data.rating > 5:
            raise HTTPException(status_code=400, detail="评分必须在1-5之间")
        
        # Check if user has purchased from this shop
        result = await db.execute(
            select(Orders).where(
                Orders.user_id == current_user.id,
                Orders.shop_id == data.shop_id,
                Orders.status.in_(['paid', 'completed'])
            )
        )
        order = result.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=403, detail="您还没有在该店铺购买过商品")
        
        # Check if already rated
        result = await db.execute(
            select(Shop_ratings).where(
                Shop_ratings.user_id == current_user.id,
                Shop_ratings.shop_id == data.shop_id
            )
        )
        existing_rating = result.scalar_one_or_none()
        
        if existing_rating:
            raise HTTPException(status_code=400, detail="您已经评价过该店铺")
        
        # Create rating
        rating = Shop_ratings(
            shop_id=data.shop_id,
            user_id=current_user.id,
            rating=data.rating,
            comment=data.comment,
            created_at=UserSystemService._get_current_time(None)
        )
        db.add(rating)
        await db.commit()
        
        return {
            'success': True,
            'message': '评价成功'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating shop rating: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/shop/{shop_id}")
async def get_shop_ratings(
    shop_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all ratings for a shop"""
    try:
        # Get all ratings
        result = await db.execute(
            select(Shop_ratings)
            .where(Shop_ratings.shop_id == shop_id)
            .order_by(Shop_ratings.created_at.desc())
        )
        ratings = result.scalars().all()
        
        # Calculate average
        if ratings:
            avg_rating = sum(r.rating for r in ratings) / len(ratings)
        else:
            avg_rating = 0
        
        return {
            'average_rating': round(avg_rating, 1),
            'total_count': len(ratings),
            'ratings': [
                {
                    'id': r.id,
                    'rating': r.rating,
                    'comment': r.comment,
                    'created_at': r.created_at
                }
                for r in ratings
            ]
        }
    except Exception as e:
        logger.error(f"Error getting shop ratings: {e}")
        raise HTTPException(status_code=500, detail=str(e))