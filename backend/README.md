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

## Authentication

- All `/api/*` endpoints require `X-User-Id` header.
- `GET /health` does not require authentication.

Example:

```http
X-User-Id: 3
```

## API Details

### Health

- `GET /health`
  - Returns service health status.

### Categories

- `GET /api/expense-categories`
  - Returns active expense categories sorted by name.

### Employee Expense APIs

- `GET /api/expenses`
  - List current employee's expense requests.
- `POST /api/expenses`
  - Create a new expense request.
  - Supports `application/json` and `multipart/form-data`.
- `GET /api/expenses/{expense_id}`
  - Get current employee's expense request details.
- `PUT /api/expenses/{expense_id}`
  - Update current employee's expense request.
  - Allowed only when status is `Draft` or `Pending Manager`.
- `PATCH /api/expenses/{expense_id}/cancel`
  - Cancel current employee's expense request.
  - Allowed only when status is `Draft` or `Pending Manager`.
- `POST /api/expenses/{expense_id}/duplicate`
  - Duplicate an existing employee-owned request as `Draft`.

### Manager APIs

- `GET /api/manager/expense-requests/pending`
  - List pending requests assigned to current manager.
  - Query params: `page`, `page_size`, `sort`, `order`.
- `GET /api/manager/expense-requests/pending/summary`
  - Return summary of manager's pending requests.
- `PATCH /api/manager/requests/{expense_id}/status`
  - Manager approval action (BE-1).
  - Supported transition: `Pending Manager` -> `Pending Finance`.

Request body:

```json
{
  "status": "Pending Finance"
}
```

Success response behavior:

- `status` becomes `Pending Finance`.
- `current_processor_id` is set to `null` so Finance can process next.

Error responses for manager status update:

- `400` if target status is not `Pending Finance`.
- `403` if user is not a manager, request is outside manager's team, or assigned to another processor.
- `404` if expense request does not exist.
- `409` if current status is not `Pending Manager`.

### Finance APIs

- `GET /api/finance/pending`
  - List Finance queue items and summary.
- `GET /api/finance/requests/{expense_id}`
  - View request details that reached/passed manager approval.
- `PATCH /api/finance/requests/{expense_id}/status`
  - Finance status update endpoint.
  - Allowed target statuses: `Finance Approved`, `Paid`, `Rejected`.
  - `rejection_reason` is required when status is `Rejected`.

## Status and Locking Rules

- Employee edits and cancels are allowed only in `Draft` and `Pending Manager`.
- Once a request is processed into later statuses, `is_locked` prevents employee changes.
