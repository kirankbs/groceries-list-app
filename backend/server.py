from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import json
import asyncio
import re
import warnings
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import secrets
import bcrypt
import anthropic
import random
import requests as http_requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
if not ANTHROPIC_API_KEY:
    warnings.warn("ANTHROPIC_API_KEY not set — receipt scanning will fail", RuntimeWarning)

RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
RESEND_FROM = os.environ.get('RESEND_FROM', 'The Living Pantry <onboarding@resend.dev>')

ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:8081,http://localhost:19006').split(',')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ==================== MODELS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    personal_workspace_id: Optional[str] = None  # Every user has a personal workspace (migrated)
    created_at: datetime

class Workspace(BaseModel):
    workspace_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: Literal['personal', 'shared'] = 'shared'
    invite_code: Optional[str] = None  # Only for shared workspaces
    owner_id: str
    member_ids: List[str] = []
    currency: str = "EUR"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceJoin(BaseModel):
    invite_code: str

class ShoppingList(BaseModel):
    list_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    name: str
    status: Literal['active', 'in_progress', 'completed'] = 'active'
    is_template: bool = False
    created_from_template_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class ShoppingListCreate(BaseModel):
    name: str
    workspace_id: str
    copy_from_list_id: Optional[str] = None
    from_template_id: Optional[str] = None

class ShoppingListUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[Literal['active', 'in_progress', 'completed']] = None

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str = "#9E9E9E"
    icon: str = "pricetag-outline"
    is_default: bool = False
    workspace_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    color: str = "#9E9E9E"
    icon: str = "pricetag-outline"
    workspace_id: str

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class GroceryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    list_id: str
    name: str
    quantity: int = 1
    unit: str = "items"
    category: str = "Other"
    checked: bool = False
    added_by: Optional[str] = None
    price: Optional[float] = None
    price_updated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GroceryItemCreate(BaseModel):
    list_id: str
    name: str
    quantity: int = 1
    unit: str = "items"
    category: str = "Other"

class GroceryItemUpdate(BaseModel):
    checked: Optional[bool] = None
    name: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None

class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v.strip()):
            raise ValueError('Invalid email format')
        return v.strip().lower()

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str = Field(min_length=8)

class WorkspaceCurrencyUpdate(BaseModel):
    currency: str

class ReceiptConfirmItem(BaseModel):
    item_id: str
    price: float

class ReceiptConfirmInput(BaseModel):
    confirmed_items: List[ReceiptConfirmItem]


# Default categories
DEFAULT_CATEGORIES = [
    {"name": "Produce", "color": "#7B9E6B", "icon": "leaf-outline", "is_default": True},
    {"name": "Dairy", "color": "#5B8A72", "icon": "water-outline", "is_default": True},
    {"name": "Meat", "color": "#C2644B", "icon": "restaurant-outline", "is_default": True},
    {"name": "Bakery", "color": "#D4915E", "icon": "pizza-outline", "is_default": True},
    {"name": "Beverages", "color": "#6B7F3B", "icon": "cafe-outline", "is_default": True},
    {"name": "Snacks", "color": "#B87352", "icon": "ice-cream-outline", "is_default": True},
    {"name": "Frozen", "color": "#5C7A6B", "icon": "snow-outline", "is_default": True},
    {"name": "Pantry", "color": "#8B7355", "icon": "cube-outline", "is_default": True},
    {"name": "Household", "color": "#6B5B4F", "icon": "home-outline", "is_default": True},
    {"name": "Other", "color": "#9E8B7C", "icon": "ellipsis-horizontal-outline", "is_default": True},
]


# ==================== HELPERS ====================

async def initialize_workspace_categories(workspace_id: str):
    """Initialize default categories for a workspace"""
    now = datetime.now(timezone.utc)
    cat_docs = [
        {**cat, "id": str(uuid.uuid4()), "workspace_id": workspace_id, "created_at": now}
        for cat in DEFAULT_CATEGORIES
    ]
    await db.categories.insert_many(cat_docs)

async def create_personal_workspace(user_id: str, user_name: str) -> str:
    """Create a personal workspace for a new user"""
    workspace_id = str(uuid.uuid4())
    workspace = {
        "workspace_id": workspace_id,
        "name": f"{user_name}'s Personal List",
        "type": "personal",
        "invite_code": None,
        "owner_id": user_id,
        "member_ids": [user_id],
        "currency": "EUR",
        "created_at": datetime.now(timezone.utc)
    }
    await db.workspaces.insert_one(workspace)
    await initialize_workspace_categories(workspace_id)
    
    # Create default shopping list for personal workspace
    default_list = {
        "list_id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "name": "My Shopping List",
        "status": "active",
        "is_template": False,
        "created_from_template_id": None,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None
    }
    await db.shopping_lists.insert_one(default_list)
    
    return workspace_id

