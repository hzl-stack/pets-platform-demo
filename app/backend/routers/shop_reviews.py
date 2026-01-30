import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.shop_reviews import Shop_reviewsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/shop_reviews", tags=["shop_reviews"])


# ---------- Pydantic Schemas ----------
class Shop_reviewsData(BaseModel):
    """Entity data schema (for create/update)"""
    shop_id: int
    applicant_id: str
    reviewer_id: str
    status: str
    review_comment: str = None
    created_at: str = None


class Shop_reviewsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    shop_id: Optional[int] = None
    applicant_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    status: Optional[str] = None
    review_comment: Optional[str] = None
    created_at: Optional[str] = None


class Shop_reviewsResponse(BaseModel):
    """Entity response schema"""
    id: int
    shop_id: int
    applicant_id: str
    reviewer_id: str
    status: str
    review_comment: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Shop_reviewsListResponse(BaseModel):
    """List response schema"""
    items: List[Shop_reviewsResponse]
    total: int
    skip: int
    limit: int


class Shop_reviewsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Shop_reviewsData]


class Shop_reviewsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Shop_reviewsUpdateData


class Shop_reviewsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Shop_reviewsBatchUpdateItem]


class Shop_reviewsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Shop_reviewsListResponse)
async def query_shop_reviewss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query shop_reviewss with filtering, sorting, and pagination"""
    logger.debug(f"Querying shop_reviewss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Shop_reviewsService(db)
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
        )
        logger.debug(f"Found {result['total']} shop_reviewss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shop_reviewss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Shop_reviewsListResponse)
async def query_shop_reviewss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query shop_reviewss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying shop_reviewss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Shop_reviewsService(db)
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
        logger.debug(f"Found {result['total']} shop_reviewss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shop_reviewss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Shop_reviewsResponse)
async def get_shop_reviews(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single shop_reviews by ID"""
    logger.debug(f"Fetching shop_reviews with id: {id}, fields={fields}")
    
    service = Shop_reviewsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Shop_reviews with id {id} not found")
            raise HTTPException(status_code=404, detail="Shop_reviews not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shop_reviews {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Shop_reviewsResponse, status_code=201)
async def create_shop_reviews(
    data: Shop_reviewsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new shop_reviews"""
    logger.debug(f"Creating new shop_reviews with data: {data}")
    
    service = Shop_reviewsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create shop_reviews")
        
        logger.info(f"Shop_reviews created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating shop_reviews: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating shop_reviews: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Shop_reviewsResponse], status_code=201)
async def create_shop_reviewss_batch(
    request: Shop_reviewsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple shop_reviewss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} shop_reviewss")
    
    service = Shop_reviewsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} shop_reviewss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Shop_reviewsResponse])
async def update_shop_reviewss_batch(
    request: Shop_reviewsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple shop_reviewss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} shop_reviewss")
    
    service = Shop_reviewsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} shop_reviewss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Shop_reviewsResponse)
async def update_shop_reviews(
    id: int,
    data: Shop_reviewsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing shop_reviews"""
    logger.debug(f"Updating shop_reviews {id} with data: {data}")

    service = Shop_reviewsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Shop_reviews with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Shop_reviews not found")
        
        logger.info(f"Shop_reviews {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating shop_reviews {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating shop_reviews {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_shop_reviewss_batch(
    request: Shop_reviewsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple shop_reviewss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} shop_reviewss")
    
    service = Shop_reviewsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} shop_reviewss successfully")
        return {"message": f"Successfully deleted {deleted_count} shop_reviewss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_shop_reviews(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single shop_reviews by ID"""
    logger.debug(f"Deleting shop_reviews with id: {id}")
    
    service = Shop_reviewsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Shop_reviews with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Shop_reviews not found")
        
        logger.info(f"Shop_reviews {id} deleted successfully")
        return {"message": "Shop_reviews deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shop_reviews {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")