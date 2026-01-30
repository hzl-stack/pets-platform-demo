import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.users_extended import Users_extendedService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/users_extended", tags=["users_extended"])


# ---------- Pydantic Schemas ----------
class Users_extendedData(BaseModel):
    """Entity data schema (for create/update)"""
    username: str = None
    avatar_url: str = None
    experience: int = None
    level: int = None
    points: int = None
    created_at: str = None


class Users_extendedUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    experience: Optional[int] = None
    level: Optional[int] = None
    points: Optional[int] = None
    created_at: Optional[str] = None


class Users_extendedResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    experience: Optional[int] = None
    level: Optional[int] = None
    points: Optional[int] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Users_extendedListResponse(BaseModel):
    """List response schema"""
    items: List[Users_extendedResponse]
    total: int
    skip: int
    limit: int


class Users_extendedBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Users_extendedData]


class Users_extendedBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Users_extendedUpdateData


class Users_extendedBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Users_extendedBatchUpdateItem]


class Users_extendedBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Users_extendedListResponse)
async def query_users_extendeds(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query users_extendeds with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying users_extendeds: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Users_extendedService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} users_extendeds")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying users_extendeds: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Users_extendedListResponse)
async def query_users_extendeds_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query users_extendeds with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying users_extendeds: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Users_extendedService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} users_extendeds")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying users_extendeds: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Users_extendedResponse)
async def get_users_extended(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single users_extended by ID (user can only see their own records)"""
    logger.debug(f"Fetching users_extended with id: {id}, fields={fields}")
    
    service = Users_extendedService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Users_extended with id {id} not found")
            raise HTTPException(status_code=404, detail="Users_extended not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching users_extended {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Users_extendedResponse, status_code=201)
async def create_users_extended(
    data: Users_extendedData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new users_extended"""
    logger.debug(f"Creating new users_extended with data: {data}")
    
    service = Users_extendedService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create users_extended")
        
        logger.info(f"Users_extended created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating users_extended: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating users_extended: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Users_extendedResponse], status_code=201)
async def create_users_extendeds_batch(
    request: Users_extendedBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple users_extendeds in a single request"""
    logger.debug(f"Batch creating {len(request.items)} users_extendeds")
    
    service = Users_extendedService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} users_extendeds successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Users_extendedResponse])
async def update_users_extendeds_batch(
    request: Users_extendedBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple users_extendeds in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} users_extendeds")
    
    service = Users_extendedService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} users_extendeds successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Users_extendedResponse)
async def update_users_extended(
    id: int,
    data: Users_extendedUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing users_extended (requires ownership)"""
    logger.debug(f"Updating users_extended {id} with data: {data}")

    service = Users_extendedService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Users_extended with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Users_extended not found")
        
        logger.info(f"Users_extended {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating users_extended {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating users_extended {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_users_extendeds_batch(
    request: Users_extendedBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple users_extendeds by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} users_extendeds")
    
    service = Users_extendedService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} users_extendeds successfully")
        return {"message": f"Successfully deleted {deleted_count} users_extendeds", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_users_extended(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single users_extended by ID (requires ownership)"""
    logger.debug(f"Deleting users_extended with id: {id}")
    
    service = Users_extendedService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Users_extended with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Users_extended not found")
        
        logger.info(f"Users_extended {id} deleted successfully")
        return {"message": "Users_extended deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting users_extended {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")