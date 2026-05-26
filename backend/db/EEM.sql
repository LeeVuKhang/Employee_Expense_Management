-- ==============================================================================
-- 1. EXTENSIONS & SETUP
-- ==============================================================================
-- (Đã gỡ bỏ extension uuid-ossp vì sử dụng Auto-increment Integer)

-- ==============================================================================
-- 2. ENUMS & LOOKUP TABLES
-- ==============================================================================
-- Defines strict role boundaries (Admin AC1)
CREATE TYPE user_role AS ENUM ('Employee', 'Manager', 'Finance', 'System Administrator');

-- Defines request statuses (Dashboard AC2, Workflow ACs)
CREATE TYPE request_status AS ENUM (
    'Draft',
    'Pending Manager',
    'Pending Finance',
    'Finance Approved',
    'Paid',
    'Rejected',
    'Cancelled'
);

-- Predefined list of expense categories (Expense AC1)
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==============================================================================
-- 3. CORE TABLES
-- ==============================================================================
-- Users table with self-referencing manager_id for approval routing
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL,
    manager_id INT REFERENCES users(id), -- Nullable for Admin/Finance or Top-level Managers
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Main Expense Request Header
CREATE TABLE expense_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES users(id),
    category_id INT NOT NULL REFERENCES expense_categories(id),

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount NUMERIC(12, 2) DEFAULT 0.00, -- AC4: Automatically calculated
    status request_status DEFAULT 'Draft',

    -- Workflow & Tracking
    current_processor_id INT REFERENCES users(id), -- Indicates whose turn it is (Dashboard AC3)
    rejection_reason TEXT, -- Mandatory explanation if rejected (Manager/Finance AC3)
    is_locked BOOLEAN DEFAULT FALSE, -- Visually/Functionally locks request (Manage Requests AC3)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- AC5: End date not earlier than start date, and no future dates allowed
    CONSTRAINT chk_valid_trip_dates CHECK (
        end_date >= start_date AND
        start_date <= CURRENT_DATE AND
        end_date <= CURRENT_DATE
    )
);

-- Expense Line Items (AC2)
CREATE TABLE expense_line_items (
    id SERIAL PRIMARY KEY,
    expense_request_id INT NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,

    expense_date DATE NOT NULL,
    item_service_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    purpose_note TEXT NOT NULL,

    -- AC3: Strictly prevent negative or zero amounts
    -- AC5: Prevent future dates for individual items
    CONSTRAINT chk_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_no_future_item_date CHECK (expense_date <= CURRENT_DATE)
);

-- Attached Proof Documents (AC1)
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    expense_request_id INT NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,

    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1024) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_key VARCHAR(1024) NOT NULL,
    content_type VARCHAR(255),
    file_size_bytes BIGINT NOT NULL,

    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- AC6: Rejects any individual file larger than 10MB (10 * 1024 * 1024 bytes)
    CONSTRAINT chk_max_file_size CHECK (file_size_bytes <= 10485760)
);

-- Automated Notifications (Notifications AC1 & AC2)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_request_id INT REFERENCES expense_requests(id) ON DELETE CASCADE,

    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng lưu lịch sử các hành động để hiển thị Status timeline
CREATE TABLE request_history (
    id SERIAL PRIMARY KEY,
    expense_request_id INT NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
    actor_id INT NOT NULL REFERENCES users(id), -- Người thực hiện hành động (Employee, Manager, Finance)
    action_taken VARCHAR(50) NOT NULL, -- VD: 'Submitted', 'Approved', 'Rejected', 'Paid'
    comments TEXT, -- Lý do reject hoặc note thêm
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. DATABASE TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Function & Trigger: AC4 - Automatically calculate Total Expense Amount
CREATE OR REPLACE FUNCTION calculate_total_expense_amount()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE expense_requests
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0)
        FROM expense_line_items
        WHERE expense_request_id = NEW.expense_request_id
    )
    WHERE id = NEW.expense_request_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_total_amount
AFTER INSERT OR UPDATE OR DELETE ON expense_line_items
FOR EACH ROW EXECUTE FUNCTION calculate_total_expense_amount();

-- Function & Trigger: AC6 - Enforce maximum of 3 files per request
CREATE OR REPLACE FUNCTION enforce_max_attachments()
RETURNS TRIGGER AS $$
DECLARE
    attachment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attachment_count
    FROM attachments
    WHERE expense_request_id = NEW.expense_request_id;

    IF attachment_count >= 3 THEN
        RAISE EXCEPTION 'A maximum of 3 files per expense request is allowed.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_max_attachments
BEFORE INSERT ON attachments
FOR EACH ROW EXECUTE FUNCTION enforce_max_attachments();

-- Function & Trigger: AC3 (Manage Requests) - Auto-lock requests when processed
CREATE OR REPLACE FUNCTION lock_processed_requests()
RETURNS TRIGGER AS $$
BEGIN
    -- If status moves out of Draft or Pending Manager, lock the request
    IF NEW.status NOT IN ('Draft', 'Pending Manager') THEN
        NEW.is_locked := TRUE;
    END IF;

    -- Update timestamp automatically
    NEW.updated_at := CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lock_and_timestamp
BEFORE UPDATE ON expense_requests
FOR EACH ROW EXECUTE FUNCTION lock_processed_requests();
