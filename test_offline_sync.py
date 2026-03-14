#!/usr/bin/env python3
"""
Integration tests for the Grocery Todo App backend.
Tests all existing APIs + new WebSocket and offline-sync support.
Uses mongomock-motor so no real MongoDB needed.
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock

import pytest
import httpx
from mongomock_motor import AsyncMongoMockClient


# ──────── Bootstrap: patch motor before importing the app ────────
mock_client = AsyncMongoMockClient()
mock_db = mock_client["test_grocery_db"]


def _patched_motor(*a, **kw):
    return mock_client


# Patch motor + env vars before importing server
import os
os.environ["MONGO_URL"] = "mongodb://fake"
os.environ["DB_NAME"] = "test_grocery_db"

with patch("motor.motor_asyncio.AsyncIOMotorClient", _patched_motor):
    from backend.server import app, db as server_db

# Re-point the server's db reference to our mock
import backend.server as srv
srv.db = mock_db
srv.client = mock_client


# ──────── Helpers ────────

async def create_test_user(user_id=None, name="Test User", email="test@example.com"):
    uid = user_id or f"user_{uuid.uuid4().hex[:12]}"
    token = f"tok_{uuid.uuid4().hex}"
    await mock_db.users.insert_one({
        "user_id": uid,
        "email": email,
        "name": name,
        "picture": None,
        "personal_workspace_id": None,
        "created_at": datetime.now(timezone.utc),
    })
    await mock_db.user_sessions.insert_one({
        "user_id": uid,
        "session_token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    })
    return uid, token


async def setup_user_with_workspace():
    """Create a user with a personal workspace, a list, and default categories."""
    uid, token = await create_test_user()
    # Create personal workspace
    ws_id = str(uuid.uuid4())
    await mock_db.workspaces.insert_one({
        "workspace_id": ws_id,
        "name": "Personal",
        "type": "personal",
        "invite_code": None,
        "owner_id": uid,
        "member_ids": [uid],
        "created_at": datetime.now(timezone.utc),
    })
    await mock_db.users.update_one({"user_id": uid}, {"$set": {"personal_workspace_id": ws_id}})
    # Add default categories
    for cat in srv.DEFAULT_CATEGORIES:
        await mock_db.categories.insert_one({
            **cat, "id": str(uuid.uuid4()), "workspace_id": ws_id,
            "created_at": datetime.now(timezone.utc),
        })
    # Create a shopping list
    list_id = str(uuid.uuid4())
    await mock_db.shopping_lists.insert_one({
        "list_id": list_id,
        "workspace_id": ws_id,
        "name": "My List",
        "status": "active",
        "is_template": False,
        "created_from_template_id": None,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
    })
    return uid, token, ws_id, list_id


async def cleanup():
    for col in await mock_db.list_collection_names():
        await mock_db[col].delete_many({})


# ──────── Test class ────────

class TestResults:
    def __init__(self):
        self.results = []

    def log(self, name, passed, detail=""):
        status = "PASS" if passed else "FAIL"
        print(f"  {'✅' if passed else '❌'} {status} | {name}" + (f" — {detail}" if detail else ""))
        self.results.append({"name": name, "passed": passed, "detail": detail})

    def summary(self):
        passed = sum(1 for r in self.results if r["passed"])
        total = len(self.results)
        print(f"\n{'='*60}")
        print(f"Results: {passed}/{total} tests passed")
        if passed == total:
            print("All tests passed!")
        else:
            print(f"{total - passed} test(s) failed:")
            for r in self.results:
                if not r["passed"]:
                    print(f"  - {r['name']}: {r['detail']}")
        print(f"{'='*60}")
        return passed == total


async def run_tests():
    results = TestResults()

    # Use httpx async test client against the FastAPI app
    from httpx import ASGITransport
    transport = ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        await cleanup()

        # ── Setup ──
        uid, token, ws_id, list_id = await setup_user_with_workspace()
        headers = {"Authorization": f"Bearer {token}"}

        # ════════════════════════════════════════════
        # 1. AUTH
        # ════════════════════════════════════════════
        print("\n--- Auth Tests ---")

        r = await client.get("/api/auth/me", headers=headers)
        results.log("GET /api/auth/me", r.status_code == 200 and r.json()["user"]["user_id"] == uid)

        r = await client.get("/api/auth/me")
        results.log("GET /api/auth/me (no token) → 401", r.status_code == 401)

        # ════════════════════════════════════════════
        # 2. WORKSPACES
        # ════════════════════════════════════════════
        print("\n--- Workspace Tests ---")

        r = await client.get("/api/workspaces", headers=headers)
        results.log("GET /api/workspaces", r.status_code == 200 and isinstance(r.json(), list))

        r = await client.post("/api/workspaces", json={"name": "Family"}, headers=headers)
        results.log("POST /api/workspaces (create shared)", r.status_code == 200 and "invite_code" in r.json())
        shared_ws = r.json()

        # Get invite code
        r = await client.get(f"/api/workspaces/{shared_ws['workspace_id']}/invite-code", headers=headers)
        results.log("GET invite-code", r.status_code == 200 and "invite_code" in r.json())

        # Regenerate invite code
        r = await client.post(f"/api/workspaces/{shared_ws['workspace_id']}/regenerate-code", headers=headers)
        results.log("POST regenerate-code", r.status_code == 200 and "invite_code" in r.json())
        new_invite_code = r.json()["invite_code"]

        # Create second user and join (use regenerated invite code)
        uid2, token2 = await create_test_user(name="User 2", email="user2@example.com")
        r = await client.post("/api/workspaces/join",
                              json={"invite_code": new_invite_code},
                              headers={"Authorization": f"Bearer {token2}"})
        results.log("POST /api/workspaces/join", r.status_code == 200 and uid2 in r.json().get("member_ids", []))

        # Leave workspace
        r = await client.post(f"/api/workspaces/{shared_ws['workspace_id']}/leave",
                              headers={"Authorization": f"Bearer {token2}"})
        results.log("POST leave workspace", r.status_code == 200)

        # ════════════════════════════════════════════
        # 3. SHOPPING LISTS
        # ════════════════════════════════════════════
        print("\n--- Shopping List Tests ---")

        r = await client.get(f"/api/workspaces/{ws_id}/lists", headers=headers)
        results.log("GET /workspaces/:id/lists", r.status_code == 200 and len(r.json()) >= 1)

        r = await client.post("/api/lists", json={"name": "Weekly Shop", "workspace_id": ws_id}, headers=headers)
        results.log("POST /lists (create)", r.status_code == 200 and "list_id" in r.json())
        new_list = r.json()

        r = await client.put(f"/api/lists/{new_list['list_id']}", json={"name": "Renamed"}, headers=headers)
        results.log("PUT /lists/:id (rename)", r.status_code == 200 and r.json()["name"] == "Renamed")

        r = await client.put(f"/api/lists/{new_list['list_id']}", json={"status": "completed"}, headers=headers)
        results.log("PUT /lists/:id (complete)", r.status_code == 200 and r.json()["status"] == "completed")

        r = await client.post(f"/api/lists/{list_id}/save-as-template", headers=headers)
        results.log("POST save-as-template", r.status_code == 200 and r.json()["is_template"] is True)

        r = await client.get(f"/api/workspaces/{ws_id}/templates", headers=headers)
        results.log("GET templates", r.status_code == 200)

        r = await client.delete(f"/api/lists/{new_list['list_id']}", headers=headers)
        results.log("DELETE /lists/:id", r.status_code == 200)

        # ════════════════════════════════════════════
        # 4. CATEGORIES
        # ════════════════════════════════════════════
        print("\n--- Category Tests ---")

        r = await client.get(f"/api/workspaces/{ws_id}/categories", headers=headers)
        results.log("GET categories", r.status_code == 200 and len(r.json()) >= 10)

        r = await client.post("/api/categories", json={
            "name": "Organic", "color": "#00FF00", "icon": "leaf-outline", "workspace_id": ws_id
        }, headers=headers)
        results.log("POST category (create)", r.status_code == 200)
        cat_id = r.json()["id"]

        r = await client.put(f"/api/categories/{cat_id}", json={"name": "Bio"}, headers=headers)
        results.log("PUT category (rename)", r.status_code == 200 and r.json()["name"] == "Bio")

        r = await client.delete(f"/api/categories/{cat_id}", headers=headers)
        results.log("DELETE category", r.status_code == 200)

        # Duplicate name
        r = await client.post("/api/categories", json={
            "name": "Produce", "workspace_id": ws_id
        }, headers=headers)
        results.log("POST category (duplicate) → 400", r.status_code == 400)

        # ════════════════════════════════════════════
        # 5. GROCERY ITEMS
        # ════════════════════════════════════════════
        print("\n--- Grocery Item Tests ---")

        r = await client.post("/api/items", json={
            "list_id": list_id, "name": "Milk", "quantity": 2, "category": "Dairy"
        }, headers=headers)
        results.log("POST item (create)", r.status_code == 200 and r.json()["name"] == "Milk")
        item = r.json()

        r = await client.get(f"/api/lists/{list_id}/items", headers=headers)
        results.log("GET items", r.status_code == 200 and len(r.json()) >= 1)

        r = await client.put(f"/api/items/{item['id']}", json={"checked": True}, headers=headers)
        results.log("PUT item (check)", r.status_code == 200 and r.json()["checked"] is True)

        r = await client.put(f"/api/items/{item['id']}", json={
            "name": "Oat Milk", "quantity": 3, "category": "Beverages"
        }, headers=headers)
        results.log("PUT item (update name/qty/cat)", r.status_code == 200 and r.json()["name"] == "Oat Milk")

        r = await client.delete(f"/api/items/{item['id']}", headers=headers)
        results.log("DELETE item", r.status_code == 200)

        # Verify deleted
        r = await client.get(f"/api/lists/{list_id}/items", headers=headers)
        item_ids = [i["id"] for i in r.json()]
        results.log("Item no longer exists after DELETE", item["id"] not in item_ids)

        # ════════════════════════════════════════════
        # 6. LIST STATUS AUTO-UPDATE
        # ════════════════════════════════════════════
        print("\n--- List Status Auto-Update Tests ---")

        # Reset list to active for this test
        await mock_db.shopping_lists.update_one({"list_id": list_id}, {"$set": {"status": "active", "completed_at": None}})

        # Add two items, check both → list should become completed
        r1 = await client.post("/api/items", json={"list_id": list_id, "name": "Eggs", "category": "Dairy"}, headers=headers)
        r2 = await client.post("/api/items", json={"list_id": list_id, "name": "Bread", "category": "Bakery"}, headers=headers)
        i1, i2 = r1.json(), r2.json()

        # Check first → should be in_progress
        await client.put(f"/api/items/{i1['id']}", json={"checked": True}, headers=headers)
        lst = await mock_db.shopping_lists.find_one({"list_id": list_id})
        results.log("Partial check → in_progress", lst["status"] == "in_progress")

        # Check second → should be completed
        await client.put(f"/api/items/{i2['id']}", json={"checked": True}, headers=headers)
        lst = await mock_db.shopping_lists.find_one({"list_id": list_id})
        results.log("All checked → completed", lst["status"] == "completed")

        # Uncheck one on completed list → stays completed (by design, must manually reopen)
        await client.put(f"/api/items/{i1['id']}", json={"checked": False}, headers=headers)
        lst = await mock_db.shopping_lists.find_one({"list_id": list_id})
        results.log("Uncheck on completed list → stays completed", lst["status"] == "completed")

        # Clean up those items
        await client.delete(f"/api/items/{i1['id']}", headers=headers)
        await client.delete(f"/api/items/{i2['id']}", headers=headers)

        # ════════════════════════════════════════════
        # 7. WEBSOCKET ENDPOINT
        # ════════════════════════════════════════════
        print("\n--- WebSocket Tests ---")

        # Test WS without token → should reject
        from starlette.testclient import TestClient
        sync_client = TestClient(app)

        try:
            with sync_client.websocket_connect(f"/ws/{ws_id}") as ws:
                # Should be closed immediately (no token)
                results.log("WS without token → rejected", False, "Connection was not rejected")
        except Exception:
            results.log("WS without token → rejected", True)

        # Test WS with invalid token
        try:
            with sync_client.websocket_connect(f"/ws/{ws_id}?token=invalid_token") as ws:
                results.log("WS with invalid token → rejected", False, "Connection was not rejected")
        except Exception:
            results.log("WS with invalid token → rejected", True)

        # Test WS with valid token
        try:
            with sync_client.websocket_connect(f"/ws/{ws_id}?token={token}") as ws:
                ws.send_text("ping")
                data = ws.receive_text()
                results.log("WS ping/pong", data == "pong")
        except Exception as e:
            results.log("WS ping/pong", False, str(e))

        # Test broadcast function directly (sync WS client can't interleave with async httpx)
        from backend.server import ws_manager, broadcast_event as _broadcast

        # Verify the broadcast_event function works without error
        try:
            await _broadcast(ws_id, "item_created", {"item": {"id": "test", "name": "Test"}, "list_id": list_id}, uid)
            results.log("broadcast_event runs without error", True)
        except Exception as e:
            results.log("broadcast_event runs without error", False, str(e))

        # Verify connection manager tracks connections
        try:
            with sync_client.websocket_connect(f"/ws/{ws_id}?token={token}") as ws:
                has_connections = ws_id in ws_manager.active_connections and len(ws_manager.active_connections[ws_id]) > 0
                results.log("WS connection tracked in manager", has_connections)
        except Exception as e:
            results.log("WS connection tracked in manager", False, str(e))

        # ════════════════════════════════════════════
        # 8. EDGE CASES / VALIDATION
        # ════════════════════════════════════════════
        print("\n--- Edge Case Tests ---")

        # Empty item name
        r = await client.post("/api/items", json={"list_id": list_id, "name": "  ", "category": "Other"}, headers=headers)
        results.log("Empty item name → 400", r.status_code == 400)

        # Empty list name
        r = await client.post("/api/lists", json={"name": "  ", "workspace_id": ws_id}, headers=headers)
        results.log("Empty list name → 400", r.status_code == 400)

        # Non-existent item
        r = await client.put("/api/items/nonexistent", json={"checked": True}, headers=headers)
        results.log("Update non-existent item → 404", r.status_code == 404)

        r = await client.delete("/api/items/nonexistent", headers=headers)
        results.log("Delete non-existent item → 404", r.status_code == 404)

        # Cannot leave personal workspace
        r = await client.post(f"/api/workspaces/{ws_id}/leave", headers=headers)
        results.log("Leave personal workspace → 400", r.status_code == 400)

        # Cannot delete personal workspace
        r = await client.delete(f"/api/workspaces/{ws_id}", headers=headers)
        results.log("Delete personal workspace → 400", r.status_code == 400)

        # API root
        r = await client.get("/api/")
        results.log("GET /api/ → version string", r.status_code == 200 and "Real-time Sync" in r.json()["message"])

    # ── Summary ──
    return results.summary()


if __name__ == "__main__":
    success = asyncio.run(run_tests())
    exit(0 if success else 1)
