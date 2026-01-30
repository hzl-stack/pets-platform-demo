import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.product_ratings import Product_ratingsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/product_ratings", tags=["product_ratings"])


# ---------- Pydantic Schemas ----------
class Product_ratingsData(BaseModel):
    """Entity data schema (for create/update)"""
    product_id: int
    rating: int
    comment: str = None
    created_at: str = None


class Product_ratingsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    product_id: Optional[int] = None
    rating: Optional[int] = None
    comment: Optional[str] = None
    created_at: Optional[str] = None


class Product_ratingsResponse(BaseModel):
    """Entity response schema"""
    id: int
    product_id: int
    user_id: str
    rating: int
    comment: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Product_ratingsListResponse(BaseModel):
    """List response schema"""
    items: List[Product_ratingsResponse]
    total: int
    skip: int
    limit: int


class Product_ratingsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Product_ratingsData]


class Product_ratingsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Product_ratingsUpdateData


class Product_ratingsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Product_ratingsBatchUpdateItem]


class Product_ratingsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Product_ratingsListResponse)
async def query_product_ratingss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query product_ratingss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying product_ratingss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Product_ratingsService(db)
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
        logger.debug(f"Found {result['total']} product_ratingss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying product_ratingss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Product_ratingsListResponse)
async def query_product_ratingss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query product_ratingss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying product_ratingss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Product_ratingsService(db)
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
        logger.debug(f"Found {result['total']} product_ratingss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying product_ratingss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Product_ratingsResponse)
async def get_product_ratings(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single product_ratings by ID (user can only see their own records)"""
    logger.debug(f"Fetching product_ratings with id: {id}, fields={fields}")
    
    service = Product_ratingsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Product_ratings with id {id} not found")
            raise HTTPException(status_code=404, detail="Product_ratings not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product_ratings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Product_ratingsResponse, status_code=201)
async def create_product_ratings(
    data: Product_ratingsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product_ratings"""
    logger.debug(f"Creating new product_ratings with data: {data}")
    
    service = Product_ratingsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create product_ratings")
        
        logger.info(f"Product_ratings created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating product_ratings: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating product_ratings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Product_ratingsResponse], status_code=201)
async def create_product_ratingss_batch(
    request: Product_ratingsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple product_ratingss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} product_ratingss")
    
    service = Product_ratingsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} product_ratingss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Product_ratingsResponse])
async def update_product_ratingss_batch(
    request: Product_ratingsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple product_ratingss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} product_ratingss")
    
    service = Product_ratingsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} product_ratingss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Product_ratingsResponse)
async def update_product_ratings(
    id: int,
    data: Product_ratingsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing product_ratings (requires ownership)"""
    logger.debug(f"Updating product_ratings {id} with data: {data}")

    service = Product_ratingsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Product_ratings with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Product_ratings not found")
        
        logger.info(f"Product_ratings {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating product_ratings {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating product_ratings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_product_ratingss_batch(
    request: Product_ratingsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple product_ratingss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} product_ratingss")
    
    service = Product_ratingsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} product_ratingss successfully")
        return {"message": f"Successfully deleted {deleted_count} product_ratingss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_product_ratings(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single product_ratings by ID (requires ownership)"""
    logger.debug(f"Deleting product_ratings with id: {id}")
    
    service = Product_ratingsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Product_ratings with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Product_ratings not found")
        
        logger.info(f"Product_ratings {id} deleted successfully")
        return {"message": "Product_ratings deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product_ratings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")