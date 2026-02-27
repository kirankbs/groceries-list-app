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


# Default categories to initialize
DEFAULT_CATEGORIES = [
    {"id": str(uuid.uuid4()), "name": "Produce", "color": "#4CAF50", "icon": "leaf-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Dairy", "color": "#2196F3", "icon": "water-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Meat", "color": "#F44336", "icon": "restaurant-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Bakery", "color": "#FF9800", "icon": "pizza-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Beverages", "color": "#9C27B0", "icon": "cafe-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Snacks", "color": "#E91E63", "icon": "ice-cream-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Frozen", "color": "#00BCD4", "icon": "snow-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Pantry", "color": "#795548", "icon": "cube-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Household", "color": "#607D8B", "icon": "home-outline", "is_default": True},
    {"id": str(uuid.uuid4()), "name": "Other", "color": "#9E9E9E", "icon": "ellipsis-horizontal-outline", "is_default": True},
]


# Define Models
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str = "#9E9E9E"
    icon: str = "pricetag-outline"
    is_default: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CategoryCreate(BaseModel):
    name: str
    color: str = "#9E9E9E"
    icon: str = "pricetag-outline"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class GroceryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    quantity: int = 1
    category: str = "Other"
    checked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GroceryItemCreate(BaseModel):
    name: str
    quantity: int = 1
    category: str = "Other"

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


# Initialize default categories on startup
@app.on_event("startup")
async def initialize_categories():
    """Initialize default categories if none exist"""
    count = await db.categories.count_documents({})
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            cat["created_at"] = datetime.utcnow()
            await db.categories.insert_one(cat)
        logging.info("Initialized default categories")


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Grocery Todo API"}


# ==================== CATEGORY ROUTES ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    """Get all categories"""
    categories = await db.categories.find().sort("name", 1).to_list(100)
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate):
    """Create a new category"""
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Category name cannot be empty")
    
    # Check if category with same name exists
    existing = await db.categories.find_one({"name": {"$regex": f"^{input.name.strip()}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = Category(
        name=input.name.strip(),
        color=input.color,
        icon=input.icon,
        is_default=False
    )
    await db.categories.insert_one(category.dict())
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, input: CategoryUpdate):
    """Update a category"""
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {}
    old_name = existing.get("name")
    
    if input.name is not None:
        if not input.name.strip():
            raise HTTPException(status_code=400, detail="Category name cannot be empty")
        # Check for duplicate name (excluding current category)
        duplicate = await db.categories.find_one({
            "name": {"$regex": f"^{input.name.strip()}$", "$options": "i"},
            "id": {"$ne": category_id}
        })
        if duplicate:
            raise HTTPException(status_code=400, detail="Category with this name already exists")
        update_data["name"] = input.name.strip()
    
    if input.color is not None:
        update_data["color"] = input.color
    
    if input.icon is not None:
        update_data["icon"] = input.icon
    
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})
        
        # If name changed, update all grocery items with old category name
        if "name" in update_data and old_name != update_data["name"]:
            await db.groceries.update_many(
                {"category": old_name},
                {"$set": {"category": update_data["name"]}}
            )
    
    updated = await db.categories.find_one({"id": category_id})
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category_name = existing.get("name")
    
    # Move items in this category to "Other"
    await db.groceries.update_many(
        {"category": category_name},
        {"$set": {"category": "Other"}}
    )
    
    # Delete the category
    await db.categories.delete_one({"id": category_id})
    
    return {"message": f"Category '{category_name}' deleted. Items moved to 'Other'."}


# ==================== GROCERY ROUTES ====================

@api_router.get("/groceries", response_model=List[GroceryItem])
async def get_groceries():
    """Get all grocery items"""
    items = await db.groceries.find().sort("created_at", -1).to_list(1000)
    return [GroceryItem(**item) for item in items]

@api_router.post("/groceries", response_model=GroceryItem)
async def create_grocery(input: GroceryItemCreate):
    """Create a new grocery item"""
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Item name cannot be empty")
    
    quantity = max(1, input.quantity) if input.quantity else 1
    
    item = GroceryItem(
        name=input.name.strip(),
        quantity=quantity,
        category=input.category or "Other"
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
        update_data["category"] = input.category
    
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


# ==================== STATUS ROUTES ====================

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
