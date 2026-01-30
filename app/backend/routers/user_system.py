"""
User system API routes for managing user profiles and experience
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.user_system import UserSystemService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/user_system", tags=["user_system"])


class UpdateUsernameRequest(BaseModel):
    username: str


class UpdateAvatarRequest(BaseModel):
    avatar_url: str


class AddExperienceRequest(BaseModel):
    action_type: str
    custom_exp: int = None
    points: int = 0


@router.get("/profile")
async def get_user_profile(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile"""
    try:
        service = UserSystemService(db)
        profile = await service.get_or_create_user_profile(current_user.id)
        
        return {
            'user_id': profile.user_id,
            'username': profile.username,
            'avatar_url': profile.avatar_url,
            'experience': profile.experience,
            'level': profile.level,
            'points': profile.points,
            'created_at': profile.created_at
        }
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/username")
async def update_username(
    data: UpdateUsernameRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update username"""
    try:
        if not data.username or len(data.username.strip()) == 0:
            raise HTTPException(status_code=400, detail="用户名不能为空")
        
        if len(data.username) > 50:
            raise HTTPException(status_code=400, detail="用户名过长")
        
        service = UserSystemService(db)
        profile = await service.get_or_create_user_profile(current_user.id)
        profile.username = data.username.strip()
        
        await db.commit()
        
        return {
            'success': True,
            'message': '用户名更新成功'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating username: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/avatar")
async def update_avatar(
    data: UpdateAvatarRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update avatar URL"""
    try:
        service = UserSystemService(db)
        profile = await service.get_or_create_user_profile(current_user.id)
        profile.avatar_url = data.avatar_url
        
        await db.commit()
        
        return {
            'success': True,
            'message': '头像更新成功'
        }
    except Exception as e:
        logger.error(f"Error updating avatar: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experience")
async def add_experience(
    data: AddExperienceRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add experience and points to user"""
    try:
        service = UserSystemService(db)
        
        # Special case: check inspector eligibility
        if data.action_type == 'check_inspector':
            eligibility = await service.check_inspector_eligibility(current_user.id)
            return eligibility
        
        result = await service.add_experience(
            user_id=current_user.id,
            action_type=data.action_type,
            custom_exp=data.custom_exp,
            points=data.points
        )
        
        return result
    except Exception as e:
        logger.error(f"Error adding experience: {e}")
        raise HTTPException(status_code=500, detail=str(e))