async def get_session_token(request: Request) -> Optional[str]:
    session_token = request.cookies.get("session_token")
    if session_token:
        return session_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return None

async def get_current_user(request: Request) -> Optional[User]:
    session_token = await get_session_token(request)
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if user_doc:
        return User(**user_doc)
    return None

async def require_auth(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def verify_workspace_access(user: User, workspace_id: str) -> dict:
    """Verify user has access to workspace"""
    workspace = await db.workspaces.find_one({"workspace_id": workspace_id}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if user.user_id not in workspace.get("member_ids", []):
        raise HTTPException(status_code=403, detail="You don't have access to this workspace")
    return workspace

async def verify_list_access(user: User, list_id: str) -> dict:
    """Verify user has access to shopping list"""
    shopping_list = await db.shopping_lists.find_one({"list_id": list_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    await verify_workspace_access(user, shopping_list["workspace_id"])
    return shopping_list

SESSION_EXPIRY_DAYS = 7

async def create_user_session(user_id: str, response: Response, replace: bool = False) -> str:
    """
    Creates a new session token and sets the session cookie.
    When replace=True, all existing sessions for the user are deleted first —
    logging in from a new device invalidates active sessions on other devices.
    """
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS)
    if replace:
        await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=os.environ.get('ENVIRONMENT', 'development') != 'development', samesite="lax",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60, path="/"
    )
    return session_token

async def update_list_status(list_id: str):
    """
    Recompute and persist list status based on current item checked state.
    Skips already-completed lists — manual completion is not reversed by unchecking items.
    Sets to 'active' when list is empty (status resets if all items are deleted).
    """
    items = await db.grocery_items.find({"list_id": list_id}).to_list(1000)
    if not items:
        await db.shopping_lists.update_one(
            {"list_id": list_id},
            {"$set": {"status": "active"}}
        )
        return
    
    all_checked = all(item.get("checked", False) for item in items)
    any_checked = any(item.get("checked", False) for item in items)
    
    current_list = await db.shopping_lists.find_one({"list_id": list_id})
    if not current_list or current_list.get("status") == "completed":
        return
    
    if all_checked:
        await db.shopping_lists.update_one(
            {"list_id": list_id},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
        )
    elif any_checked:
        await db.shopping_lists.update_one(
            {"list_id": list_id},
            {"$set": {"status": "in_progress"}}
        )
    else:
        await db.shopping_lists.update_one(
            {"list_id": list_id},
            {"$set": {"status": "active"}}
        )


# ==================== CLAUDE RECEIPT HELPERS ====================

def _extract_json(text: str):
    # Claude sometimes wraps JSON in ```json blocks; strip markdown fences before parsing.
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part and (part.startswith("{") or part.startswith("[")):
                try:
                    return json.loads(part)
                except Exception:
                    continue
    return json.loads(text)


def parse_and_match_receipt_with_claude(image_base64: str, mime_type: str, grocery_items: list) -> dict:
    list_items_str = json.dumps([
        {"id": item["id"], "name": item["name"]}
        for item in grocery_items
    ], indent=2) if grocery_items else "[]"

    prompt = (
        "You are a receipt parser AND grocery item matcher.\n\n"
        "TASK 1: Extract every line item from this receipt image.\n"
        "TASK 2: Match those items to the grocery list below.\n\n"
        f"Grocery list items:\n{list_items_str}\n\n"
        "Rules:\n"
        "- Translate all item names to English\n"
        "- Smart matching: 'Org. Whole Milk' -> 'Milk', 'Choc Chip Cookies' -> 'Cookies'\n"
        "- Only match if reasonably confident — skip if no good match\n"
        "- Each grocery list item can only be matched once\n"
        "- Do NOT include tax lines, discounts, subtotals as items\n\n"
        "Return ONLY a valid JSON object, no explanation:\n"
        "{\n"
        '  "store_name": "string or null",\n'
        '  "receipt_total": number or null,\n'
        '  "items": [\n'
        "    {\n"
        '      "original_name": "exact text from receipt",\n'
        '      "english_name": "translated to English",\n'
        '      "total_price": number\n'
        "    }\n"
        "  ],\n"
        '  "matched_items": [\n'
        "    {\n"
        '      "list_item_id": "id from grocery list above",\n'
        '      "matched_receipt_line": "original_name from receipt",\n'
        '      "price": number,\n'
        '      "confidence": "high" | "medium" | "low"\n'
        "    }\n"
        "  ]\n"
        "}"
    )

    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system="You are a receipt parser and grocery item matcher. Always return valid JSON only.",
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime_type, "data": image_base64}},
                {"type": "text", "text": prompt}
            ]
        }]
    )
    response_text = message.content[0].text
    return _extract_json(response_text)


