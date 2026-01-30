import json
import logging
from typing import List, Optional


from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.order_logistics import Order_logisticsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/order_logistics", tags=["order_logistics"])


# ---------- Pydantic Schemas ----------
class Order_logisticsData(BaseModel):
    """Entity data schema (for create/update)"""
    order_id: int
    tracking_number: str = None
    carrier: str = None
    status: str
    current_location: str = None
    updated_at: str = None


class Order_logisticsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    order_id: Optional[int] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    status: Optional[str] = None
    current_location: Optional[str] = None
    updated_at: Optional[str] = None


class Order_logisticsResponse(BaseModel):
    """Entity response schema"""
    id: int
    order_id: int
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    status: str
    current_location: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class Order_logisticsListResponse(BaseModel):
    """List response schema"""
    items: List[Order_logisticsResponse]
    total: int
    skip: int
    limit: int


class Order_logisticsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Order_logisticsData]


class Order_logisticsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Order_logisticsUpdateData


class Order_logisticsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Order_logisticsBatchUpdateItem]


class Order_logisticsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Order_logisticsListResponse)
async def query_order_logisticss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query order_logisticss with filtering, sorting, and pagination"""
    logger.debug(f"Querying order_logisticss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Order_logisticsService(db)
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
        logger.debug(f"Found {result['total']} order_logisticss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying order_logisticss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Order_logisticsListResponse)
async def query_order_logisticss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query order_logisticss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying order_logisticss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Order_logisticsService(db)
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
        logger.debug(f"Found {result['total']} order_logisticss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying order_logisticss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Order_logisticsResponse)
async def get_order_logistics(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single order_logistics by ID"""
    logger.debug(f"Fetching order_logistics with id: {id}, fields={fields}")
    
    service = Order_logisticsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Order_logistics with id {id} not found")
            raise HTTPException(status_code=404, detail="Order_logistics not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching order_logistics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Order_logisticsResponse, status_code=201)
async def create_order_logistics(
    data: Order_logisticsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new order_logistics"""
    logger.debug(f"Creating new order_logistics with data: {data}")
    
    service = Order_logisticsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create order_logistics")
        
        logger.info(f"Order_logistics created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating order_logistics: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating order_logistics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Order_logisticsResponse], status_code=201)
async def create_order_logisticss_batch(
    request: Order_logisticsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple order_logisticss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} order_logisticss")
    
    service = Order_logisticsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} order_logisticss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Order_logisticsResponse])
async def update_order_logisticss_batch(
    request: Order_logisticsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple order_logisticss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} order_logisticss")
    
    service = Order_logisticsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} order_logisticss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Order_logisticsResponse)
async def update_order_logistics(
    id: int,
    data: Order_logisticsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing order_logistics"""
    logger.debug(f"Updating order_logistics {id} with data: {data}")

    service = Order_logisticsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Order_logistics with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Order_logistics not found")
        
        logger.info(f"Order_logistics {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating order_logistics {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating order_logistics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_order_logisticss_batch(
    request: Order_logisticsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple order_logisticss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} order_logisticss")
    
    service = Order_logisticsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} order_logisticss successfully")
        return {"message": f"Successfully deleted {deleted_count} order_logisticss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_order_logistics(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single order_logistics by ID"""
    logger.debug(f"Deleting order_logistics with id: {id}")
    
    service = Order_logisticsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Order_logistics with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Order_logistics not found")
        
        logger.info(f"Order_logistics {id} deleted successfully")
        return {"message": "Order_logistics deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting order_logistics {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")