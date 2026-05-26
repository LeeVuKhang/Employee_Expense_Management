# Employee Expense Management System

A comprehensive full-stack application designed to streamline the process of submitting, reviewing, and approving employee expense requests. The system supports a multi-tier approval workflow involving Employees, Managers, and Finance Officers.

## Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.11+)
- **Database ORM:** SQLModel (backed by PostgreSQL/psycopg)
- **Storage & Auth:** Supabase, AWS S3 (boto3)
- **Package Management:** uv (via pyproject.toml)

### Frontend
- **Framework:** React 19 + Vite
- **Routing:** React Router v7
- **Linting:** ESLint

## Directory Structure

Here is a high-level overview of the project's structure:

Employee_Expense_Management/
├── backend/
│   ├── app/
│   │   ├── controller/      # API route definitions (expenses, manager, finance)
│   │   ├── core/            # App configuration and database session wiring
│   │   ├── middleware/      # Request-level auth, CORS, and ownership checks
│   │   ├── model/           # SQLModel database schemas (ExpenseRequest, User, etc.)
│   │   ├── schema/          # Pydantic DTOs for request/response validation
│   │   ├── service/         # Core business logic and status validation
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Backend unit and integration tests
│   ├── .env.example         # Template for environment variables
│   └── pyproject.toml       # Python dependencies and project metadata
└── frontend/
├── src/
│   ├── api/             # API client functions for frontend-backend communication
│   ├── components/      # Reusable UI components (Modals, Cards, Navbars)
│   ├── data/            # Mock data and constants
│   ├── hooks/           # Custom React hooks (e.g., useExpenseRequests)
│   ├── pages/           # Top-level route components (Dashboard, Login, Detail Pages)
│   ├── App.jsx          # Root React component
│   └── main.jsx         # React DOM rendering entry point
├── index.html           # HTML template
├── package.json         # Node.js dependencies and scripts
└── vite.config.js       # Vite bundler configuration

## Core Features & Functions

The system is separated into three primary role-based domains:

### 1. Employee Functions (`app/controller/expenses.py`)
- **Create/Draft:** Submit new expense requests with line items and attachments (multipart form data).
- **Read:** View personal expense history and specific request details.
- **Update:** Modify requests that are still in Draft or Pending Manager status.
- **Cancel:** Withdraw pending requests (locks the request from further edits).
- **Duplicate:** Quickly clone an existing request to save time on recurring expenses.

### 2. Manager Functions (`app/controller/manager.py`)
- **Pending Dashboard:** View a paginated, sortable list of all expense requests awaiting managerial approval.
- **Summary:** Retrieve top-level summary metrics for pending requests.

### 3. Finance Functions (`app/controller/finance.py`)
- **Centralized Queue:** View requests that have passed manager approval and await final finance processing.
- **Status Management:** Approve, pay, or reject requests (updating status to FINANCE_APPROVED or PAID).
- **Detail View:** Access full, read-only details of approved expenses, including line items and employee data.

## Installation & Setup

### Prerequisites
- Python 3.11+
- uv (Python package installer and resolver)
- Node.js (v18+ recommended)
- PostgreSQL database (or Supabase instance)

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install the dependencies using uv:
```bash
uv sync
```

Configure the environment variables:
```bash
# Copy the example file and update the values with your actual credentials
cp .env.example .env
```

**Key Environment Variables in `.env`:**
- `DATABASE_URL`: Your PostgreSQL connection string.
- `SUPABASE_URL` / `SUPABASE_KEY`: Credentials for Supabase integration.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET`: Credentials for storing attachments.

Start the development server:
```bash
uv run uvicorn app.main:app --reload
```

The backend API will be available at `http://127.0.0.1:8000`. You can view the automatic Swagger UI documentation at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install the Node dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The frontend application will be available at `http://localhost:5173`.

## Authentication & Middleware

The backend relies on header-based user identification for development and routing. Requests acting on employee-owned expenses currently expect an `X-User-Id` header to identify the current user context.

Role-based access control (RBAC) is enforced at the controller level using FastAPI dependencies:
- `require_expense_owner`: Ensures an employee can only edit their own requests.
- `require_manager`: Restricts access to manager dashboard routes.
- `require_finance_role`: Restricts access to final payout and finance review endpoints.

