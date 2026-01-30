import logging
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/migration", tags=["migration"])

@router.post("/add_shop_id_column")
async def add_shop_id_column(db: AsyncSession = Depends(get_db)):
    """Add shop_id column to products table"""
    try:
        # Check if column exists
        result = await db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='products' AND column_name='shop_id'
        """))
        
        if result.fetchone() is None:
            # Add shop_id column with default value 1
            await db.execute(text("""
                ALTER TABLE products 
                ADD COLUMN shop_id INTEGER DEFAULT 1 NOT NULL
            """))
            
            # Update existing products with shop_id
            await db.execute(text("""
                UPDATE products 
                SET shop_id = CASE 
                    WHEN id % 2 = 1 THEN 1 
                    ELSE 2 
                END
            """))
            
            await db.commit()
            
            return {
                "success": True,
                "message": "shop_id column added successfully"
            }
        else:
            return {
                "success": True,
                "message": "shop_id column already exists"
            }
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        await db.rollback()
        return {
            "success": False,
            "message": f"Migration failed: {str(e)}"
        }