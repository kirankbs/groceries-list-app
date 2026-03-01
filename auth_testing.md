# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session

```bash
mongosh --eval "
use('test_database');
var visitorId = 'user_' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: visitorId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  household_id: null,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: visitorId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + visitorId);
"
```

## Step 2: Test Backend API

```bash
# Test auth endpoint
curl -X GET "http://localhost:8001/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Test protected endpoints
curl -X GET "http://localhost:8001/api/groceries" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X POST "http://localhost:8001/api/groceries" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"name": "Test Item", "quantity": 1, "category": "Other"}'
```

## Step 3: Browser Testing

```python
# Set cookie and navigate
await page.context.add_cookies([{
    "name": "session_token",
    "value": "YOUR_SESSION_TOKEN",
    "domain": "grocery-todo-2.preview.emergentagent.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}])
await page.goto("https://list-organizer-demo.preview.emergentagent.com")
```

## Quick Debug

```bash
# Check data format
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
db.households.find().limit(2).pretty();
"

# Clean test data
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```

## Checklist

- [ ] User document has `user_id` field
- [ ] Session `user_id` matches `users.user_id` exactly
- [ ] All queries exclude `_id` with `{"_id": 0}`
- [ ] API returns user data (not 401/404)
- [ ] Browser loads dashboard (not login page)
- [ ] Household creation works
- [ ] Household joining with invite code works
- [ ] Grocery items are scoped to household

## Success Indicators

- /api/auth/me returns user data with `user_id` field
- Dashboard loads without redirect
- CRUD operations work with household scoping

## Failure Indicators

- "User not found" errors
- 401 Unauthorized responses
- Redirect to login page
