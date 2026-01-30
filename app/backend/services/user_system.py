"""
User system service for handling experience, level, and points
"""
import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.users_extended import Users_extended
from models.experience_logs import Experience_logs
from core.database import get_db

logger = logging.getLogger(__name__)


class UserSystemService:
    """Service for user experience, level, and points management"""
    
    # Experience required per level (level 1 = 0 exp, level 2 = 100 exp, etc.)
    EXP_PER_LEVEL = 100
    
    # Experience rewards for different actions
    EXP_REWARDS = {
        'post_daily': 5,
        'post_help': 5,
        'comment': 2,
        'like': 1,
        'solve_help': 20,
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    @staticmethod
    def calculate_level(experience: int) -> int:
        """Calculate user level based on experience"""
        return max(1, (experience // UserSystemService.EXP_PER_LEVEL) + 1)
    
    async def get_or_create_user_profile(self, user_id: str) -> Users_extended:
        """Get user profile or create if not exists"""
        try:
            result = await self.db.execute(
                select(Users_extended).where(Users_extended.user_id == user_id)
            )
            user_profile = result.scalar_one_or_none()
            
            if not user_profile:
                # Create new user profile
                user_profile = Users_extended(
                    user_id=user_id,
                    username=f"User_{user_id[:8]}",
                    avatar_url="/images/UserAvatar.jpg",
                    experience=0,
                    level=1,
                    points=0,
                    created_at=self._get_current_time()
                )
                self.db.add(user_profile)
                await self.db.commit()
                await self.db.refresh(user_profile)
            
            return user_profile
        except Exception as e:
            logger.error(f"Error getting/creating user profile: {e}")
            await self.db.rollback()
            raise
    
    async def add_experience(
        self, 
        user_id: str, 
        action_type: str, 
        custom_exp: Optional[int] = None,
        points: int = 0
    ) -> Dict[str, Any]:
        """
        Add experience and points to user
        Returns: dict with level_up flag and new stats
        """
        try:
            user_profile = await self.get_or_create_user_profile(user_id)
            
            # Calculate experience to add
            exp_to_add = custom_exp if custom_exp is not None else self.EXP_REWARDS.get(action_type, 0)
            
            old_level = user_profile.level
            old_experience = user_profile.experience
            old_points = user_profile.points
            
            # Update experience and points
            user_profile.experience += exp_to_add
            user_profile.points += points
            
            # Recalculate level
            new_level = self.calculate_level(user_profile.experience)
            user_profile.level = new_level
            
            # Log the change
            exp_log = Experience_logs(
                user_id=user_id,
                action_type=action_type,
                experience_change=exp_to_add,
                points_change=points,
                created_at=self._get_current_time()
            )
            self.db.add(exp_log)
            
            await self.db.commit()
            await self.db.refresh(user_profile)
            
            return {
                'level_up': new_level > old_level,
                'old_level': old_level,
                'new_level': new_level,
                'experience': user_profile.experience,
                'points': user_profile.points,
                'exp_gained': exp_to_add,
                'points_gained': points
            }
        except Exception as e:
            logger.error(f"Error adding experience: {e}")
            await self.db.rollback()
            raise
    
    async def check_inspector_eligibility(self, user_id: str) -> Dict[str, Any]:
        """Check if user is eligible to become inspector"""
        user_profile = await self.get_or_create_user_profile(user_id)
        
        eligible = user_profile.level >= 5 and user_profile.points >= 100
        
        return {
            'eligible': eligible,
            'level': user_profile.level,
            'points': user_profile.points,
            'required_level': 5,
            'required_points': 100
        }
    
    async def update_username(self, user_id: str, new_username: str) -> Users_extended:
        """Update user's display name"""
        try:
            user_profile = await self.get_or_create_user_profile(user_id)
            user_profile.username = new_username
            await self.db.commit()
            await self.db.refresh(user_profile)
            return user_profile
        except Exception as e:
            logger.error(f"Error updating username: {e}")
            await self.db.rollback()
            raise
    
    async def update_avatar(self, user_id: str, avatar_url: str) -> Users_extended:
        """Update user's avatar"""
        try:
            user_profile = await self.get_or_create_user_profile(user_id)
            user_profile.avatar_url = avatar_url
            await self.db.commit()
            await self.db.refresh(user_profile)
            return user_profile
        except Exception as e:
            logger.error(f"Error updating avatar: {e}")
            await self.db.rollback()
            raise
    
    def _get_current_time(self) -> str:
        """Get current Shanghai time"""
        from datetime import datetime
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')