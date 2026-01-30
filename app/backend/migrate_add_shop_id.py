import asyncio
from sqlalchemy import text
from core.database import db_manager

async def add_shop_id_column():
    """Add shop_id column to products table"""
    # Initialize database
    await db_manager.init_db()
    
    async with db_manager.engine.begin() as conn:
        try:
            # Check if column exists
            result = await conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='products' AND column_name='shop_id'
            """))
            
            if result.fetchone() is None:
                # Add shop_id column with default value 1
                await conn.execute(text("""
                    ALTER TABLE products 
                    ADD COLUMN shop_id INTEGER DEFAULT 1 NOT NULL
                """))
                print("✓ Added shop_id column to products table")
                
                # Update existing products with shop_id
                await conn.execute(text("""
                    UPDATE products 
                    SET shop_id = CASE 
                        WHEN id % 2 = 1 THEN 1 
                        ELSE 2 
                    END
                """))
                print("✓ Updated existing products with shop_id")
            else:
                print("✓ shop_id column already exists")
                
        except Exception as e:
            print(f"✗ Migration failed: {e}")
            raise
    
    await db_manager.close_db()

if __name__ == "__main__":
    asyncio.run(add_shop_id_column())