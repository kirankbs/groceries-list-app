from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import secrets


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


# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    household_id: Optional[str] = None
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Household(BaseModel):
    household_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    invite_code: str = Field(default_factory=lambda: secrets.token_urlsafe(6))
    owner_id: str
    member_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HouseholdCreate(BaseModel):
    name: str

class HouseholdJoin(BaseModel):
    invite_code: str

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str = "#9E9E9E"
    icon: str = "pricetag-outline"
    is_default: bool = False
    household_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    household_id: Optional[str] = None
    added_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GroceryItemCreate(BaseModel):
    name: str
    quantity: int = 1
    category: str = "Other"

class GroceryItemUpdate(BaseModel):
    checked: Optional[bool] = None
    name: Optional[str] = None
    quantity: Optional[int] = None
    category: Optional[str] = None

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str


# Default categories
DEFAULT_CATEGORIES = [
    {"name": "Produce", "color": "#4CAF50", "icon": "leaf-outline", "is_default": True},
    {"name": "Dairy", "color": "#2196F3", "icon": "water-outline", "is_default": True},
    {"name": "Meat", "color": "#F44336", "icon": "restaurant-outline", "is_default": True},
    {"name": "Bakery", "color": "#FF9800", "icon": "pizza-outline", "is_default": True},
    {"name": "Beverages", "color": "#9C27B0", "icon": "cafe-outline", "is_default": True},
    {"name": "Snacks", "color": "#E91E63", "icon": "ice-cream-outline", "is_default": True},
    {"name": "Frozen", "color": "#00BCD4", "icon": "snow-outline", "is_default": True},
    {"name": "Pantry", "color": "#795548", "icon": "cube-outline", "is_default": True},
    {"name": "Household", "color": "#607D8B", "icon": "home-outline", "is_default": True},
    {"name": "Other", "color": "#9E9E9E", "icon": "ellipsis-horizontal-outline", "is_default": True},
]


# ==================== AUTH HELPERS ====================

