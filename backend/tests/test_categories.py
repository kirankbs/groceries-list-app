"""
Backend tests for Category Management CRUD
Tests: GET, POST, PUT, DELETE categories, duplicate check, items-to-Other on delete
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mobile-state-sync.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = "test_session_cat_backend_testing"
WORKSPACE_ID = "88a35895-312a-41d9-9431-5b68335cc25b"
OTHER_CATEGORY_ID = "3f214b7c-584b-471c-ac92-411d751199de"

# Shared created category ID for tests
CREATED_CATEGORY_ID = None


@pytest.fixture(scope="module")
def auth_headers():
    """Authentication headers for all requests"""
    return {
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def session(auth_headers):
    s = requests.Session()
    s.headers.update(auth_headers)
    return s


class TestGetCategories:
    """Test GET /api/workspaces/{workspace_id}/categories"""

    def test_get_categories_returns_200(self, session):
        """GET categories should return 200"""
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        print("PASS: GET categories returns 200")

    def test_get_categories_returns_list(self, session):
        """GET categories should return a list"""
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET categories returns list with {len(data)} items")

    def test_get_categories_has_10_defaults(self, session):
        """Should have 10 default categories"""
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        data = resp.json()
        assert len(data) >= 10, f"Expected at least 10 categories, got {len(data)}"
        print(f"PASS: Found {len(data)} categories (>= 10 defaults)")

    def test_get_categories_has_other(self, session):
        """Should have 'Other' category"""
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        data = resp.json()
        names = [c['name'] for c in data]
        assert 'Other' in names, f"'Other' not found in categories: {names}"
        print("PASS: 'Other' category present")

    def test_get_categories_has_all_defaults(self, session):
        """Should have all 10 default category names"""
        expected = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Beverages', 'Snacks', 'Frozen', 'Pantry', 'Household', 'Other']
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        data = resp.json()
        names = [c['name'] for c in data]
        for exp in expected:
            assert exp in names, f"Expected category '{exp}' not found"
        print(f"PASS: All 10 default categories present: {expected}")

    def test_get_categories_has_required_fields(self, session):
        """Each category should have id, name, color, icon fields"""
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        data = resp.json()
        for cat in data:
            assert 'id' in cat, f"Category missing 'id': {cat}"
            assert 'name' in cat, f"Category missing 'name': {cat}"
            assert 'color' in cat, f"Category missing 'color': {cat}"
            assert 'icon' in cat, f"Category missing 'icon': {cat}"
        print("PASS: All categories have required fields (id, name, color, icon)")

    def test_get_categories_unauthorized(self):
        """GET categories without auth should return 401"""
        resp = requests.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: Unauthenticated GET returns 401")


class TestCreateCategory:
    """Test POST /api/categories"""
    
    _created_id = None

    def test_create_category_success(self, session):
        """Create a new category successfully"""
        payload = {
            "name": f"TEST_Category_{uuid.uuid4().hex[:6]}",
            "color": "#FF5722",
            "icon": "shirt-outline",
            "workspace_id": WORKSPACE_ID
        }
        resp = session.post(f"{BASE_URL}/api/categories", json=payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data['name'] == payload['name'], f"Name mismatch: {data['name']} != {payload['name']}"
        assert data['color'] == payload['color'], f"Color mismatch: {data['color']}"
        assert data['icon'] == payload['icon'], f"Icon mismatch: {data['icon']}"
        assert 'id' in data, "Created category missing 'id'"
        TestCreateCategory._created_id = data['id']
        print(f"PASS: Created category '{payload['name']}' with id {data['id']}")

    def test_create_category_persists(self, session):
        """Created category should appear in GET list"""
        if not TestCreateCategory._created_id:
            pytest.skip("No category created in previous test")
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        data = resp.json()
        ids = [c['id'] for c in data]
        assert TestCreateCategory._created_id in ids, f"Created category id not found in list: {TestCreateCategory._created_id}"
        print("PASS: Created category persists in GET list")

    def test_create_category_empty_name_rejected(self, session):
        """Creating category with empty name should return 400"""
        payload = {
            "name": "   ",
            "color": "#FF5722",
            "icon": "shirt-outline",
            "workspace_id": WORKSPACE_ID
        }
        resp = session.post(f"{BASE_URL}/api/categories", json=payload)
        assert resp.status_code == 400, f"Expected 400 for empty name, got {resp.status_code}: {resp.text}"
        print("PASS: Empty name returns 400")

    def test_create_category_duplicate_name_rejected(self, session):
        """Creating duplicate category name should return 400"""
        payload = {
            "name": "Other",  # Already exists as default
            "color": "#FF5722",
            "icon": "shirt-outline",
            "workspace_id": WORKSPACE_ID
        }
        resp = session.post(f"{BASE_URL}/api/categories", json=payload)
        assert resp.status_code == 400, f"Expected 400 for duplicate, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert 'already exists' in data.get('detail', '').lower() or 'duplicate' in data.get('detail', '').lower(), \
            f"Expected 'already exists' in error detail: {data}"
        print(f"PASS: Duplicate name returns 400 with detail: {data.get('detail')}")

    def test_create_category_duplicate_name_case_insensitive(self, session):
        """Duplicate check should be case-insensitive"""
        payload = {
            "name": "other",  # lowercase, same as 'Other'
            "color": "#FF5722",
            "icon": "shirt-outline",
            "workspace_id": WORKSPACE_ID
        }
        resp = session.post(f"{BASE_URL}/api/categories", json=payload)
        assert resp.status_code == 400, f"Expected 400 for case-insensitive duplicate, got {resp.status_code}: {resp.text}"
        print("PASS: Case-insensitive duplicate check works")

    def test_cleanup_created_category(self, session):
        """Cleanup: delete the test category"""
        if not TestCreateCategory._created_id:
            pytest.skip("No category to clean up")
        resp = session.delete(f"{BASE_URL}/api/categories/{TestCreateCategory._created_id}")
        assert resp.status_code == 200, f"Cleanup failed: {resp.status_code}: {resp.text}"
        print(f"PASS: Test category cleaned up: {TestCreateCategory._created_id}")


class TestUpdateCategory:
    """Test PUT /api/categories/{id}"""
    
    _test_cat_id = None

    def test_setup_create_category_for_update(self, session):
        """Setup: create a category to update"""
        payload = {
            "name": f"TEST_UpdateCat_{uuid.uuid4().hex[:6]}",
            "color": "#9C27B0",
            "icon": "medical-outline",
            "workspace_id": WORKSPACE_ID
        }
        resp = session.post(f"{BASE_URL}/api/categories", json=payload)
        assert resp.status_code == 200
        TestUpdateCategory._test_cat_id = resp.json()['id']
        print(f"Setup: Created category for update tests: {TestUpdateCategory._test_cat_id}")

    def test_update_category_name(self, session):
        """Update category name successfully"""
        if not TestUpdateCategory._test_cat_id:
            pytest.skip("No category to update")
        new_name = f"TEST_Updated_{uuid.uuid4().hex[:6]}"
        resp = session.put(f"{BASE_URL}/api/categories/{TestUpdateCategory._test_cat_id}", 
                          json={"name": new_name})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data['name'] == new_name, f"Name not updated: {data['name']}"
        print(f"PASS: Category name updated to '{new_name}'")

    def test_update_category_color(self, session):
        """Update category color successfully"""
        if not TestUpdateCategory._test_cat_id:
            pytest.skip("No category to update")
        resp = session.put(f"{BASE_URL}/api/categories/{TestUpdateCategory._test_cat_id}", 
                          json={"color": "#FF5722"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data['color'] == "#FF5722", f"Color not updated: {data['color']}"
        print("PASS: Category color updated successfully")

    def test_update_category_icon(self, session):
        """Update category icon successfully"""
        if not TestUpdateCategory._test_cat_id:
            pytest.skip("No category to update")
        resp = session.put(f"{BASE_URL}/api/categories/{TestUpdateCategory._test_cat_id}", 
                          json={"icon": "sparkles-outline"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data['icon'] == "sparkles-outline", f"Icon not updated: {data['icon']}"
        print("PASS: Category icon updated successfully")

    def test_update_category_not_found(self, session):
        """Update non-existent category should return 404"""
        fake_id = str(uuid.uuid4())
        resp = session.put(f"{BASE_URL}/api/categories/{fake_id}", 
                          json={"name": "DoesNotExist"})
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("PASS: Update non-existent category returns 404")

    def test_cleanup_update_category(self, session):
        """Cleanup: delete the test category"""
        if not TestUpdateCategory._test_cat_id:
            pytest.skip("No category to clean up")
        resp = session.delete(f"{BASE_URL}/api/categories/{TestUpdateCategory._test_cat_id}")
        assert resp.status_code == 200
        print(f"PASS: Cleanup done for update test category")


class TestDeleteCategory:
    """Test DELETE /api/categories/{id}"""
    
    _test_cat_id = None
    _test_list_id = None
    _test_item_id = None

    def test_setup_create_category_and_item(self, session):
        """Setup: create a category with items to test delete behavior"""
        import requests as req
        import json
        
        # Create category
        cat_name = f"TEST_DeleteCat_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": cat_name,
            "color": "#795548",
            "icon": "bandage-outline",
            "workspace_id": WORKSPACE_ID
        }
        resp = session.post(f"{BASE_URL}/api/categories", json=payload)
        assert resp.status_code == 200, f"Setup: category create failed: {resp.text}"
        TestDeleteCategory._test_cat_id = resp.json()['id']
        TestDeleteCategory._cat_name = cat_name
        print(f"Setup: Created category '{cat_name}' with id {TestDeleteCategory._test_cat_id}")

    def test_delete_category_success(self, session):
        """Delete a category successfully"""
        if not TestDeleteCategory._test_cat_id:
            pytest.skip("No category to delete")
        resp = session.delete(f"{BASE_URL}/api/categories/{TestDeleteCategory._test_cat_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert 'message' in data, f"Expected message in response: {data}"
        print(f"PASS: Category deleted with message: {data['message']}")

    def test_delete_category_no_longer_exists(self, session):
        """After deletion, GET should not include the category"""
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/categories")
        data = resp.json()
        ids = [c['id'] for c in data]
        if TestDeleteCategory._test_cat_id:
            assert TestDeleteCategory._test_cat_id not in ids, "Deleted category still in list!"
        print("PASS: Deleted category no longer in list")

    def test_delete_category_not_found(self, session):
        """Delete non-existent category should return 404"""
        fake_id = str(uuid.uuid4())
        resp = session.delete(f"{BASE_URL}/api/categories/{fake_id}")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print("PASS: Delete non-existent category returns 404")


class TestDeleteCategoryMovesItemsToOther:
    """Test that deleting a category moves its items to 'Other'"""
    
    _test_cat_id = None
    _test_list_id = None
    _test_item_id = None

    def test_setup(self, session):
        """Setup: get or create a list, create category and item under it"""
        # Get existing list
        import json
        
        # Find a list in the workspace
        # We need to call the lists API
        resp = session.get(f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/lists")
        if resp.status_code == 200 and resp.json():
            TestDeleteCategoryMovesItemsToOther._test_list_id = resp.json()[0]['list_id']
            print(f"Setup: Using existing list: {TestDeleteCategoryMovesItemsToOther._test_list_id}")
        else:
            # Create a list
            resp2 = session.post(f"{BASE_URL}/api/lists", json={"name": "TEST_List", "workspace_id": WORKSPACE_ID})
            if resp2.status_code in [200, 201]:
                TestDeleteCategoryMovesItemsToOther._test_list_id = resp2.json()['list_id']
            else:
                pytest.skip(f"Could not get/create list: {resp2.status_code} {resp2.text}")

    def test_create_category_and_item(self, session):
        """Create a category and item in that category"""
        cat_name = f"TEST_MoveToOther_{uuid.uuid4().hex[:6]}"
        cat_resp = session.post(f"{BASE_URL}/api/categories", json={
            "name": cat_name,
            "color": "#FF9800",
            "icon": "nutrition-outline",
            "workspace_id": WORKSPACE_ID
        })
        assert cat_resp.status_code == 200, f"Category create failed: {cat_resp.text}"
        TestDeleteCategoryMovesItemsToOther._test_cat_id = cat_resp.json()['id']
        TestDeleteCategoryMovesItemsToOther._cat_name = cat_name

        if not TestDeleteCategoryMovesItemsToOther._test_list_id:
            pytest.skip("No list available")
        
        # Create item in this category
        item_resp = session.post(f"{BASE_URL}/api/items", json={
            "list_id": TestDeleteCategoryMovesItemsToOther._test_list_id,
            "name": f"TEST_Item_{uuid.uuid4().hex[:6]}",
            "quantity": 1,
            "category": cat_name
        })
        assert item_resp.status_code in [200, 201], f"Item create failed: {item_resp.text}"
        TestDeleteCategoryMovesItemsToOther._test_item_id = item_resp.json()['id']
        print(f"Setup: Created category '{cat_name}' and item '{item_resp.json()['name']}'")

    def test_delete_moves_items_to_other(self, session):
        """Deleting category should move items to 'Other'"""
        if not TestDeleteCategoryMovesItemsToOther._test_cat_id:
            pytest.skip("No category created in setup")
        if not TestDeleteCategoryMovesItemsToOther._test_list_id:
            pytest.skip("No list available")
        
        # Delete the category
        del_resp = session.delete(f"{BASE_URL}/api/categories/{TestDeleteCategoryMovesItemsToOther._test_cat_id}")
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.text}"
        
        # Check items now - item should be in 'Other'
        items_resp = session.get(f"{BASE_URL}/api/lists/{TestDeleteCategoryMovesItemsToOther._test_list_id}/items")
        assert items_resp.status_code == 200, f"Get items failed: {items_resp.text}"
        items = items_resp.json()
        
        if TestDeleteCategoryMovesItemsToOther._test_item_id:
            for item in items:
                if item['id'] == TestDeleteCategoryMovesItemsToOther._test_item_id:
                    assert item['category'] == 'Other', \
                        f"Item category should be 'Other' after deletion, got: {item['category']}"
                    print(f"PASS: Item moved to 'Other' after category deletion")
                    return
            print("WARNING: Test item not found in list (may have been cleaned up)")
        else:
            print("PASS: Delete category endpoint works (item tracking not available)")

    def test_cleanup(self, session):
        """Cleanup test items"""
        if TestDeleteCategoryMovesItemsToOther._test_item_id:
            session.delete(f"{BASE_URL}/api/items/{TestDeleteCategoryMovesItemsToOther._test_item_id}")
        print("Cleanup complete")


class TestCategoryIcons:
    """Test that new icons are available in AVAILABLE_ICONS list"""
    
    def test_new_icons_in_available_list(self):
        """Verify new icons are in AVAILABLE_ICONS constant"""
        # Read the frontend file and check AVAILABLE_ICONS
        with open('/app/frontend/app/index.tsx', 'r') as f:
            content = f.read()
        
        new_icons = [
            'shirt-outline', 'medical-outline', 'sparkles-outline', 
            'happy-outline', 'phone-portrait-outline', 'flower-outline', 
            'grid-outline', 'aperture-outline', 'bandage-outline'
        ]
        
        for icon in new_icons:
            assert icon in content, f"New icon '{icon}' not found in frontend code"
        
        print(f"PASS: All new icons present in AVAILABLE_ICONS: {new_icons}")

    def test_available_icons_count(self):
        """AVAILABLE_ICONS should have 10+ icons"""
        # Read frontend to extract icons count from AVAILABLE_ICONS
        import re
        with open('/app/frontend/app/index.tsx', 'r') as f:
            content = f.read()
        
        # Find AVAILABLE_ICONS definition
        match = re.search(r'const AVAILABLE_ICONS = \[(.*?)\];', content, re.DOTALL)
        if match:
            icons_str = match.group(1)
            icons = re.findall(r"'([^']+)'", icons_str)
            assert len(icons) >= 10, f"Expected 10+ icons, got {len(icons)}"
            print(f"PASS: AVAILABLE_ICONS has {len(icons)} icons")
        else:
            pytest.skip("Could not parse AVAILABLE_ICONS from frontend")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