async def process_receipt_background(receipt_id: str, list_id: str, image_base64: str, mime_type: str):
    try:
        grocery_items = await db.grocery_items.find(
            {"list_id": list_id}, {"_id": 0}
        ).to_list(1000)

        parsed = await asyncio.to_thread(
            parse_and_match_receipt_with_claude, image_base64, mime_type, grocery_items
        )

        raw_items = parsed.get("items", [])
        matched_items_raw = parsed.get("matched_items", [])

        # Claude may return IDs for items it hallucinated; drop any that don't exist in this list.
        matched_items = []
        for match in matched_items_raw:
            list_item_id = match.get("list_item_id")
            price = match.get("price")
            if not list_item_id or price is None:
                continue
            list_item = next(
                (item for item in grocery_items if item["id"] == list_item_id), None
            )
            if not list_item:
                continue
            matched_items.append({
                "item_id": list_item_id,
                "item_name": list_item["name"],
                "matched_receipt_line": match.get("matched_receipt_line", ""),
                "price": float(price),
                "confidence": match.get("confidence", "medium"),
            })

        matched_total = round(sum(i["price"] for i in matched_items), 2) if matched_items else None

        await db.receipts.update_one(
            {"receipt_id": receipt_id},
            {"$set": {
                "status": "completed",
                "processed_at": datetime.now(timezone.utc),
                "store_name": parsed.get("store_name"),
                "receipt_total": parsed.get("receipt_total"),
                "matched_total": matched_total,
                "raw_extracted_items": raw_items,
                "matched_items": matched_items,
            }}
        )
    except Exception as e:
        logger.error(f"Background receipt processing error: {str(e)}")
        await db.receipts.update_one(
            {"receipt_id": receipt_id},
            {"$set": {"status": "failed", "error_message": "Receipt processing failed. Please try again."}}
        )


