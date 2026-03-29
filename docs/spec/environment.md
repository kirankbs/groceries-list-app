# Environment Variables

## Backend (`backend/.env`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `MONGO_URL` | yes | `mongodb://localhost:27017` | Motor async MongoDB connection string |
| `DB_NAME` | yes | `test_database` | MongoDB database name |
| `ANTHROPIC_API_KEY` | yes* | `sk-ant-...` | Claude API for receipt OCR; warns at startup if missing |
| `RESEND_API_KEY` | yes* | `re_...` | Resend HTTP API for password reset emails; warns at startup if missing |
| `RESEND_FROM` | no | `The Living Pantry <onboarding@resend.dev>` | From address for reset emails; defaults to onboarding@resend.dev |
| `ALLOWED_ORIGINS` | no | `http://localhost:8081,http://localhost:19006` | CORS allow-list, comma-separated |
| `ENVIRONMENT` | no | `production` | Any non-`development` value sets `secure=True` on session cookie |

## Frontend (`frontend/.env`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | yes | `http://localhost:8001` | Base URL for all API calls; no trailing slash |
