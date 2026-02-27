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


# Define Models
class GroceryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    checked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GroceryItemCreate(BaseModel):
    name: str

class GroceryItemUpdate(BaseModel):
    checked: Optional[bool] = None
    name: Optional[str] = None

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

# Grocery Routes
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
    
    item = GroceryItem(name=input.name.strip())
    await db.groceries.insert_one(item.dict())
    return item

@api_router.put("/groceries/{item_id}", response_model=GroceryItem)
async def update_grocery(item_id: str, input: GroceryItemUpdate):
    """Update a grocery item (toggle checked status or update name)"""
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