RESET_CODE_EXPIRY_MINUTES = 10
RESET_CODE_COOLDOWN_SECONDS = 60
RESET_CODE_MAX_ATTEMPTS = 3

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def send_reset_email(to_email: str, code: str):
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured — reset code not sent")
        return
    try:
        html = f"""
        <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 style="color: #1a1c1a; margin: 8px 0 4px;">The Living Pantry</h2>
            </div>
            <p style="color: #424940; font-size: 14px;">Here's your password reset code:</p>
            <div style="background: #f0f0f0; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #006a28;">{code}</span>
            </div>
            <p style="color: #72796f; font-size: 12px;">This code expires in {RESET_CODE_EXPIRY_MINUTES} minutes. If you didn't request this, ignore this email.</p>
        </div>
        """
        resp = http_requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={
                "from": RESEND_FROM,
                "to": [to_email],
                "subject": f"Your password reset code: {code}",
                "html": html,
            },
        )
        if resp.status_code == 200:
            logger.info(f"Reset code sent to {to_email}")
        else:
            logger.error(f"Resend API error: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.error(f"Failed to send reset email to {to_email}: {e}")


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(input: RegisterRequest, response: Response):
    if not input.email.strip() or not input.password or not input.name.strip():
        raise HTTPException(status_code=400, detail="Email, password, and name are required")

    existing = await db.users.find_one({"email": input.email.strip().lower()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    hashed = bcrypt.hashpw(input.password.encode(), bcrypt.gensalt()).decode()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    personal_workspace_id = await create_personal_workspace(user_id, input.name.strip())

    new_user = {
        "user_id": user_id,
        "email": input.email.strip().lower(),
        "name": input.name.strip(),
        "picture": None,
        "password_hash": hashed,
        "personal_workspace_id": personal_workspace_id,
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(new_user)

    session_token = await create_user_session(user_id, response)
    user_response = {k: v for k, v in new_user.items() if k not in ("_id", "password_hash")}
    return {"user": user_response, "session_token": session_token}

@api_router.post("/auth/login")
async def login(input: LoginRequest, response: Response):
    user_doc = await db.users.find_one({"email": input.email.strip().lower()})
    if not user_doc or not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not bcrypt.checkpw(input.password.encode(), user_doc["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    session_token = await create_user_session(user_doc["user_id"], response, replace=True)
    user_response = {k: v for k, v in user_doc.items() if k not in ("_id", "password_hash")}
    return {"user": user_response, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get all workspaces user is a member of
    workspaces = await db.workspaces.find(
        {"member_ids": user.user_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Ensure user always has a personal workspace
    personal_ws = next((w for w in workspaces if w.get("type") == "personal"), None)
    if not personal_ws:
        # Migration path: users created before personal workspaces were introduced won't have one; create on demand.
        personal_workspace_id = await create_personal_workspace(user.user_id, user.name)
        # Update user with new personal workspace id
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"personal_workspace_id": personal_workspace_id}}
        )
        # Re-fetch workspaces
        workspaces = await db.workspaces.find(
            {"member_ids": user.user_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(100)
    
    # Add member details to each workspace
    for workspace in workspaces:
        members = await db.users.find(
            {"user_id": {"$in": workspace.get("member_ids", [])}},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
        ).to_list(100)
        workspace["members"] = members
    
    return {"user": user.dict(), "workspaces": workspaces}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = await get_session_token(request)
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(input: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    email = input.email.strip().lower()
    # Always return success to avoid leaking whether an account exists
    success_msg = {"message": "If an account with that email exists, a reset code has been sent."}

    user_doc = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    if not user_doc:
        return success_msg

    existing = await db.password_reset_codes.find_one({"email": email})
    if existing:
        created = existing["created_at"]
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - created).total_seconds()
        if elapsed < RESET_CODE_COOLDOWN_SECONDS:
            return success_msg

    code = generate_otp()
    code_hash = bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
    now = datetime.now(timezone.utc)
    await db.password_reset_codes.delete_many({"email": email})
    await db.password_reset_codes.insert_one({
        "email": email,
        "code_hash": code_hash,
        "attempts": 0,
        "created_at": now,
        "expires_at": now + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES),
    })

    background_tasks.add_task(send_reset_email, email, code)
    return success_msg

@api_router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordRequest):
    email = input.email.strip().lower()
    code_doc = await db.password_reset_codes.find_one({"email": email})
    if not code_doc:
        raise HTTPException(status_code=400, detail="No reset code found. Please request a new one.")

    expires_at = code_doc["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await db.password_reset_codes.delete_many({"email": email})
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

    if code_doc["attempts"] >= RESET_CODE_MAX_ATTEMPTS:
        await db.password_reset_codes.delete_many({"email": email})
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new code.")

    if not bcrypt.checkpw(input.code.encode(), code_doc["code_hash"].encode()):
        await db.password_reset_codes.update_one(
            {"email": email},
            {"$inc": {"attempts": 1}}
        )
        remaining = RESET_CODE_MAX_ATTEMPTS - code_doc["attempts"] - 1
        raise HTTPException(status_code=400, detail=f"Invalid code. {remaining} attempt(s) remaining.")

    new_hash = bcrypt.hashpw(input.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one({"email": email}, {"$set": {"password_hash": new_hash}})

    user_doc = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    if user_doc:
        await db.user_sessions.delete_many({"user_id": user_doc["user_id"]})

    await db.password_reset_codes.delete_many({"email": email})
    return {"message": "Password reset successfully. You can now sign in with your new password."}


# ==================== WORKSPACE ROUTES ====================

@api_router.get("/workspaces")
async def get_workspaces(request: Request):
    """Get all workspaces for current user"""
    user = await require_auth(request)
    
    workspaces = await db.workspaces.find(
        {"member_ids": user.user_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    for workspace in workspaces:
        members = await db.users.find(
            {"user_id": {"$in": workspace.get("member_ids", [])}},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
        ).to_list(100)
        workspace["members"] = members
        
        # Get list counts
        active_count = await db.shopping_lists.count_documents({
            "workspace_id": workspace["workspace_id"],
            "status": {"$in": ["active", "in_progress"]},
            "is_template": False
        })
        completed_count = await db.shopping_lists.count_documents({
            "workspace_id": workspace["workspace_id"],
            "status": "completed",
            "is_template": False
        })
        workspace["active_lists_count"] = active_count
        workspace["completed_lists_count"] = completed_count
    
    return workspaces

@api_router.post("/workspaces")
async def create_workspace(input: WorkspaceCreate, request: Request):
    """Create a new shared workspace"""
    user = await require_auth(request)
    
    workspace = Workspace(
        name=input.name.strip(),
        type="shared",
        invite_code=secrets.token_urlsafe(6),
        owner_id=user.user_id,
        member_ids=[user.user_id]
    )
    
    await db.workspaces.insert_one(workspace.dict())
    await initialize_workspace_categories(workspace.workspace_id)
    
    # Create default shopping list
    default_list = {
        "list_id": str(uuid.uuid4()),
        "workspace_id": workspace.workspace_id,
        "name": "Shopping List",
        "status": "active",
        "is_template": False,
        "created_from_template_id": None,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None
    }
    await db.shopping_lists.insert_one(default_list)
    
    return workspace.dict()

@api_router.post("/workspaces/join")
async def join_workspace(input: WorkspaceJoin, request: Request):
    """Join a workspace using invite code"""
    user = await require_auth(request)
    
    workspace = await db.workspaces.find_one({"invite_code": input.invite_code}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    if workspace.get("type") == "personal":
        raise HTTPException(status_code=400, detail="Cannot join a personal workspace")
    
    if user.user_id in workspace.get("member_ids", []):
        raise HTTPException(status_code=400, detail="You are already a member of this workspace")
    
    await db.workspaces.update_one(
        {"workspace_id": workspace["workspace_id"]},
        {"$addToSet": {"member_ids": user.user_id}}
    )
    
    updated_workspace = await db.workspaces.find_one({"workspace_id": workspace["workspace_id"]}, {"_id": 0})
    return updated_workspace

@api_router.post("/workspaces/{workspace_id}/leave")
async def leave_workspace(workspace_id: str, request: Request):
    """Leave a workspace"""
    user = await require_auth(request)
    
    workspace = await verify_workspace_access(user, workspace_id)
    
    if workspace.get("type") == "personal":
        raise HTTPException(status_code=400, detail="Cannot leave your personal workspace")
    
    if workspace["owner_id"] == user.user_id:
        other_members = [m for m in workspace["member_ids"] if m != user.user_id]
        if other_members:
            new_owner = other_members[0]
            await db.workspaces.update_one(
                {"workspace_id": workspace_id},
                {"$set": {"owner_id": new_owner}, "$pull": {"member_ids": user.user_id}}
            )
        else:
            # Fetch list IDs before deleting anything
            lists = await db.shopping_lists.find({"workspace_id": workspace_id}, {"list_id": 1}).to_list(1000)
            list_ids = [l["list_id"] for l in lists]
            if list_ids:
                await db.grocery_items.delete_many({"list_id": {"$in": list_ids}})
            await db.shopping_lists.delete_many({"workspace_id": workspace_id})
            await db.categories.delete_many({"workspace_id": workspace_id})
            await db.workspaces.delete_one({"workspace_id": workspace_id})
    else:
        await db.workspaces.update_one(
            {"workspace_id": workspace_id},
            {"$pull": {"member_ids": user.user_id}}
        )
    
    return {"message": "Left workspace successfully"}

@api_router.get("/workspaces/{workspace_id}/invite-code")
async def get_invite_code(workspace_id: str, request: Request):
    """Get workspace invite code"""
    user = await require_auth(request)
    workspace = await verify_workspace_access(user, workspace_id)
    
    if workspace.get("type") == "personal":
        raise HTTPException(status_code=400, detail="Personal workspace cannot be shared")
    
    return {"invite_code": workspace.get("invite_code"), "workspace_name": workspace["name"]}

@api_router.post("/workspaces/{workspace_id}/regenerate-code")
async def regenerate_invite_code(workspace_id: str, request: Request):
    """Regenerate workspace invite code (owner only)"""
    user = await require_auth(request)
    workspace = await verify_workspace_access(user, workspace_id)
    
    if workspace["owner_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only the owner can regenerate the invite code")
    
    new_code = secrets.token_urlsafe(6)
    await db.workspaces.update_one(
        {"workspace_id": workspace_id},
        {"$set": {"invite_code": new_code}}
    )
    return {"invite_code": new_code}

@api_router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, request: Request):
    """Delete a workspace (owner only)"""
    user = await require_auth(request)
    workspace = await verify_workspace_access(user, workspace_id)
    
    if workspace.get("type") == "personal":
        raise HTTPException(status_code=400, detail="Cannot delete your personal household")
    
    if workspace["owner_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this household")
    
    # Get all lists first before deleting workspace
    lists = await db.shopping_lists.find({"workspace_id": workspace_id}).to_list(1000)
    list_ids = [l["list_id"] for l in lists]
    
    # Delete all items in lists of this workspace
    if list_ids:
        await db.grocery_items.delete_many({"list_id": {"$in": list_ids}})
    
    # Delete workspace data
    await db.shopping_lists.delete_many({"workspace_id": workspace_id})
    await db.categories.delete_many({"workspace_id": workspace_id})
    await db.workspaces.delete_one({"workspace_id": workspace_id})
    
    return {"message": "Household deleted successfully"}


# ==================== SHOPPING LIST ROUTES ====================

@api_router.get("/workspaces/{workspace_id}/lists")
async def get_shopping_lists(workspace_id: str, request: Request):
    """Get all shopping lists for a workspace"""
    user = await require_auth(request)
    await verify_workspace_access(user, workspace_id)
    
    lists = await db.shopping_lists.find(
        {"workspace_id": workspace_id, "is_template": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Add item counts to each list via a single aggregation instead of N+1 queries
    list_ids = [l["list_id"] for l in lists]
    pipeline = [
        {"$match": {"list_id": {"$in": list_ids}}},
        {"$group": {
            "_id": "$list_id",
            "total": {"$sum": 1},
            "checked": {"$sum": {"$cond": ["$checked", 1, 0]}}
        }}
    ]
    counts = {r["_id"]: r async for r in db.grocery_items.aggregate(pipeline)}
    for lst in lists:
        c = counts.get(lst["list_id"], {"total": 0, "checked": 0})
        lst["total_items"] = c["total"]
        lst["checked_items"] = c["checked"]

    return lists

@api_router.get("/workspaces/{workspace_id}/templates")
async def get_templates(workspace_id: str, request: Request):
    """Get all templates for a workspace"""
    user = await require_auth(request)
    await verify_workspace_access(user, workspace_id)
    
    templates = await db.shopping_lists.find(
        {"workspace_id": workspace_id, "is_template": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    template_ids = [t["list_id"] for t in templates]
    tpl_pipeline = [
        {"$match": {"list_id": {"$in": template_ids}}},
        {"$group": {"_id": "$list_id", "total": {"$sum": 1}}}
    ]
    tpl_counts = {r["_id"]: r["total"] async for r in db.grocery_items.aggregate(tpl_pipeline)}
    for tpl in templates:
        tpl["item_count"] = tpl_counts.get(tpl["list_id"], 0)

    return templates

@api_router.post("/lists")
async def create_shopping_list(input: ShoppingListCreate, request: Request):
    """Create a new shopping list"""
    user = await require_auth(request)
    await verify_workspace_access(user, input.workspace_id)
    
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="List name cannot be empty")
    
    new_list = ShoppingList(
        workspace_id=input.workspace_id,
        name=input.name.strip(),
        created_from_template_id=input.from_template_id
    )
    
    await db.shopping_lists.insert_one(new_list.dict())
    
    # Copy items if copying from existing list or template
    source_list_id = input.copy_from_list_id or input.from_template_id
    if source_list_id:
        source_items = await db.grocery_items.find({"list_id": source_list_id}, {"_id": 0}).to_list(1000)
        if source_items:
            now = datetime.now(timezone.utc)
            new_items = [
                {**item, "id": str(uuid.uuid4()), "list_id": new_list.list_id,
                 "checked": False, "added_by": user.user_id, "created_at": now}
                for item in source_items
            ]
            await db.grocery_items.insert_many(new_items)
    
    return new_list.dict()

@api_router.put("/lists/{list_id}")
async def update_shopping_list(list_id: str, input: ShoppingListUpdate, request: Request):
    """Update a shopping list"""
    user = await require_auth(request)
    shopping_list = await verify_list_access(user, list_id)
    
    update_data = {}
    if input.name is not None:
        if not input.name.strip():
            raise HTTPException(status_code=400, detail="List name cannot be empty")
        update_data["name"] = input.name.strip()
    
    if input.status is not None:
        update_data["status"] = input.status
        if input.status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc)
        elif shopping_list.get("status") == "completed":
            update_data["completed_at"] = None
    
    if update_data:
        await db.shopping_lists.update_one({"list_id": list_id}, {"$set": update_data})
    
    updated = await db.shopping_lists.find_one({"list_id": list_id}, {"_id": 0})
    return updated

@api_router.delete("/lists/{list_id}")
async def delete_shopping_list(list_id: str, request: Request):
    """Delete a shopping list"""
    user = await require_auth(request)
    await verify_list_access(user, list_id)
    
    await db.grocery_items.delete_many({"list_id": list_id})
    await db.shopping_lists.delete_one({"list_id": list_id})
    
    return {"message": "List deleted successfully"}

@api_router.post("/lists/{list_id}/save-as-template")
async def save_as_template(list_id: str, request: Request):
    """Save a shopping list as a template"""
    user = await require_auth(request)
    shopping_list = await verify_list_access(user, list_id)
    
    # Create template
    template = ShoppingList(
        workspace_id=shopping_list["workspace_id"],
        name=f"{shopping_list['name']} (Template)",
        is_template=True
    )
    await db.shopping_lists.insert_one(template.dict())
    
    # Copy items to template
    items = await db.grocery_items.find({"list_id": list_id}, {"_id": 0}).to_list(1000)
    if items:
        now = datetime.now(timezone.utc)
        new_items = [
            {**item, "id": str(uuid.uuid4()), "list_id": template.list_id,
             "checked": False, "created_at": now}
            for item in items
        ]
        await db.grocery_items.insert_many(new_items)
    
    return template.dict()


# ==================== CATEGORY ROUTES ====================

@api_router.get("/workspaces/{workspace_id}/categories")
async def get_categories(workspace_id: str, request: Request):
    """Get categories for a workspace"""
    user = await require_auth(request)
    await verify_workspace_access(user, workspace_id)
    
    categories = await db.categories.find(
        {"workspace_id": workspace_id},
        {"_id": 0}
    ).sort("name", 1).to_list(100)
    
    return categories

@api_router.post("/categories")
async def create_category(input: CategoryCreate, request: Request):
    """Create a new category"""
    user = await require_auth(request)
    await verify_workspace_access(user, input.workspace_id)
    
    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Category name cannot be empty")
    
    existing = await db.categories.find_one({
        "name": {"$regex": f"^{re.escape(input.name.strip())}$", "$options": "i"},
        "workspace_id": input.workspace_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = Category(
        name=input.name.strip(),
        color=input.color,
        icon=input.icon,
        workspace_id=input.workspace_id
    )
    await db.categories.insert_one(category.dict())
    return category.dict()

@api_router.put("/categories/{category_id}")
async def update_category(category_id: str, input: CategoryUpdate, request: Request):
    """Update a category"""
    user = await require_auth(request)
    
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await verify_workspace_access(user, existing["workspace_id"])
    
    update_data = {}
    old_name = existing.get("name")
    
    if input.name is not None:
        if not input.name.strip():
            raise HTTPException(status_code=400, detail="Category name cannot be empty")
        update_data["name"] = input.name.strip()
    if input.color is not None:
        update_data["color"] = input.color
    if input.icon is not None:
        update_data["icon"] = input.icon
    
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})
        
        # Update items with old category name in this workspace's lists
        if "name" in update_data and old_name != update_data["name"]:
            lists = await db.shopping_lists.find({"workspace_id": existing["workspace_id"]}).to_list(1000)
            list_ids = [l["list_id"] for l in lists]
            if list_ids:
                await db.grocery_items.update_many(
                    {"list_id": {"$in": list_ids}, "category": old_name},
                    {"$set": {"category": update_data["name"]}}
                )
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, request: Request):
    """Delete a category"""
    user = await require_auth(request)
    
    existing = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await verify_workspace_access(user, existing["workspace_id"])
    
    category_name = existing.get("name")
    
    # Move items to "Other"
    lists = await db.shopping_lists.find({"workspace_id": existing["workspace_id"]}).to_list(1000)
    list_ids = [l["list_id"] for l in lists]
    if list_ids:
        await db.grocery_items.update_many(
            {"list_id": {"$in": list_ids}, "category": category_name},
            {"$set": {"category": "Other"}}
        )
    
    await db.categories.delete_one({"id": category_id})
    return {"message": f"Category '{category_name}' deleted"}


# ==================== GROCERY ITEM ROUTES ====================

@api_router.get("/lists/{list_id}/items")
async def get_grocery_items(list_id: str, request: Request):
    """Get all items in a shopping list"""
    user = await require_auth(request)
    await verify_list_access(user, list_id)
    
    items = await db.grocery_items.find(
        {"list_id": list_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return items

@api_router.post("/items")
async def create_grocery_item(input: GroceryItemCreate, request: Request):
    """Create a new grocery item"""
    user = await require_auth(request)
    await verify_list_access(user, input.list_id)

    if not input.name.strip():
        raise HTTPException(status_code=400, detail="Item name cannot be empty")

    item = GroceryItem(
        list_id=input.list_id,
        name=input.name.strip(),
        quantity=max(1, input.quantity) if input.quantity else 1,
        unit=input.unit or "items",
        category=input.category or "Other",
        added_by=user.user_id
    )
    await db.grocery_items.insert_one(item.dict())

    # Update list status
    await update_list_status(input.list_id)

    return item.dict()

@api_router.put("/items/{item_id}")
async def update_grocery_item(item_id: str, input: GroceryItemUpdate, request: Request):
    """Update a grocery item"""
    user = await require_auth(request)

    existing = await db.grocery_items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")

    await verify_list_access(user, existing["list_id"])

    update_data = {}
    if input.checked is not None:
        update_data["checked"] = input.checked
    if input.name is not None:
        if not input.name.strip():
            raise HTTPException(status_code=400, detail="Item name cannot be empty")
        update_data["name"] = input.name.strip()
    if input.quantity is not None:
        update_data["quantity"] = max(1, input.quantity)
    if input.unit is not None:
        update_data["unit"] = input.unit
    if input.category is not None:
        update_data["category"] = input.category
    if input.price is not None:
        update_data["price"] = input.price
        update_data["price_updated_at"] = datetime.now(timezone.utc)

    if update_data:
        await db.grocery_items.update_one({"id": item_id}, {"$set": update_data})

    # Update list status if checked changed
    if "checked" in update_data:
        await update_list_status(existing["list_id"])

    updated = await db.grocery_items.find_one({"id": item_id}, {"_id": 0})
    return updated

@api_router.delete("/items/{item_id}")
async def delete_grocery_item(item_id: str, request: Request):
    """Delete a grocery item"""
    user = await require_auth(request)
    
    existing = await db.grocery_items.find_one({"id": item_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await verify_list_access(user, existing["list_id"])
    
    list_id = existing["list_id"]
    await db.grocery_items.delete_one({"id": item_id})
    
    # Update list status
    await update_list_status(list_id)
    
    return {"message": "Item deleted successfully"}


# ==================== WORKSPACE CURRENCY ROUTE ====================

@api_router.put("/workspaces/{workspace_id}/currency")
async def update_workspace_currency(workspace_id: str, input: WorkspaceCurrencyUpdate, request: Request):
    user = await require_auth(request)
    await verify_workspace_access(user, workspace_id)

    valid_currencies = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"]
    if input.currency not in valid_currencies:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid currency. Must be one of: {', '.join(valid_currencies)}"
        )

    await db.workspaces.update_one(
        {"workspace_id": workspace_id},
        {"$set": {"currency": input.currency}}
    )
    updated = await db.workspaces.find_one({"workspace_id": workspace_id}, {"_id": 0})
    return updated


# ==================== RECEIPT ROUTES ====================

@api_router.post("/lists/{list_id}/upload-receipt")
async def upload_receipt(
    list_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...)
):
    user = await require_auth(request)
    shopping_list = await verify_list_access(user, list_id)

    content_type = image.content_type or ""
    allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

    # Infer content type from filename if browser sends generic type
    if content_type not in allowed and image.filename:
        ext = image.filename.rsplit(".", 1)[-1].lower() if "." in (image.filename or "") else ""
        ext_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
        content_type = ext_map.get(ext, content_type)

    if content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{content_type}'. Please upload JPEG, PNG, or WEBP.")

    workspace = await db.workspaces.find_one(
        {"workspace_id": shopping_list["workspace_id"]}, {"_id": 0}
    )
    workspace_currency = workspace.get("currency", "EUR") if workspace else "EUR"

    MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
    content_length = image.size
    if content_length and content_length > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large. Maximum size is 10 MB.")

    image_bytes = await image.read()
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = "image/jpeg" if content_type in ("image/jpg", "image/jpeg") else content_type

    receipt_id = str(uuid.uuid4())
    receipt_doc = {
        "receipt_id": receipt_id,
        "list_id": list_id,
        "workspace_id": shopping_list["workspace_id"],
        "uploaded_at": datetime.now(timezone.utc),
        "processed_at": None,
        "status": "processing",
        "store_name": None,
        "currency": workspace_currency,
        "receipt_total": None,
        "matched_total": None,
        "raw_extracted_items": [],
        "matched_items": [],
        "error_message": None,
    }
    await db.receipts.insert_one(receipt_doc)

    background_tasks.add_task(
        process_receipt_background,
        receipt_id, list_id, image_base64, mime_type
    )

    return {"receipt_id": receipt_id, "status": "processing"}


@api_router.get("/receipts/{receipt_id}")
async def get_receipt_status(receipt_id: str, request: Request):
    user = await require_auth(request)

    receipt = await db.receipts.find_one({"receipt_id": receipt_id}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    await verify_list_access(user, receipt["list_id"])

    raw_items_count = len(receipt.pop("raw_extracted_items", []))
    receipt["raw_items_count"] = raw_items_count
    return receipt


@api_router.get("/lists/{list_id}/receipts")
async def get_list_receipts(list_id: str, request: Request):
    user = await require_auth(request)
    await verify_list_access(user, list_id)

    receipts = await db.receipts.find(
        {"list_id": list_id},
        {"_id": 0, "raw_extracted_items": 0}
    ).sort("uploaded_at", -1).to_list(100)

    return receipts


@api_router.post("/receipts/{receipt_id}/confirm")
async def confirm_receipt(receipt_id: str, input: ReceiptConfirmInput, request: Request):
    user = await require_auth(request)

    receipt = await db.receipts.find_one({"receipt_id": receipt_id}, {"_id": 0})
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    await verify_list_access(user, receipt["list_id"])

    now = datetime.now(timezone.utc)
    updated_items = []

    for confirmed in input.confirmed_items:
        await db.grocery_items.update_one(
            {"id": confirmed.item_id, "list_id": receipt["list_id"]},
            {"$set": {"price": confirmed.price, "price_updated_at": now}}
        )
        result = await db.grocery_items.find_one({"id": confirmed.item_id}, {"_id": 0})
        if result:
            updated_items.append(result)

    return {"updated_items": updated_items, "receipt_id": receipt_id}


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Grocery Todo API v2.0 - Multi-Workspace Support"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_indexes():
    await db.password_reset_codes.create_index("expires_at", expireAfterSeconds=0)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
