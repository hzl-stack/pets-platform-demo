"""
Inspector team API routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from models.inspectors import Inspectors
from models.review_tasks import Review_tasks
from models.posts_v2 import Posts_v2
from models.shops_v2 import Shops_v2
from services.user_system import UserSystemService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/inspectors", tags=["inspectors"])


@router.get("/me")
async def check_inspector_status(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if current user is an inspector"""
    try:
        result = await db.execute(
            select(Inspectors).where(Inspectors.user_id == current_user.id)
        )
        inspector = result.scalar_one_or_none()
        
        return {
            'is_inspector': inspector is not None,
            'appointed_at': inspector.appointed_at if inspector else None
        }
    except Exception as e:
        logger.error(f"Error checking inspector status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply")
async def apply_for_inspector(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Apply to become an inspector"""
    try:
        # Check eligibility
        service = UserSystemService(db)
        eligibility = await service.check_inspector_eligibility(current_user.id)
        
        if not eligibility['eligible']:
            raise HTTPException(
                status_code=403,
                detail=f"需要等级≥{eligibility['required_level']}且积分≥{eligibility['required_points']}"
            )
        
        # Check if already an inspector
        result = await db.execute(
            select(Inspectors).where(Inspectors.user_id == current_user.id)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            raise HTTPException(status_code=400, detail="您已经是检察团成员")
        
        # Create inspector (auto-approve for now)
        inspector = Inspectors(
            user_id=current_user.id,
            appointed_at=UserSystemService._get_current_time(None),
            appointed_by='system'
        )
        db.add(inspector)
        await db.commit()
        
        return {
            'success': True,
            'message': '恭喜您成为检察团成员！'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying for inspector: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks")
async def get_review_tasks(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all pending review tasks (inspector only)"""
    try:
        # Check if user is inspector
        result = await db.execute(
            select(Inspectors).where(Inspectors.user_id == current_user.id)
        )
        inspector = result.scalar_one_or_none()
        
        if not inspector:
            raise HTTPException(status_code=403, detail="只有检察团成员可以访问")
        
        # Get pending posts
        result = await db.execute(
            select(Posts_v2).where(
                Posts_v2.post_type == 'help',
                Posts_v2.review_status == 'pending'
            )
        )
        pending_posts = result.scalars().all()
        
        # Get pending shops
        result = await db.execute(
            select(Shops_v2).where(Shops_v2.status == 'pending')
        )
        pending_shops = result.scalars().all()
        
        return {
            'posts': [
                {
                    'id': post.id,
                    'content': post.content,
                    'reward_points': post.reward_points,
                    'created_at': post.created_at
                }
                for post in pending_posts
            ],
            'shops': [
                {
                    'id': shop.id,
                    'shop_name': shop.shop_name,
                    'description': shop.description,
                    'created_at': shop.created_at
                }
                for shop in pending_shops
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting review tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))