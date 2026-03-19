#!/usr/bin/env python3
"""
Backend API Testing for Multi-Workspace Grocery Todo App
Tests all backend APIs with proper authentication setup
"""

import asyncio
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
        """Test GET /api/workspaces/{id}/categories"""
        print("\n🔍 Testing GET /api/workspaces/{id}/categories...")
        
        if not self.test_workspace_id:
            self.log_result("GET /api/workspaces/{id}/categories", False, "No workspace ID available")
            return False
        
        response = await self.make_request("GET", f"/workspaces/{self.test_workspace_id}/categories")
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if default categories exist
                category_names = [cat.get("name") for cat in data]
                expected_categories = ["Produce", "Dairy", "Meat", "Other"]
                has_expected = any(cat in category_names for cat in expected_categories)
                
                if has_expected:
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