#!/usr/bin/env python3
"""
Backend API Testing for Grocery Todo App
Tests all CRUD operations for grocery items
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://shop-multi-list.preview.emergentagent.com/api"

class GroceryAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.created_items = []  # Track created items for cleanup
        self.test_results = []
        
    def log_test(self, test_name, success, message=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status}: {test_name}"
        if message:
            result += f" - {message}"
        print(result)
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message
        })
        
    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("API Root Endpoint", True, f"Response: {data['message']}")
                    return True
            self.log_test("API Root Endpoint", False, f"Status: {response.status_code}")
            return False
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Error: {str(e)}")
            return False
    
    def test_get_groceries_empty(self):
        """Test GET /api/groceries when empty"""
        try:
            response = requests.get(f"{self.base_url}/groceries")
            if response.status_code == 200:
                items = response.json()
                if isinstance(items, list):
                    self.log_test("GET groceries (empty)", True, f"Returned {len(items)} items")
                    return True
            self.log_test("GET groceries (empty)", False, f"Status: {response.status_code}")
            return False
        except Exception as e:
            self.log_test("GET groceries (empty)", False, f"Error: {str(e)}")
            return False
    
    def test_create_grocery_item(self, name):
        """Test POST /api/groceries - Create new item"""
        try:
            payload = {"name": name}
            response = requests.post(f"{self.base_url}/groceries", json=payload)
            
            if response.status_code == 200:
                item = response.json()
                # Validate response structure
                required_fields = ['id', 'name', 'checked', 'created_at']
                if all(field in item for field in required_fields):
                    if item['name'] == name and item['checked'] == False:
                        self.created_items.append(item['id'])
                        self.log_test(f"CREATE grocery '{name}'", True, f"ID: {item['id']}")
                        return item
                    else:
                        self.log_test(f"CREATE grocery '{name}'", False, "Invalid field values")
                else:
                    self.log_test(f"CREATE grocery '{name}'", False, "Missing required fields")
            else:
                self.log_test(f"CREATE grocery '{name}'", False, f"Status: {response.status_code}")
            return None
        except Exception as e:
            self.log_test(f"CREATE grocery '{name}'", False, f"Error: {str(e)}")
            return None
    
    def test_create_empty_name(self):
        """Test POST /api/groceries with empty name (should fail)"""
        try:
            payload = {"name": ""}
            response = requests.post(f"{self.base_url}/groceries", json=payload)
            
            if response.status_code == 400:
                self.log_test("CREATE grocery (empty name)", True, "Correctly rejected empty name")
                return True
            else:
                self.log_test("CREATE grocery (empty name)", False, f"Should return 400, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("CREATE grocery (empty name)", False, f"Error: {str(e)}")
            return False
    
    def test_get_groceries_with_items(self):
        """Test GET /api/groceries with items"""
        try:
            response = requests.get(f"{self.base_url}/groceries")
            if response.status_code == 200:
                items = response.json()
                if isinstance(items, list) and len(items) > 0:
                    # Check if items are sorted by created_at descending
                    if len(items) > 1:
                        dates = [item.get('created_at') for item in items]
                        is_sorted = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
                        sort_msg = "sorted correctly" if is_sorted else "NOT sorted correctly"
                    else:
                        sort_msg = "single item"
                    
                    self.log_test("GET groceries (with items)", True, f"{len(items)} items, {sort_msg}")
                    return items
                else:
                    self.log_test("GET groceries (with items)", False, "No items returned")
            else:
                self.log_test("GET groceries (with items)", False, f"Status: {response.status_code}")
            return None
        except Exception as e:
            self.log_test("GET groceries (with items)", False, f"Error: {str(e)}")
            return None
    
    def test_update_grocery_checked(self, item_id, checked_status):
        """Test PUT /api/groceries/{id} - Update checked status"""
        try:
            payload = {"checked": checked_status}
            response = requests.put(f"{self.base_url}/groceries/{item_id}", json=payload)
            
            if response.status_code == 200:
                item = response.json()
                if item.get('checked') == checked_status:
                    self.log_test(f"UPDATE grocery checked={checked_status}", True, f"ID: {item_id}")
                    return item
                else:
                    self.log_test(f"UPDATE grocery checked={checked_status}", False, "Checked status not updated")
            else:
                self.log_test(f"UPDATE grocery checked={checked_status}", False, f"Status: {response.status_code}")
            return None
        except Exception as e:
            self.log_test(f"UPDATE grocery checked={checked_status}", False, f"Error: {str(e)}")
            return None
    
    def test_update_grocery_name(self, item_id, new_name):
        """Test PUT /api/groceries/{id} - Update name"""
        try:
            payload = {"name": new_name}
            response = requests.put(f"{self.base_url}/groceries/{item_id}", json=payload)
            
            if response.status_code == 200:
                item = response.json()
                if item.get('name') == new_name:
                    self.log_test(f"UPDATE grocery name='{new_name}'", True, f"ID: {item_id}")
                    return item
                else:
                    self.log_test(f"UPDATE grocery name='{new_name}'", False, "Name not updated")
            else:
                self.log_test(f"UPDATE grocery name='{new_name}'", False, f"Status: {response.status_code}")
            return None
        except Exception as e:
            self.log_test(f"UPDATE grocery name='{new_name}'", False, f"Error: {str(e)}")
            return None
    
    def test_update_nonexistent_item(self):
        """Test PUT /api/groceries/{id} with non-existent ID (should 404)"""
        try:
            fake_id = "non-existent-id-12345"
            payload = {"checked": True}
            response = requests.put(f"{self.base_url}/groceries/{fake_id}", json=payload)
            
            if response.status_code == 404:
                self.log_test("UPDATE non-existent item", True, "Correctly returned 404")
                return True
            else:
                self.log_test("UPDATE non-existent item", False, f"Should return 404, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("UPDATE non-existent item", False, f"Error: {str(e)}")
            return False
    
    def test_delete_grocery(self, item_id):
        """Test DELETE /api/groceries/{id}"""
        try:
            response = requests.delete(f"{self.base_url}/groceries/{item_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test(f"DELETE grocery", True, f"ID: {item_id}")
                    # Remove from tracking list
                    if item_id in self.created_items:
                        self.created_items.remove(item_id)
                    return True
            self.log_test(f"DELETE grocery", False, f"Status: {response.status_code}")
            return False
        except Exception as e:
            self.log_test(f"DELETE grocery", False, f"Error: {str(e)}")
            return False
    
    def test_delete_nonexistent_item(self):
        """Test DELETE /api/groceries/{id} with non-existent ID (should 404)"""
        try:
            fake_id = "non-existent-id-12345"
            response = requests.delete(f"{self.base_url}/groceries/{fake_id}")
            
            if response.status_code == 404:
                self.log_test("DELETE non-existent item", True, "Correctly returned 404")
                return True
            else:
                self.log_test("DELETE non-existent item", False, f"Should return 404, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("DELETE non-existent item", False, f"Error: {str(e)}")
            return False
    
    def cleanup(self):
        """Clean up any remaining test items"""
        for item_id in self.created_items[:]:
            try:
                requests.delete(f"{self.base_url}/groceries/{item_id}")
                self.created_items.remove(item_id)
            except:
                pass
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print(f"🧪 Starting Grocery API Tests")
        print(f"📍 Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test 1: API Root
        self.test_api_root()
        
        # Test 2: Get groceries when empty
        self.test_get_groceries_empty()
        
        # Test 3: Create multiple grocery items
        grocery_items = ["Organic Milk", "Free Range Eggs", "Whole Wheat Bread", "Fresh Spinach", "Greek Yogurt"]
        created_items = []
        
        for item_name in grocery_items:
            item = self.test_create_grocery_item(item_name)
            if item:
                created_items.append(item)
        
        # Test 4: Test empty name validation
        self.test_create_empty_name()
        
        # Test 5: Get groceries with items
        items = self.test_get_groceries_with_items()
        
        # Test 6: Update operations (if we have items)
        if created_items:
            # Toggle checked status
            first_item = created_items[0]
            self.test_update_grocery_checked(first_item['id'], True)
            self.test_update_grocery_checked(first_item['id'], False)
            
            # Update name
            if len(created_items) > 1:
                second_item = created_items[1]
                self.test_update_grocery_name(second_item['id'], "Updated Eggs - Organic")
        
        # Test 7: Update non-existent item
        self.test_update_nonexistent_item()
        
        # Test 8: Delete operations
        if created_items:
            # Delete one item
            self.test_delete_grocery(created_items[0]['id'])
        
        # Test 9: Delete non-existent item
        self.test_delete_nonexistent_item()
        
        # Cleanup remaining items
        self.cleanup()
        
        # Summary
        print("=" * 60)
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests PASSED!")
            return True
        else:
            print("⚠️  Some tests FAILED!")
            failed_tests = [r for r in self.test_results if not r['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['message']}")
            return False

def main():
    """Main test execution"""
    tester = GroceryAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()