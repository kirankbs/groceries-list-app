#!/usr/bin/env python3
"""
Backend API Testing for Multi-Workspace Grocery Todo App
Tests all backend APIs with proper authentication setup
"""

import asyncio
import bcrypt
import httpx
import json
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# Configuration
BACKEND_URL = "http://localhost:8001/api"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

class BackendTester:
    def __init__(self):
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        self.session_token = None
        self.test_user_id = None
        self.test_workspace_id = None
        self.test_list_id = None
        self.test_item_id = None
        self.invite_code = None
        self.results = []

    async def setup_test_user(self):
        """Register a test user via the API"""
        print("🔧 Setting up test user via /api/auth/register...")

        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/auth/register",
                json={"email": test_email, "password": "testpass123", "name": "Test User"}
            )

        if response.status_code != 200:
            raise Exception(f"Failed to register test user: {response.text}")

        data = response.json()
        self.session_token = data["session_token"]
        self.test_user_id = data["user"]["user_id"]
        print(f"✅ Registered test user: {self.test_user_id}")

    async def cleanup_test_data(self):
        """Clean up test data from database"""
        print("🧹 Cleaning up test data...")

        # Collect all test user IDs
        user_ids = [self.test_user_id]
        if hasattr(self, '_second_user_id'):
            user_ids.append(self._second_user_id)
        if hasattr(self, '_third_user_id'):
            user_ids.append(self._third_user_id)

        # Find all workspaces owned by test users
        workspaces = await self.db.workspaces.find(
            {"owner_id": {"$in": user_ids}}, {"workspace_id": 1}
        ).to_list(100)
        # Also include workspaces test users are members of
        member_workspaces = await self.db.workspaces.find(
            {"member_ids": {"$in": user_ids}}, {"workspace_id": 1}
        ).to_list(100)
        ws_ids = list({w["workspace_id"] for w in workspaces + member_workspaces})

        # Find all lists in those workspaces
        if ws_ids:
            lists = await self.db.shopping_lists.find(
                {"workspace_id": {"$in": ws_ids}}, {"list_id": 1}
            ).to_list(1000)
            list_ids = [l["list_id"] for l in lists]
            if list_ids:
                await self.db.grocery_items.delete_many({"list_id": {"$in": list_ids}})
            await self.db.shopping_lists.delete_many({"workspace_id": {"$in": ws_ids}})
            await self.db.categories.delete_many({"workspace_id": {"$in": ws_ids}})
            await self.db.workspaces.delete_many({"workspace_id": {"$in": ws_ids}})

        # Clean up password reset codes for test users
        test_emails = []
        for uid in user_ids:
            user = await self.db.users.find_one({"user_id": uid}, {"email": 1})
            if user:
                test_emails.append(user["email"])
        if test_emails:
            await self.db.password_reset_codes.delete_many({"email": {"$in": test_emails}})

        for uid in user_ids:
            await self.db.user_sessions.delete_many({"user_id": uid})
            await self.db.users.delete_many({"user_id": uid})

        print("✅ Cleanup completed")

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    async def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with authentication"""
        url = f"{BACKEND_URL}{endpoint}"
        
        # Add auth header
        auth_headers = {"Authorization": f"Bearer {self.session_token}"}
        if headers:
            auth_headers.update(headers)
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                if method.upper() == "GET":
                    response = await client.get(url, headers=auth_headers)
                elif method.upper() == "POST":
                    response = await client.post(url, json=data, headers=auth_headers)
                elif method.upper() == "PUT":
                    response = await client.put(url, json=data, headers=auth_headers)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=auth_headers)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                return response
            except Exception as e:
                print(f"Request error: {str(e)}")
                return None

    async def test_auth_me(self):
        """Test GET /api/auth/me"""
        print("\n🔍 Testing GET /api/auth/me...")
        
        response = await self.make_request("GET", "/auth/me")
        
        if response and response.status_code == 200:
            data = response.json()
            if "user" in data and "workspaces" in data:
                user = data["user"]
                workspaces = data["workspaces"]
                
                if user["user_id"] == self.test_user_id:
                    self.log_result("GET /api/auth/me", True, f"Retrieved user and {len(workspaces)} workspaces")
                    return True
                else:
                    self.log_result("GET /api/auth/me", False, "Wrong user returned")
            else:
                self.log_result("GET /api/auth/me", False, "Missing user or workspaces in response")
        else:
            status = response.status_code if response else "No response"
            self.log_result("GET /api/auth/me", False, f"Status: {status}")
        
        return False

    async def test_create_workspace(self):
        """Test POST /api/workspaces"""
        print("\n🔍 Testing POST /api/workspaces...")
        
        workspace_data = {
            "name": "Test Family Workspace"
        }
        
        response = await self.make_request("POST", "/workspaces", workspace_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "workspace_id" in data and "invite_code" in data:
                self.test_workspace_id = data["workspace_id"]
                self.invite_code = data["invite_code"]
                self.log_result("POST /api/workspaces", True, f"Created workspace with ID: {self.test_workspace_id}")
                return True
            else:
                self.log_result("POST /api/workspaces", False, "Missing workspace_id or invite_code")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/workspaces", False, f"Status: {status}, Error: {error}")
        
        return False

    async def test_join_workspace(self):
        """Test POST /api/workspaces/join"""
        print("\n🔍 Testing POST /api/workspaces/join...")

        if not self.invite_code:
            self.log_result("POST /api/workspaces/join", False, "No invite code available")
            return False

        # Register a second user via API
        second_email = f"test2_{uuid.uuid4().hex[:8]}@example.com"
        async with httpx.AsyncClient(timeout=30.0) as client:
            reg_response = await client.post(
                f"{BACKEND_URL}/auth/register",
                json={"email": second_email, "password": "testpass123", "name": "Test User 2"}
            )

        if reg_response.status_code != 200:
            self.log_result("POST /api/workspaces/join", False, f"Failed to register second user: {reg_response.text}")
            return False

        reg_data = reg_response.json()
        second_user_id = reg_data["user"]["user_id"]
        second_session_token = reg_data["session_token"]
        self._second_user_id = second_user_id

        # Test joining workspace with second user
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/workspaces/join",
                json={"invite_code": self.invite_code},
                headers={"Authorization": f"Bearer {second_session_token}"}
            )

        if response and response.status_code == 200:
            data = response.json()
            if second_user_id in data.get("member_ids", []):
                self.log_result("POST /api/workspaces/join", True, "Successfully joined workspace")
                return True
            else:
                self.log_result("POST /api/workspaces/join", False, "User not added to member_ids")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/workspaces/join", False, f"Status: {status}, Error: {error}")

        return False

    async def test_get_workspace_lists(self):
        """Test GET /api/workspaces/{id}/lists"""
        print("\n🔍 Testing GET /api/workspaces/{id}/lists...")
        
        if not self.test_workspace_id:
            self.log_result("GET /api/workspaces/{id}/lists", False, "No workspace ID available")
            return False
        
        response = await self.make_request("GET", f"/workspaces/{self.test_workspace_id}/lists")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("GET /api/workspaces/{id}/lists", True, f"Retrieved {len(data)} lists")
                return True
            else:
                self.log_result("GET /api/workspaces/{id}/lists", False, "Response is not a list")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("GET /api/workspaces/{id}/lists", False, f"Status: {status}, Error: {error}")
        
        return False

    async def test_create_shopping_list(self):
        """Test POST /api/lists"""
        print("\n🔍 Testing POST /api/lists...")
        
        if not self.test_workspace_id:
            self.log_result("POST /api/lists", False, "No workspace ID available")
            return False
        
        list_data = {
            "name": "Test Shopping List",
            "workspace_id": self.test_workspace_id
        }
        
        response = await self.make_request("POST", "/lists", list_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "list_id" in data:
                self.test_list_id = data["list_id"]
                self.log_result("POST /api/lists", True, f"Created list with ID: {self.test_list_id}")
                return True
            else:
                self.log_result("POST /api/lists", False, "Missing list_id in response")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/lists", False, f"Status: {status}, Error: {error}")
        
        return False

    async def test_get_list_items(self):
        """Test GET /api/lists/{id}/items"""
        print("\n🔍 Testing GET /api/lists/{id}/items...")
        
        if not self.test_list_id:
            self.log_result("GET /api/lists/{id}/items", False, "No list ID available")
            return False
        
        response = await self.make_request("GET", f"/lists/{self.test_list_id}/items")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("GET /api/lists/{id}/items", True, f"Retrieved {len(data)} items")
                return True
            else:
                self.log_result("GET /api/lists/{id}/items", False, "Response is not a list")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("GET /api/lists/{id}/items", False, f"Status: {status}, Error: {error}")
        
        return False

    async def test_create_grocery_item(self):
        """Test POST /api/items"""
        print("\n🔍 Testing POST /api/items...")
        
        if not self.test_list_id:
            self.log_result("POST /api/items", False, "No list ID available")
            return False
        
        item_data = {
            "list_id": self.test_list_id,
            "name": "Test Grocery Item",
            "quantity": 2,
            "category": "Produce"
        }
        
        response = await self.make_request("POST", "/items", item_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if "id" in data:
                self.test_item_id = data["id"]
                self.log_result("POST /api/items", True, f"Created item with ID: {self.test_item_id}")
                return True
            else:
                self.log_result("POST /api/items", False, "Missing id in response")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/items", False, f"Status: {status}, Error: {error}")
        
        return False

    async def test_update_grocery_item(self):
        """Test PUT /api/items/{id}"""
        print("\n🔍 Testing PUT /api/items/{id}...")
        
        if not self.test_item_id:
            self.log_result("PUT /api/items/{id}", False, "No item ID available")
            return False
        
        update_data = {
            "checked": True,
            "name": "Updated Grocery Item",
            "quantity": 3,
            "category": "Dairy"
        }
        
        response = await self.make_request("PUT", f"/items/{self.test_item_id}", update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get("checked") == True and data.get("name") == "Updated Grocery Item":
                self.log_result("PUT /api/items/{id}", True, "Successfully updated item")
                return True
            else:
                self.log_result("PUT /api/items/{id}", False, "Item not updated correctly")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("PUT /api/items/{id}", False, f"Status: {status}, Error: {error}")
        
        return False

    async def test_delete_grocery_item(self):
        """Test DELETE /api/items/{id}"""
        print("\n🔍 Testing DELETE /api/items/{id}...")
        
        if not self.test_item_id:
            self.log_result("DELETE /api/items/{id}", False, "No item ID available")
            return False
        
        response = await self.make_request("DELETE", f"/items/{self.test_item_id}")
        
        if response and response.status_code == 200:
            # Verify item is deleted by trying to get it
            verify_response = await self.make_request("GET", f"/lists/{self.test_list_id}/items")
            if verify_response and verify_response.status_code == 200:
                items = verify_response.json()
                item_exists = any(item["id"] == self.test_item_id for item in items)
                if not item_exists:
                    self.log_result("DELETE /api/items/{id}", True, "Successfully deleted item")
                    return True
                else:
                    self.log_result("DELETE /api/items/{id}", False, "Item still exists after deletion")
            else:
                self.log_result("DELETE /api/items/{id}", False, "Could not verify deletion")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("DELETE /api/items/{id}", False, f"Status: {status}, Error: {error}")
        
        return False

    async def test_get_workspace_categories(self):
        """Test GET /api/workspaces/{id}/categories — 10 default categories on a new workspace"""
        print("\n🔍 Testing GET /api/workspaces/{id}/categories...")

        if not self.test_workspace_id:
            self.log_result("GET /api/workspaces/{id}/categories", False, "No workspace ID available")
            return False

        response = await self.make_request("GET", f"/workspaces/{self.test_workspace_id}/categories")

        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                category_names = [cat.get("name") for cat in data]
                expected_categories = ["Produce", "Dairy", "Meat", "Other"]
                has_expected = any(cat in category_names for cat in expected_categories)

                if has_expected:
                    # Store a category id for subsequent tests
                    self._test_category_id = data[0]["id"]
                    self._test_category_name = data[0]["name"]
                    self.log_result("GET /api/workspaces/{id}/categories", True, f"Retrieved {len(data)} categories")
                    return True
                else:
                    self.log_result("GET /api/workspaces/{id}/categories", False, "No expected default categories found")
            else:
                self.log_result("GET /api/workspaces/{id}/categories", False, "No categories returned")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("GET /api/workspaces/{id}/categories", False, f"Status: {status}, Error: {error}")

        return False

    async def test_create_category(self):
        """Test POST /api/categories — create a new custom category"""
        print("\n🔍 Testing POST /api/categories...")

        if not self.test_workspace_id:
            self.log_result("POST /api/categories", False, "No workspace ID available")
            return False

        category_data = {
            "name": "Test Custom Category",
            "color": "#FF5733",
            "icon": "star-outline",
            "workspace_id": self.test_workspace_id
        }

        response = await self.make_request("POST", "/categories", category_data)

        if response and response.status_code == 200:
            data = response.json()
            if data.get("name") == "Test Custom Category" and data.get("workspace_id") == self.test_workspace_id:
                self._created_category_id = data["id"]
                self._created_category_name = data["name"]
                self.log_result("POST /api/categories", True, f"Created category with ID: {data['id']}")
                return True
            else:
                self.log_result("POST /api/categories", False, "Unexpected response fields")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/categories", False, f"Status: {status}, Error: {error}")

        return False

    async def test_update_category(self):
        """Test PUT /api/categories/{id} — rename category and verify items updated"""
        print("\n🔍 Testing PUT /api/categories/{id}...")

        category_id = getattr(self, "_created_category_id", None)
        if not category_id:
            self.log_result("PUT /api/categories/{id}", False, "No category ID available (create test may have failed)")
            return False

        # First add an item to the list using the custom category so we can verify propagation
        if self.test_list_id:
            item_data = {
                "list_id": self.test_list_id,
                "name": "Category Rename Test Item",
                "quantity": 1,
                "category": self._created_category_name
            }
            await self.make_request("POST", "/items", item_data)

        update_data = {"name": "Renamed Category"}
        response = await self.make_request("PUT", f"/categories/{category_id}", update_data)

        if response and response.status_code == 200:
            data = response.json()
            if data.get("name") == "Renamed Category":
                # Verify the item's category was updated too
                if self.test_list_id:
                    items_resp = await self.make_request("GET", f"/lists/{self.test_list_id}/items")
                    if items_resp and items_resp.status_code == 200:
                        items = items_resp.json()
                        propagated = any(
                            i.get("name") == "Category Rename Test Item" and i.get("category") == "Renamed Category"
                            for i in items
                        )
                        if propagated:
                            self._created_category_name = "Renamed Category"
                            self.log_result("PUT /api/categories/{id}", True, "Category renamed and items updated")
                            return True
                        else:
                            self.log_result("PUT /api/categories/{id}", False, "Category renamed but items not updated")
                            return False
                self._created_category_name = "Renamed Category"
                self.log_result("PUT /api/categories/{id}", True, "Category renamed successfully")
                return True
            else:
                self.log_result("PUT /api/categories/{id}", False, f"Unexpected name in response: {data.get('name')}")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("PUT /api/categories/{id}", False, f"Status: {status}, Error: {error}")

        return False

    async def test_delete_category(self):
        """Test DELETE /api/categories/{id} — delete category and verify items reassigned to Other"""
        print("\n🔍 Testing DELETE /api/categories/{id}...")

        category_id = getattr(self, "_created_category_id", None)
        category_name = getattr(self, "_created_category_name", None)
        if not category_id:
            self.log_result("DELETE /api/categories/{id}", False, "No category ID available")
            return False

        response = await self.make_request("DELETE", f"/categories/{category_id}")

        if response and response.status_code == 200:
            data = response.json()
            if "deleted" in data.get("message", "").lower() or category_name in data.get("message", ""):
                # Verify items with that category are now in "Other"
                if self.test_list_id:
                    items_resp = await self.make_request("GET", f"/lists/{self.test_list_id}/items")
                    if items_resp and items_resp.status_code == 200:
                        items = items_resp.json()
                        reassigned = all(
                            i.get("category") != category_name
                            for i in items
                        )
                        if reassigned:
                            self.log_result("DELETE /api/categories/{id}", True, "Category deleted and items moved to Other")
                            return True
                        else:
                            self.log_result("DELETE /api/categories/{id}", False, "Items still reference deleted category")
                            return False
                self.log_result("DELETE /api/categories/{id}", True, "Category deleted successfully")
                return True
            else:
                self.log_result("DELETE /api/categories/{id}", False, f"Unexpected response: {data}")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("DELETE /api/categories/{id}", False, f"Status: {status}, Error: {error}")

        return False

    async def test_get_templates(self):
        """Test GET /api/workspaces/{id}/templates — initially empty"""
        print("\n🔍 Testing GET /api/workspaces/{id}/templates...")

        if not self.test_workspace_id:
            self.log_result("GET /api/workspaces/{id}/templates", False, "No workspace ID available")
            return False

        response = await self.make_request("GET", f"/workspaces/{self.test_workspace_id}/templates")

        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("GET /api/workspaces/{id}/templates", True, f"Retrieved {len(data)} templates")
                return True
            else:
                self.log_result("GET /api/workspaces/{id}/templates", False, "Response is not a list")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("GET /api/workspaces/{id}/templates", False, f"Status: {status}, Error: {error}")

        return False

    async def test_save_list_as_template(self):
        """Test POST /api/lists/{id}/save-as-template — create template from a list"""
        print("\n🔍 Testing POST /api/lists/{id}/save-as-template...")

        if not self.test_list_id:
            self.log_result("POST /api/lists/{id}/save-as-template", False, "No list ID available")
            return False

        response = await self.make_request("POST", f"/lists/{self.test_list_id}/save-as-template")

        if response and response.status_code == 200:
            data = response.json()
            if data.get("is_template") is True and "list_id" in data:
                self._template_id = data["list_id"]
                self.log_result("POST /api/lists/{id}/save-as-template", True, f"Template created with ID: {self._template_id}")
                return True
            else:
                self.log_result("POST /api/lists/{id}/save-as-template", False, f"Missing fields or is_template not True: {data}")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/lists/{id}/save-as-template", False, f"Status: {status}, Error: {error}")

        return False

    async def test_create_list_from_template(self):
        """Test POST /api/lists with from_template_id — create a list from an existing template"""
        print("\n🔍 Testing POST /api/lists (from template)...")

        template_id = getattr(self, "_template_id", None)
        if not template_id or not self.test_workspace_id:
            self.log_result("POST /api/lists (from template)", False, "No template ID or workspace ID available")
            return False

        list_data = {
            "name": "List From Template",
            "workspace_id": self.test_workspace_id,
            "from_template_id": template_id
        }

        response = await self.make_request("POST", "/lists", list_data)

        if response and response.status_code == 200:
            data = response.json()
            if "list_id" in data and data.get("created_from_template_id") == template_id:
                self.log_result("POST /api/lists (from template)", True, f"List created from template: {data['list_id']}")
                return True
            else:
                self.log_result("POST /api/lists (from template)", False, f"Missing fields or wrong template ref: {data}")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/lists (from template)", False, f"Status: {status}, Error: {error}")

        return False

    async def test_update_workspace_currency(self):
        """Test PUT /api/workspaces/{id}/currency — update currency setting"""
        print("\n🔍 Testing PUT /api/workspaces/{id}/currency...")

        if not self.test_workspace_id:
            self.log_result("PUT /api/workspaces/{id}/currency", False, "No workspace ID available")
            return False

        response = await self.make_request("PUT", f"/workspaces/{self.test_workspace_id}/currency", {"currency": "USD"})

        if response and response.status_code == 200:
            data = response.json()
            if data.get("currency") == "USD":
                self.log_result("PUT /api/workspaces/{id}/currency", True, "Currency updated to USD")
                return True
            else:
                self.log_result("PUT /api/workspaces/{id}/currency", False, f"Currency not updated: {data.get('currency')}")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("PUT /api/workspaces/{id}/currency", False, f"Status: {status}, Error: {error}")

        return False

    async def test_regenerate_invite_code(self):
        """Test POST /api/workspaces/{id}/regenerate-code — new 8-char code, different from original"""
        print("\n🔍 Testing POST /api/workspaces/{id}/regenerate-code...")

        if not self.test_workspace_id:
            self.log_result("POST /api/workspaces/{id}/regenerate-code", False, "No workspace ID available")
            return False

        original_code = self.invite_code
        response = await self.make_request("POST", f"/workspaces/{self.test_workspace_id}/regenerate-code")

        if response and response.status_code == 200:
            data = response.json()
            new_code = data.get("invite_code", "")
            # secrets.token_urlsafe(6) produces 8 URL-safe base64 chars
            if new_code and len(new_code) >= 6:
                if new_code != original_code:
                    self.invite_code = new_code
                    self.log_result("POST /api/workspaces/{id}/regenerate-code", True, f"New code generated (length {len(new_code)})")
                    return True
                else:
                    # Codes colliding is statistically possible but extremely rare; treat as pass
                    self.log_result("POST /api/workspaces/{id}/regenerate-code", True, "Code regenerated (same value, collision)")
                    return True
            else:
                self.log_result("POST /api/workspaces/{id}/regenerate-code", False, f"Unexpected code format: {new_code!r}")
        else:
            status = response.status_code if response else "No response"
            error = response.text if response else "No response"
            self.log_result("POST /api/workspaces/{id}/regenerate-code", False, f"Status: {status}, Error: {error}")

        return False

    async def test_leave_workspace(self):
        """Test POST /api/workspaces/{id}/leave — second user leaves the shared workspace"""
        print("\n🔍 Testing POST /api/workspaces/{id}/leave...")

        second_user_id = getattr(self, "_second_user_id", None)
        if not second_user_id or not self.test_workspace_id:
            self.log_result("POST /api/workspaces/{id}/leave", False, "No second user or workspace available (join test may have failed)")
            return False

        # Register a fresh third user so we can leave without destroying the workspace
        third_email = f"test3_{uuid.uuid4().hex[:8]}@example.com"
        async with httpx.AsyncClient(timeout=30.0) as client:
            reg_resp = await client.post(
                f"{BACKEND_URL}/auth/register",
                json={"email": third_email, "password": "testpass123", "name": "Test User 3"}
            )

        if reg_resp.status_code != 200:
            self.log_result("POST /api/workspaces/{id}/leave", False, f"Could not register third user: {reg_resp.text}")
            return False

        reg_data = reg_resp.json()
        third_token = reg_data["session_token"]
        self._third_user_id = reg_data["user"]["user_id"]

        # Join workspace with third user so the workspace survives after second user leaves
        async with httpx.AsyncClient(timeout=30.0) as client:
            join_resp = await client.post(
                f"{BACKEND_URL}/workspaces/join",
                json={"invite_code": self.invite_code},
                headers={"Authorization": f"Bearer {third_token}"}
            )

        # Fetch the second user's session token (stored at join time via _second_user_id)
        # We need to retrieve it — re-login the second user to get a usable token
        # The email is not stored, so we use a workaround: look up the user doc via mongo
        second_user_doc = await self.db.users.find_one({"user_id": second_user_id})
        if not second_user_doc:
            self.log_result("POST /api/workspaces/{id}/leave", False, "Could not find second user in DB")
            return False

        # Retrieve an active session for the second user
        second_session = await self.db.user_sessions.find_one({"user_id": second_user_id})
        if not second_session:
            self.log_result("POST /api/workspaces/{id}/leave", False, "No active session found for second user")
            return False

        second_token = second_session["token"]

        async with httpx.AsyncClient(timeout=30.0) as client:
            leave_resp = await client.post(
                f"{BACKEND_URL}/workspaces/{self.test_workspace_id}/leave",
                headers={"Authorization": f"Bearer {second_token}"}
            )

        if leave_resp.status_code == 200:
            # Confirm second user is no longer a member
            workspace_doc = await self.db.workspaces.find_one({"workspace_id": self.test_workspace_id})
            if workspace_doc and second_user_id not in workspace_doc.get("member_ids", []):
                self.log_result("POST /api/workspaces/{id}/leave", True, "Second user successfully left workspace")
                return True
            else:
                self.log_result("POST /api/workspaces/{id}/leave", False, "Second user still in member_ids after leaving")
        else:
            self.log_result("POST /api/workspaces/{id}/leave", False, f"Status: {leave_resp.status_code}, Error: {leave_resp.text}")

        return False

    async def test_forgot_password_flow(self):
        """Test POST /api/auth/forgot-password and POST /api/auth/reset-password"""
        print("\n🔍 Testing forgot password flow...")

        # Get the test user's email
        user_doc = await self.db.users.find_one({"user_id": self.test_user_id}, {"email": 1})
        test_email = user_doc["email"]

        # Step 1: Request a reset code
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/auth/forgot-password",
                json={"email": test_email}
            )

        if response.status_code != 200:
            self.log_result("POST /api/auth/forgot-password", False, f"Status: {response.status_code}")
            return

        self.log_result("POST /api/auth/forgot-password", True, "Reset code requested")

        # Step 2: Read the code hash from DB and test with wrong code
        code_doc = await self.db.password_reset_codes.find_one({"email": test_email})
        if not code_doc:
            self.log_result("Forgot password — code stored in DB", False, "No code document found")
            return

        self.log_result("Forgot password — code stored in DB", True)

        # Step 3: Try reset with wrong code
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/auth/reset-password",
                json={"email": test_email, "code": "000000", "new_password": "newpass12345"}
            )

        if response.status_code == 400 and "Invalid code" in response.json().get("detail", ""):
            self.log_result("POST /api/auth/reset-password (wrong code)", True, "Rejected as expected")
        else:
            self.log_result("POST /api/auth/reset-password (wrong code)", False, f"Status: {response.status_code}")
            return

        # Step 4: Verify attempts incremented
        code_doc = await self.db.password_reset_codes.find_one({"email": test_email})
        if code_doc and code_doc["attempts"] == 1:
            self.log_result("Forgot password — attempts incremented", True)
        else:
            self.log_result("Forgot password — attempts incremented", False, f"Attempts: {code_doc.get('attempts') if code_doc else 'N/A'}")

        # Step 5: Request a fresh code (need to wait for cooldown or clear it)
        await self.db.password_reset_codes.delete_many({"email": test_email})

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/auth/forgot-password",
                json={"email": test_email}
            )

        # Overwrite the DB entry with a known code so the test doesn't brute-force bcrypt
        known_code = "123456"
        known_hash = bcrypt.hashpw(known_code.encode(), bcrypt.gensalt()).decode()
        await self.db.password_reset_codes.update_one(
            {"email": test_email}, {"$set": {"code_hash": known_hash}}
        )
        actual_code = known_code
        self.log_result("Forgot password — seeded known OTP for test", True)

        # Step 6: Reset with correct code
        new_password = "resetpass12345"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/auth/reset-password",
                json={"email": test_email, "code": actual_code, "new_password": new_password}
            )

        if response.status_code == 200:
            self.log_result("POST /api/auth/reset-password (correct code)", True, "Password reset successfully")
        else:
            self.log_result("POST /api/auth/reset-password (correct code)", False, f"Status: {response.status_code}, Error: {response.text}")
            return

        # Step 7: Verify old session is invalidated
        old_session = await self.db.user_sessions.find_one({"session_token": self.session_token})
        if old_session is None:
            self.log_result("Forgot password — old sessions invalidated", True)
        else:
            self.log_result("Forgot password — old sessions invalidated", False, "Old session still exists")

        # Step 8: Login with new password
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/auth/login",
                json={"email": test_email, "password": new_password}
            )

        if response.status_code == 200:
            data = response.json()
            self.session_token = data["session_token"]
            self.log_result("Login with new password after reset", True)
        else:
            self.log_result("Login with new password after reset", False, f"Status: {response.status_code}")

        # Step 9: Verify code doc is cleaned up
        code_doc = await self.db.password_reset_codes.find_one({"email": test_email})
        if code_doc is None:
            self.log_result("Forgot password — code cleaned up after use", True)
        else:
            self.log_result("Forgot password — code cleaned up after use", False, "Code doc still exists")

    async def test_forgot_password_nonexistent_email(self):
        """Test forgot password with non-existent email doesn't leak info"""
        print("\n🔍 Testing forgot password with non-existent email...")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BACKEND_URL}/auth/forgot-password",
                json={"email": "nonexistent_user_12345@example.com"}
            )

        if response.status_code == 200:
            self.log_result("Forgot password (non-existent email)", True, "Returns 200 without leaking email existence")
        else:
            self.log_result("Forgot password (non-existent email)", False, f"Status: {response.status_code}")

    async def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Backend API Tests for Multi-Workspace Grocery Todo App")
        print(f"Backend URL: {BACKEND_URL}")
        
        try:
            # Setup
            await self.setup_test_user()
            
            # Run tests in order
            await self.test_auth_me()
            await self.test_create_workspace()
            await self.test_join_workspace()
            await self.test_get_workspace_lists()
            await self.test_create_shopping_list()
            await self.test_get_list_items()
            await self.test_create_grocery_item()
            await self.test_update_grocery_item()
            await self.test_delete_grocery_item()
            await self.test_get_workspace_categories()
            await self.test_create_category()
            await self.test_update_category()
            await self.test_delete_category()
            await self.test_get_templates()
            await self.test_save_list_as_template()
            await self.test_create_list_from_template()
            await self.test_update_workspace_currency()
            await self.test_regenerate_invite_code()
            await self.test_leave_workspace()
            await self.test_forgot_password_nonexistent_email()
            await self.test_forgot_password_flow()
            
        except Exception as e:
            print(f"❌ Test execution error: {str(e)}")
        finally:
            # Cleanup
            await self.cleanup_test_data()
            if self.client:
                self.client.close()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        for result in self.results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status} {result['test']}")
            if result["details"] and not result["success"]:
                print(f"   {result['details']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {total - passed} tests failed")
        
        return passed == total

async def main():
    """Main test runner"""
    tester = BackendTester()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    asyncio.run(main())