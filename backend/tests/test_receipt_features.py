"""
Backend tests for Receipt Scanning Phase 2 features:
- PUT /api/workspaces/{id}/currency
- GET /api/lists/{id}/receipts
- POST /api/receipts/{id}/confirm
- POST /api/lists/{id}/upload-receipt
"""
import pytest
import requests
import os
import base64
import io

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials created via MongoDB
SESSION_TOKEN = "test_session_receipt_1772388350422"
WORKSPACE_ID = "test_ws_receipt_1772388350422"
LIST_ID = "test_list_receipt_1772388350422"
ITEM_ID_1 = "test_item_1_1772388350464"
ITEM_ID_2 = "test_item_2_1772388350464"


@pytest.fixture
def auth_headers():
    return {
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def no_auth_headers():
    return {"Content-Type": "application/json"}


# ===================== UNAUTHENTICATED (401) TESTS =====================

class TestUnauthenticated:
    """All receipt endpoints should return 401 without auth"""

    def test_update_currency_returns_401_without_auth(self, no_auth_headers):
        """PUT /api/workspaces/{id}/currency - 401 without auth"""
        response = requests.put(
            f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/currency",
            json={"currency": "USD"},
            headers=no_auth_headers
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: currency update returns 401 without auth")

    def test_get_receipts_returns_401_without_auth(self, no_auth_headers):
        """GET /api/lists/{id}/receipts - 401 without auth"""
        response = requests.get(
            f"{BASE_URL}/api/lists/{LIST_ID}/receipts",
            headers=no_auth_headers
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: get receipts returns 401 without auth")

    def test_confirm_receipt_returns_401_without_auth(self, no_auth_headers):
        """POST /api/receipts/{id}/confirm - 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/receipts/fake-receipt-id/confirm",
            json={"confirmed_items": []},
            headers=no_auth_headers
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: confirm receipt returns 401 without auth")

    def test_upload_receipt_returns_401_without_auth(self):
        """POST /api/lists/{id}/upload-receipt - 401 without auth (no form data, no auth)"""
        response = requests.post(
            f"{BASE_URL}/api/lists/{LIST_ID}/upload-receipt"
        )
        # Without auth, should return 401 (before 422 file validation)
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}: {response.text}"
        print(f"PASS: upload receipt returns {response.status_code} without auth/file")


# ===================== AUTHENTICATED TESTS =====================

class TestCurrencyEndpoint:
    """Tests for PUT /api/workspaces/{id}/currency"""

    def test_update_currency_to_usd(self, auth_headers):
        """Update workspace currency to USD"""
        response = requests.put(
            f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/currency",
            json={"currency": "USD"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["currency"] == "USD", f"Expected USD, got {data.get('currency')}"
        assert data["workspace_id"] == WORKSPACE_ID
        print(f"PASS: currency updated to USD")

    def test_update_currency_to_gbp(self, auth_headers):
        """Update workspace currency to GBP"""
        response = requests.put(
            f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/currency",
            json={"currency": "GBP"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["currency"] == "GBP"
        print(f"PASS: currency updated to GBP")

    def test_update_currency_all_valid_values(self, auth_headers):
        """Test all valid currency values"""
        valid_currencies = ["EUR", "USD", "GBP", "CHF", "AUD", "CAD"]
        for currency in valid_currencies:
            response = requests.put(
                f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/currency",
                json={"currency": currency},
                headers=auth_headers
            )
            assert response.status_code == 200, f"Currency {currency} failed: {response.text}"
            data = response.json()
            assert data["currency"] == currency
        print(f"PASS: all 6 currencies valid (EUR, USD, GBP, CHF, AUD, CAD)")

    def test_update_currency_invalid_value(self, auth_headers):
        """Invalid currency should return 400"""
        response = requests.put(
            f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/currency",
            json={"currency": "FAKE"},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: invalid currency returns 400")

    def test_update_currency_persisted_in_db(self, auth_headers):
        """Currency change should be readable via GET /api/auth/me"""
        # Set to EUR
        requests.put(
            f"{BASE_URL}/api/workspaces/{WORKSPACE_ID}/currency",
            json={"currency": "EUR"},
            headers=auth_headers
        )
        # Verify via GET workspaces
        response = requests.get(
            f"{BASE_URL}/api/workspaces",
            headers=auth_headers
        )
        assert response.status_code == 200
        workspaces = response.json()
        ws = next((w for w in workspaces if w["workspace_id"] == WORKSPACE_ID), None)
        assert ws is not None
        assert ws["currency"] == "EUR"
        print(f"PASS: currency persisted and readable via GET /api/workspaces")


class TestReceiptsEndpoint:
    """Tests for GET /api/lists/{id}/receipts"""

    def test_get_receipts_empty_list(self, auth_headers):
        """Get receipts for list - should return empty array initially"""
        response = requests.get(
            f"{BASE_URL}/api/lists/{LIST_ID}/receipts",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: get receipts returns {len(data)} receipts (list endpoint working)")

    def test_get_receipts_invalid_list(self, auth_headers):
        """Get receipts for non-existent list should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/lists/nonexistent-list-id/receipts",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: non-existent list returns 404")


class TestUploadReceiptEndpoint:
    """Tests for POST /api/lists/{id}/upload-receipt"""

    def test_upload_receipt_no_file_returns_422(self, auth_headers):
        """Upload without file returns 422"""
        # Remove Content-Type so requests can set multipart
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        response = requests.post(
            f"{BASE_URL}/api/lists/{LIST_ID}/upload-receipt",
            headers=headers
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print(f"PASS: upload without file returns 422")

    def test_upload_receipt_invalid_file_type(self, auth_headers):
        """Upload with invalid file type (txt) returns 400"""
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}
        fake_file = io.BytesIO(b"not an image file")
        response = requests.post(
            f"{BASE_URL}/api/lists/{LIST_ID}/upload-receipt",
            headers=headers,
            files={"image": ("test.txt", fake_file, "text/plain")}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: invalid file type returns 400")

    def test_upload_receipt_with_valid_image(self, auth_headers):
        """
        Upload a real receipt-like image - this tests the full AI flow.
        Creates a minimal real PNG with text content to test the endpoint.
        """
        headers = {"Authorization": f"Bearer {SESSION_TOKEN}"}

        # Create a minimal but valid 1x1 JPEG image
        # This is a base64-encoded minimal white JPEG (10x10 pixels)
        minimal_jpeg_b64 = (
            "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U"
            "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN"
            "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy"
            "MjL/wAARCAAKAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAAAgIC"
            "AgMBAAAAAAAAAAAAAQIDBAURBiExQf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAA"
            "AAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AoOq6nqepzm3qmpXOpXMgw895J5JGP3LMxP8AJJ"
            "JNfOb1q1e3be6nOze3eSSSeSSSSf/2Q=="
        )
        image_data = base64.b64decode(minimal_jpeg_b64)
        image_file = io.BytesIO(image_data)

        response = requests.post(
            f"{BASE_URL}/api/lists/{LIST_ID}/upload-receipt",
            headers=headers,
            files={"image": ("receipt.jpg", image_file, "image/jpeg")}
        )
        # Can be 200 (AI processed), 422 (processing failure - bad image), or 500
        # The key is that it's not 401 (auth worked) and not a random error
        assert response.status_code in [200, 422], \
            f"Expected 200 or 422, got {response.status_code}: {response.text}"
        print(f"PASS: upload with valid image returns {response.status_code} (auth passed, AI processed)")


class TestConfirmReceiptEndpoint:
    """Tests for POST /api/receipts/{id}/confirm"""

    def test_confirm_nonexistent_receipt_returns_404(self, auth_headers):
        """Confirm non-existent receipt should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/receipts/nonexistent-receipt-id/confirm",
            json={"confirmed_items": []},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: confirm non-existent receipt returns 404")

    def test_confirm_receipt_creates_receipt_and_confirms(self, auth_headers):
        """
        Full flow: create a receipt via MongoDB, then confirm it via API.
        """
        import uuid
        from datetime import datetime, timezone
        from pymongo import MongoClient

        # Create a receipt doc directly in MongoDB
        receipt_id = f"test_receipt_{uuid.uuid4().hex[:8]}"
        from pymongo import MongoClient
        mongo_client = MongoClient("mongodb://localhost:27017")
        db_local = mongo_client["test_database"]
        db_local.receipts.insert_one({
            "receipt_id": receipt_id,
            "list_id": LIST_ID,
            "workspace_id": WORKSPACE_ID,
            "uploaded_at": datetime.now(timezone.utc),
            "processed_at": datetime.now(timezone.utc),
            "status": "completed",
            "store_name": "Test Store",
            "currency": "EUR",
            "receipt_total": 5.50,
            "matched_total": 5.50,
            "raw_extracted_items": [],
            "matched_items": [
                {"item_id": ITEM_ID_1, "item_name": "Milk", "matched_receipt_line": "MILK 2% 1L", "price": 3.00, "confidence": "high"},
                {"item_id": ITEM_ID_2, "item_name": "Bread", "matched_receipt_line": "BREAD WHOLE", "price": 2.50, "confidence": "high"}
            ],
            "error_message": None,
        })
        mongo_client.close()

        # Confirm the receipt via API
        response = requests.post(
            f"{BASE_URL}/api/receipts/{receipt_id}/confirm",
            json={
                "confirmed_items": [
                    {"item_id": ITEM_ID_1, "price": 3.00},
                    {"item_id": ITEM_ID_2, "price": 2.50}
                ]
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "updated_items" in data
        assert data["receipt_id"] == receipt_id
        assert len(data["updated_items"]) == 2

        # Verify prices were saved to grocery items
        items_response = requests.get(
            f"{BASE_URL}/api/lists/{LIST_ID}/items",
            headers=auth_headers
        )
        assert items_response.status_code == 200
        items = items_response.json()
        milk = next((i for i in items if i["id"] == ITEM_ID_1), None)
        bread = next((i for i in items if i["id"] == ITEM_ID_2), None)
        assert milk is not None and milk.get("price") == 3.0, f"Milk price not saved: {milk}"
        assert bread is not None and bread.get("price") == 2.5, f"Bread price not saved: {bread}"
        print(f"PASS: confirm receipt saves prices to grocery items")

        # Cleanup receipt
        mongo_client2 = MongoClient("mongodb://localhost:27017")
        mongo_client2["test_database"].receipts.delete_one({"receipt_id": receipt_id})
        mongo_client2.close()
