import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.review_tasks import Review_tasksService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/review_tasks", tags=["review_tasks"])


# ---------- Pydantic Schemas ----------
class Review_tasksData(BaseModel):
    """Entity data schema (for create/update)"""
    task_type: str
    target_id: int
    assigned_to: str = None
    status: str = None
    created_at: str = None


class Review_tasksUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    task_type: Optional[str] = None
    target_id: Optional[int] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


class Review_tasksResponse(BaseModel):
    """Entity response schema"""
    id: int
    task_type: str
    target_id: int
    assigned_to: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Review_tasksListResponse(BaseModel):
    """List response schema"""
    items: List[Review_tasksResponse]
    total: int
    skip: int
    limit: int


class Review_tasksBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Review_tasksData]


class Review_tasksBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Review_tasksUpdateData


class Review_tasksBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Review_tasksBatchUpdateItem]


class Review_tasksBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Review_tasksListResponse)
async def query_review_taskss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query review_taskss with filtering, sorting, and pagination"""
    logger.debug(f"Querying review_taskss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Review_tasksService(db)
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
        logger.debug(f"Found {result['total']} review_taskss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying review_taskss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Review_tasksListResponse)
async def query_review_taskss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query review_taskss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying review_taskss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Review_tasksService(db)
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
        logger.debug(f"Found {result['total']} review_taskss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying review_taskss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Review_tasksResponse)
async def get_review_tasks(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single review_tasks by ID"""
    logger.debug(f"Fetching review_tasks with id: {id}, fields={fields}")
    
    service = Review_tasksService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Review_tasks with id {id} not found")
            raise HTTPException(status_code=404, detail="Review_tasks not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching review_tasks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Review_tasksResponse, status_code=201)
async def create_review_tasks(
    data: Review_tasksData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new review_tasks"""
    logger.debug(f"Creating new review_tasks with data: {data}")
    
    service = Review_tasksService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create review_tasks")
        
        logger.info(f"Review_tasks created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating review_tasks: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating review_tasks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Review_tasksResponse], status_code=201)
async def create_review_taskss_batch(
    request: Review_tasksBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple review_taskss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} review_taskss")
    
    service = Review_tasksService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} review_taskss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Review_tasksResponse])
async def update_review_taskss_batch(
    request: Review_tasksBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple review_taskss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} review_taskss")
    
    service = Review_tasksService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} review_taskss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Review_tasksResponse)
async def update_review_tasks(
    id: int,
    data: Review_tasksUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing review_tasks"""
    logger.debug(f"Updating review_tasks {id} with data: {data}")

    service = Review_tasksService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Review_tasks with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Review_tasks not found")
        
        logger.info(f"Review_tasks {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating review_tasks {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating review_tasks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_review_taskss_batch(
    request: Review_tasksBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple review_taskss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} review_taskss")
    
    service = Review_tasksService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} review_taskss successfully")
        return {"message": f"Successfully deleted {deleted_count} review_taskss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_review_tasks(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single review_tasks by ID"""
    logger.debug(f"Deleting review_tasks with id: {id}")
    
    service = Review_tasksService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Review_tasks with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Review_tasks not found")
        
        logger.info(f"Review_tasks {id} deleted successfully")
        return {"message": "Review_tasks deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting review_tasks {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")