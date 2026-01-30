"""
Shop review API routes for inspector team
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from models.shop_reviews import Shop_reviews
from models.shops_v2 import Shops_v2
from models.inspectors import Inspectors
from services.user_system import UserSystemService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/shop-reviews", tags=["shop_reviews"])


class ReviewDecisionRequest(BaseModel):
    review_comment: Optional[str] = ""


@router.get("/pending")
async def get_pending_shop_reviews(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all pending shop reviews (inspector only)"""
    try:
        # Check if user is inspector
        result = await db.execute(
            select(Inspectors).where(Inspectors.user_id == current_user.id)
        )
        inspector = result.scalar_one_or_none()
        
        if not inspector:
            raise HTTPException(status_code=403, detail="只有检察团成员可以访问")
        
        # Get pending shops
        result = await db.execute(
            select(Shops_v2).where(Shops_v2.status == 'pending')
        )
        pending_shops = result.scalars().all()
        
        return {
            'items': [
                {
                    'id': shop.id,
                    'shop_name': shop.shop_name,
                    'description': shop.description,
                    'logo_url': shop.logo_url,
                    'user_id': shop.user_id,
                    'created_at': shop.created_at
                }
                for shop in pending_shops
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting pending shop reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{shop_id}/approve")
async def approve_shop(
    shop_id: int,
    data: ReviewDecisionRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve a shop application"""
    try:
        # Check if user is inspector
        result = await db.execute(
            select(Inspectors).where(Inspectors.user_id == current_user.id)
        )
        inspector = result.scalar_one_or_none()
        
        if not inspector:
            raise HTTPException(status_code=403, detail="只有检察团成员可以审核")
        
        # Get shop
        result = await db.execute(
            select(Shops_v2).where(Shops_v2.id == shop_id)
        )
        shop = result.scalar_one_or_none()
        
        if not shop:
            raise HTTPException(status_code=404, detail="店铺不存在")
        
        if shop.status != 'pending':
            raise HTTPException(status_code=400, detail="该店铺已经审核过了")
        
        # Update shop status
        shop.status = 'approved'
        
        # Create review record
        review = Shop_reviews(
            shop_id=shop_id,
            applicant_id=shop.user_id,
            reviewer_id=current_user.id,
            status='approved',
            review_comment=data.review_comment or "审核通过",
            created_at=UserSystemService._get_current_time(None)
        )
        db.add(review)
        
        await db.commit()
        
        return {
            'success': True,
            'message': '审核通过'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving shop: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{shop_id}/reject")
async def reject_shop(
    shop_id: int,
    data: ReviewDecisionRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reject a shop application"""
    try:
        # Check if user is inspector
        result = await db.execute(
            select(Inspectors).where(Inspectors.user_id == current_user.id)
        )
        inspector = result.scalar_one_or_none()
        
        if not inspector:
            raise HTTPException(status_code=403, detail="只有检察团成员可以审核")
        
        # Get shop
        result = await db.execute(
            select(Shops_v2).where(Shops_v2.id == shop_id)
        )
        shop = result.scalar_one_or_none()
        
        if not shop:
            raise HTTPException(status_code=404, detail="店铺不存在")
        
        if shop.status != 'pending':
            raise HTTPException(status_code=400, detail="该店铺已经审核过了")
        
        # Update shop status
        shop.status = 'rejected'
        
        # Create review record
        review = Shop_reviews(
            shop_id=shop_id,
            applicant_id=shop.user_id,
            reviewer_id=current_user.id,
            status='rejected',
            review_comment=data.review_comment or "审核未通过",
            created_at=UserSystemService._get_current_time(None)
        )
        db.add(review)
        
        await db.commit()
        
        return {
            'success': True,
            'message': '已拒绝'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting shop: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))