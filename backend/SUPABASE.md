# Supabase DB Setup

The API can run with three storage modes:

1. `SUPABASE_DB_URL` set: uses Supabase Postgres (recommended for migration).
2. `MONGO_URL` set: uses MongoDB.
3. Neither set: falls back to in-memory mock DB for local dev only.

## 1) Get the Supabase Postgres URL

In Supabase dashboard:

- Project Settings -> Database -> Connection string -> URI
- Copy the **Direct connection** URI.

It should look like:

`postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres`

## 2) Configure backend env

Create `backend/.env`:

```env
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
DB_NAME=outere_db
```

## 3) Start backend

```bash
cd backend
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000
```

The app auto-creates `app_documents` table on startup.

## 4) Point frontend to local backend

`frontend/.env`:

```env
EXPO_PUBLIC_BACKEND_URL=http://<your-mac-lan-ip>:8000
```
