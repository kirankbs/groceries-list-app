from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Categories Enum
class Category(str, Enum):
    PRODUCE = "Produce"
    DAIRY = "Dairy"
    MEAT = "Meat"
    BAKERY = "Bakery"
    BEVERAGES = "Beverages"
    SNACKS = "Snacks"
    FROZEN = "Frozen"
    PANTRY = "Pantry"
    HOUSEHOLD = "Household"
    OTHER = "Other"


# Define Models
class GroceryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    quantity: int = 1
    category: str = Category.OTHER.value
    checked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GroceryItemCreate(BaseModel):
    name: str
    quantity: int = 1
    category: str = Category.OTHER.value

class GroceryItemUpdate(BaseModel):
    checked: Optional[bool] = None
    name: Optional[str] = None
    quantity: Optional[int] = None
    category: Optional[str] = None

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Grocery Todo API"}

# Get available categories
@api_router.get("/categories")
async def get_categories():
    """Get all available categories"""
    return [cat.value for cat in Category]

# Grocery Routes
@api_router.get("/groceries", response_model=List[GroceryItem])
async def get_groceries(sort_by: str = "created_at", sort_order: str = "desc"):
    """Get all grocery items with optional sorting"""
    # Determine sort field
    sort_field = sort_by if sort_by in ["name", "created_at", "category"] else "created_at"
    sort_direction = -1 if sort_order == "desc" else 1
    
    items = await db.groceries.find().sort(sort_field, sort_direction).to_list(1000)
    return [GroceryItem(**item) for item in items]

@api_router.post("/groceries", response_model=GroceryItem)
async def create_grocery(input: GroceryItemCreate):
    """Create a new grocery item"""
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Item name cannot be empty")
    
    # Validate quantity
    quantity = max(1, input.quantity) if input.quantity else 1
    
    # Validate category
    valid_categories = [cat.value for cat in Category]
    category = input.category if input.category in valid_categories else Category.OTHER.value
    
    item = GroceryItem(
        name=input.name.strip(),
        quantity=quantity,
        category=category
    )
    await db.groceries.insert_one(item.dict())
    return item

@api_router.put("/groceries/{item_id}", response_model=GroceryItem)
async def update_grocery(item_id: str, input: GroceryItemUpdate):
    """Update a grocery item"""
    existing = await db.groceries.find_one({"id": item_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = {}
    if input.checked is not None:
        update_data["checked"] = input.checked
    if input.name is not None:
        if not input.name.strip():
            raise HTTPException(status_code=400, detail="Item name cannot be empty")
        update_data["name"] = input.name.strip()
    if input.quantity is not None:
        update_data["quantity"] = max(1, input.quantity)
    if input.category is not None:
        valid_categories = [cat.value for cat in Category]
        update_data["category"] = input.category if input.category in valid_categories else Category.OTHER.value
    
    if update_data:
        await db.groceries.update_one({"id": item_id}, {"$set": update_data})
    
    updated = await db.groceries.find_one({"id": item_id})
    return GroceryItem(**updated)

@api_router.delete("/groceries/{item_id}")
async def delete_grocery(item_id: str):
    """Delete a grocery item"""
    result = await db.groceries.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# Status routes
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