async def get_session_token(request: Request) -> Optional[str]:
    """Get session token from cookie or Authorization header"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    
    # Check Authorization header as fallback
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    
    return None

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token"""
    session_token = await get_session_token(request)
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check if session is expired (handle timezone-naive datetimes)
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    """Require authentication - raises 401 if not authenticated"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    
    # Exchange session_id with Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            user_data = auth_response.json()
            session_data = SessionDataResponse(**user_data)
            
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")
    
    # Check if user exists, create if not
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": session_data.email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        new_user = {
            "user_id": user_id,
            "email": session_data.email,
            "name": session_data.name,
            "picture": session_data.picture,
            "household_id": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
    
    # Create session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_data.session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    
    # Remove old sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_data.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    # Get updated user
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user_doc, "session_token": session_data.session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get household info if user is in one
    household = None
    if user.household_id:
        household_doc = await db.households.find_one({"household_id": user.household_id}, {"_id": 0})
        if household_doc:
            # Get member details
            members = await db.users.find(
                {"user_id": {"$in": household_doc.get("member_ids", [])}},
                {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
            ).to_list(100)
            household_doc["members"] = members
            household = household_doc
    
    return {"user": user.dict(), "household": household}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = await get_session_token(request)
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}


# ==================== HOUSEHOLD ROUTES ====================

@api_router.post("/households")
async def create_household(input: HouseholdCreate, request: Request):
    """Create a new household"""
    user = await require_auth(request)
    
    # Check if user already has a household
    if user.household_id:
        raise HTTPException(status_code=400, detail="You are already in a household. Leave first to create a new one.")
    
    # Create household
    household = Household(
        name=input.name.strip(),
        owner_id=user.user_id,
        member_ids=[user.user_id]
    )
    
    await db.households.insert_one(household.dict())
    
    # Update user's household_id
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"household_id": household.household_id}}
    )
    
    # Initialize default categories for this household
    for cat in DEFAULT_CATEGORIES:
        cat_doc = {
            **cat,
            "id": str(uuid.uuid4()),
            "household_id": household.household_id,
            "created_at": datetime.now(timezone.utc)
        }
        await db.categories.insert_one(cat_doc)
    
    return household.dict()

@api_router.post("/households/join")
async def join_household(input: HouseholdJoin, request: Request):
    """Join a household using invite code"""
    user = await require_auth(request)
    
    # Check if user already has a household
    if user.household_id:
        raise HTTPException(status_code=400, detail="You are already in a household. Leave first to join another.")
    
    # Find household by invite code
    household = await db.households.find_one({"invite_code": input.invite_code}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    # Add user to household
    await db.households.update_one(
        {"household_id": household["household_id"]},
        {"$addToSet": {"member_ids": user.user_id}}
    )
    
    # Update user's household_id
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"household_id": household["household_id"]}}
    )
    
    # Get updated household
    updated_household = await db.households.find_one({"household_id": household["household_id"]}, {"_id": 0})
    return updated_household

@api_router.post("/households/leave")
async def leave_household(request: Request):
    """Leave current household"""
    user = await require_auth(request)
    
    if not user.household_id:
        raise HTTPException(status_code=400, detail="You are not in a household")
    
    household = await db.households.find_one({"household_id": user.household_id}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    
    # If user is owner and there are other members, transfer ownership
    if household["owner_id"] == user.user_id:
        other_members = [m for m in household["member_ids"] if m != user.user_id]
        if other_members:
            # Transfer ownership to first other member
            new_owner = other_members[0]
            await db.households.update_one(
                {"household_id": user.household_id},
                {
                    "$set": {"owner_id": new_owner},
                    "$pull": {"member_ids": user.user_id}
                }
            )
        else:
            # Delete household if no other members
            await db.households.delete_one({"household_id": user.household_id})
            # Delete household categories and groceries
            await db.categories.delete_many({"household_id": user.household_id})
            await db.groceries.delete_many({"household_id": user.household_id})
    else:
        # Just remove user from members
        await db.households.update_one(
            {"household_id": user.household_id},
            {"$pull": {"member_ids": user.user_id}}
        )
    
    # Clear user's household_id
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"household_id": None}}
    )
    
    return {"message": "Left household successfully"}

@api_router.get("/households/invite-code")
async def get_invite_code(request: Request):
    """Get household invite code (owner only)"""
    user = await require_auth(request)
    
    if not user.household_id:
        raise HTTPException(status_code=400, detail="You are not in a household")
    
    household = await db.households.find_one({"household_id": user.household_id}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    
    return {"invite_code": household["invite_code"], "household_name": household["name"]}

@api_router.post("/households/regenerate-code")
async def regenerate_invite_code(request: Request):
    """Regenerate household invite code (owner only)"""
    user = await require_auth(request)
    
    if not user.household_id:
        raise HTTPException(status_code=400, detail="You are not in a household")
    
    household = await db.households.find_one({"household_id": user.household_id}, {"_id": 0})
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")
    
    if household["owner_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only the household owner can regenerate the invite code")
    
    new_code = secrets.token_urlsafe(6)
    await db.households.update_one(
        {"household_id": user.household_id},
        {"$set": {"invite_code": new_code}}
    )
    
    return {"invite_code": new_code}


# ==================== CATEGORY ROUTES ====================

@api_router.get("/categories", response_model=List[Category])
async def get_categories(request: Request):
    """Get categories for user's household"""
    user = await get_current_user(request)
    
    if user and user.household_id:
        # Get household categories
        categories = await db.categories.find(
            {"household_id": user.household_id},
            {"_id": 0}
        ).sort("name", 1).to_list(100)
    else:
        # Get default categories (no household_id)
        categories = await db.categories.find(
            {"household_id": None},
            {"_id": 0}
        ).sort("name", 1).to_list(100)
        
        # If no default categories, create them
        if not categories:
            for cat in DEFAULT_CATEGORIES:
                cat_doc = {
                    **cat,
                    "id": str(uuid.uuid4()),
                    "household_id": None,
                    "created_at": datetime.now(timezone.utc)
                }
                await db.categories.insert_one(cat_doc)
            categories = await db.categories.find({"household_id": None}, {"_id": 0}).sort("name", 1).to_list(100)
    
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(input: CategoryCreate, request: Request):
    """Create a new category"""
    user = await get_current_user(request)
    household_id = user.household_id if user else None
    
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Category name cannot be empty")
    
    # Check for duplicate
    existing = await db.categories.find_one({
        "name": {"$regex": f"^{input.name.strip()}$", "$options": "i"},
        "household_id": household_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = Category(
        name=input.name.strip(),
        color=input.color,
        icon=input.icon,
        is_default=False,
        household_id=household_id
    )
    await db.categories.insert_one(category.dict())
    return category

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, input: CategoryUpdate, request: Request):
    """Update a category"""
    user = await get_current_user(request)
    household_id = user.household_id if user else None
    
    existing = await db.categories.find_one({"id": category_id, "household_id": household_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {}
    old_name = existing.get("name")
    
    if input.name is not None:
        if not input.name.strip():
            raise HTTPException(status_code=400, detail="Category name cannot be empty")
        duplicate = await db.categories.find_one({
            "name": {"$regex": f"^{input.name.strip()}$", "$options": "i"},
            "id": {"$ne": category_id},
            "household_id": household_id
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
        if "name" in update_data and old_name != update_data["name"]:
            await db.groceries.update_many(
                {"category": old_name, "household_id": household_id},
                {"$set": {"category": update_data["name"]}}
            )
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, request: Request):
    """Delete a category"""
    user = await get_current_user(request)
    household_id = user.household_id if user else None
    
    existing = await db.categories.find_one({"id": category_id, "household_id": household_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category_name = existing.get("name")
    
    await db.groceries.update_many(
        {"category": category_name, "household_id": household_id},
        {"$set": {"category": "Other"}}
    )
    await db.categories.delete_one({"id": category_id})
    
    return {"message": f"Category '{category_name}' deleted. Items moved to 'Other'."}


# ==================== GROCERY ROUTES ====================

@api_router.get("/groceries", response_model=List[GroceryItem])
async def get_groceries(request: Request):
    """Get groceries for user's household"""
    user = await get_current_user(request)
    household_id = user.household_id if user else None
    
    items = await db.groceries.find(
        {"household_id": household_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return [GroceryItem(**item) for item in items]

@api_router.post("/groceries", response_model=GroceryItem)
async def create_grocery(input: GroceryItemCreate, request: Request):
    """Create a new grocery item"""
    user = await get_current_user(request)
    household_id = user.household_id if user else None
    added_by = user.user_id if user else None
    
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Item name cannot be empty")
    
    item = GroceryItem(
        name=input.name.strip(),
        quantity=max(1, input.quantity) if input.quantity else 1,
        category=input.category or "Other",
        household_id=household_id,
        added_by=added_by
    )
    await db.groceries.insert_one(item.dict())
    return item

@api_router.put("/groceries/{item_id}", response_model=GroceryItem)
async def update_grocery(item_id: str, input: GroceryItemUpdate, request: Request):
    """Update a grocery item"""
    user = await get_current_user(request)
    household_id = user.household_id if user else None
    
    existing = await db.groceries.find_one({"id": item_id, "household_id": household_id}, {"_id": 0})
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
    
    updated = await db.groceries.find_one({"id": item_id}, {"_id": 0})
    return GroceryItem(**updated)

@api_router.delete("/groceries/{item_id}")
async def delete_grocery(item_id: str, request: Request):
    """Delete a grocery item"""
    user = await get_current_user(request)
    household_id = user.household_id if user else None
    
    result = await db.groceries.delete_one({"id": item_id, "household_id": household_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Grocery Todo API with Authentication"}


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
