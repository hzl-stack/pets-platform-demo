import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.post_reviews import Post_reviewsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/post_reviews", tags=["post_reviews"])


# ---------- Pydantic Schemas ----------
class Post_reviewsData(BaseModel):
    """Entity data schema (for create/update)"""
    post_id: int
    reviewer_id: str
    status: str
    review_comment: str = None
    created_at: str = None


class Post_reviewsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    post_id: Optional[int] = None
    reviewer_id: Optional[str] = None
    status: Optional[str] = None
    review_comment: Optional[str] = None
    created_at: Optional[str] = None


class Post_reviewsResponse(BaseModel):
    """Entity response schema"""
    id: int
    post_id: int
    reviewer_id: str
    status: str
    review_comment: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Post_reviewsListResponse(BaseModel):
    """List response schema"""
    items: List[Post_reviewsResponse]
    total: int
    skip: int
    limit: int


class Post_reviewsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Post_reviewsData]


class Post_reviewsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Post_reviewsUpdateData


class Post_reviewsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Post_reviewsBatchUpdateItem]


class Post_reviewsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Post_reviewsListResponse)
async def query_post_reviewss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query post_reviewss with filtering, sorting, and pagination"""
    logger.debug(f"Querying post_reviewss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Post_reviewsService(db)
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
        logger.debug(f"Found {result['total']} post_reviewss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying post_reviewss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Post_reviewsListResponse)
async def query_post_reviewss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query post_reviewss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying post_reviewss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Post_reviewsService(db)
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
        logger.debug(f"Found {result['total']} post_reviewss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying post_reviewss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Post_reviewsResponse)
async def get_post_reviews(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single post_reviews by ID"""
    logger.debug(f"Fetching post_reviews with id: {id}, fields={fields}")
    
    service = Post_reviewsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Post_reviews with id {id} not found")
            raise HTTPException(status_code=404, detail="Post_reviews not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching post_reviews {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Post_reviewsResponse, status_code=201)
async def create_post_reviews(
    data: Post_reviewsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new post_reviews"""
    logger.debug(f"Creating new post_reviews with data: {data}")
    
    service = Post_reviewsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create post_reviews")
        
        logger.info(f"Post_reviews created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating post_reviews: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating post_reviews: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Post_reviewsResponse], status_code=201)
async def create_post_reviewss_batch(
    request: Post_reviewsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple post_reviewss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} post_reviewss")
    
    service = Post_reviewsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} post_reviewss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Post_reviewsResponse])
async def update_post_reviewss_batch(
    request: Post_reviewsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple post_reviewss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} post_reviewss")
    
    service = Post_reviewsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} post_reviewss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Post_reviewsResponse)
async def update_post_reviews(
    id: int,
    data: Post_reviewsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing post_reviews"""
    logger.debug(f"Updating post_reviews {id} with data: {data}")

    service = Post_reviewsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Post_reviews with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Post_reviews not found")
        
        logger.info(f"Post_reviews {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating post_reviews {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating post_reviews {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_post_reviewss_batch(
    request: Post_reviewsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple post_reviewss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} post_reviewss")
    
    service = Post_reviewsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} post_reviewss successfully")
        return {"message": f"Successfully deleted {deleted_count} post_reviewss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_post_reviews(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single post_reviews by ID"""
    logger.debug(f"Deleting post_reviews with id: {id}")
    
    service = Post_reviewsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Post_reviews with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Post_reviews not found")
        
        logger.info(f"Post_reviews {id} deleted successfully")
        return {"message": "Post_reviews deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting post_reviews {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")