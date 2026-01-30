"""
User system API routes
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

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
    custom_exp: Optional[int] = None
    points: int = 0


@router.get("/profile")
async def get_user_profile(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile with experience, level, and points"""
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
    """Update user's display name"""
    try:
        service = UserSystemService(db)
        profile = await service.update_username(current_user.id, data.username)
        
        return {
            'success': True,
            'username': profile.username
        }
    except Exception as e:
        logger.error(f"Error updating username: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/avatar")
async def update_avatar(
    data: UpdateAvatarRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user's avatar"""
    try:
        service = UserSystemService(db)
        profile = await service.update_avatar(current_user.id, data.avatar_url)
        
        return {
            'success': True,
            'avatar_url': profile.avatar_url
        }
    except Exception as e:
        logger.error(f"Error updating avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/experience")
async def add_experience(
    data: AddExperienceRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add experience and points to user (internal use)"""
    try:
        service = UserSystemService(db)
        result = await service.add_experience(
            current_user.id,
            data.action_type,
            data.custom_exp,
            data.points
        )
        
        return result
    except Exception as e:
        logger.error(f"Error adding experience: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inspector/eligibility")
async def check_inspector_eligibility(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Check if user is eligible to become inspector"""
    try:
        service = UserSystemService(db)
        result = await service.check_inspector_eligibility(current_user.id)
        
        return result
    except Exception as e:
        logger.error(f"Error checking inspector eligibility: {e}")
        raise HTTPException(status_code=500, detail=str(e))