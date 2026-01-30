import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.shops import ShopsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/shops", tags=["shops"])


# ---------- Pydantic Schemas ----------
class ShopsData(BaseModel):
    """Entity data schema (for create/update)"""
    shop_name: str
    description: str = None
    logo_url: str = None
    status: str
    created_at: str


class ShopsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    shop_name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


class ShopsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    shop_name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    status: str
    created_at: str

    class Config:
        from_attributes = True


class ShopsListResponse(BaseModel):
    """List response schema"""
    items: List[ShopsResponse]
    total: int
    skip: int
    limit: int


class ShopsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[ShopsData]


class ShopsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: ShopsUpdateData


class ShopsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[ShopsBatchUpdateItem]


class ShopsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=ShopsListResponse)
async def query_shopss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query shopss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying shopss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = ShopsService(db)
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
        logger.debug(f"Found {result['total']} shopss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shopss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=ShopsListResponse)
async def query_shopss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query shopss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying shopss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = ShopsService(db)
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
        logger.debug(f"Found {result['total']} shopss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shopss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=ShopsResponse)
async def get_shops(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single shops by ID (user can only see their own records)"""
    logger.debug(f"Fetching shops with id: {id}, fields={fields}")
    
    service = ShopsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shops with id {id} not found")
            raise HTTPException(status_code=404, detail="Shops not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shops {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=ShopsResponse, status_code=201)
async def create_shops(
    data: ShopsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new shops"""
    logger.debug(f"Creating new shops with data: {data}")
    
    service = ShopsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create shops")
        
        logger.info(f"Shops created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating shops: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating shops: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[ShopsResponse], status_code=201)
async def create_shopss_batch(
    request: ShopsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple shopss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} shopss")
    
    service = ShopsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} shopss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[ShopsResponse])
async def update_shopss_batch(
    request: ShopsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple shopss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} shopss")
    
    service = ShopsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} shopss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=ShopsResponse)
async def update_shops(
    id: int,
    data: ShopsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing shops (requires ownership)"""
    logger.debug(f"Updating shops {id} with data: {data}")

    service = ShopsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shops with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Shops not found")
        
        logger.info(f"Shops {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating shops {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating shops {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_shopss_batch(
    request: ShopsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple shopss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} shopss")
    
    service = ShopsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} shopss successfully")
        return {"message": f"Successfully deleted {deleted_count} shopss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_shops(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single shops by ID (requires ownership)"""
    logger.debug(f"Deleting shops with id: {id}")
    
    service = ShopsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Shops with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Shops not found")
        
        logger.info(f"Shops {id} deleted successfully")
        return {"message": "Shops deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shops {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")