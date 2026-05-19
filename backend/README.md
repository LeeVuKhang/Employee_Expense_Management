# Employee Expense Management Backend

FastAPI backend for employee expense requests, manager review, and finance approval.

## Structure

- `app/main.py` creates the FastAPI application.
- `app/model` contains SQLModel mappings for the tables in `EEM.sql`.
- `app/schema` contains request and response DTOs.
- `app/controller` contains API routers.
- `app/middleware` contains request-level auth and ownership dependencies.
- `app/service` contains business rules such as editable status validation.
- `app/core` contains settings and database wiring.

## Setup

```powershell
uv sync
Copy-Item .env.example .env
uv run uvicorn app.main:app --reload
```

Requests that act on employee-owned expenses expect an `X-User-Id` header.

## Implemented APIs

- `GET /health`
- `GET /api/expenses`
- `POST /api/expenses`
- `GET /api/expenses/{expense_id}`
- `PUT /api/expenses/{expense_id}`
- `PATCH /api/expenses/{expense_id}/cancel`
- `POST /api/expenses/{expense_id}/duplicate`

The update and cancel APIs only allow requests in `Draft` or `Pending Manager`.
Once a request is cancelled or processed into a later status, `is_locked` prevents further employee changes.
