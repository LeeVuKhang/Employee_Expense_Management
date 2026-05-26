import os
import unittest
from datetime import date
from decimal import Decimal

os.environ.setdefault("DATABASE_URL", "postgresql://user:password@localhost:5432/test")

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from app.core.database import get_session
from app.main import app
from app.model.expense import ExpenseCategory, ExpenseRequest, RequestHistory, RequestStatus
from app.model.user import User, UserRole
from app.service.auth_service import create_access_token


class ManagerDashboardAuthorizationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        self._seed_data()

        def override_get_session():
            with Session(self.engine) as session:
                yield session

        app.dependency_overrides[get_session] = override_get_session
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.engine.dispose()

    def _auth_headers(
        self,
        user_id: int,
        role: UserRole = UserRole.MANAGER,
        email: str = "manager.one@example.com",
    ) -> dict[str, str]:
        token = create_access_token(
            {
                "sub": str(user_id),
                "role": role.value,
                "email": email,
            }
        )
        return {"Authorization": f"Bearer {token}"}

    def test_manager_sees_only_direct_team_pending_requests_assigned_to_them(self) -> None:
        response = self.client.get(
            "/api/manager/expense-requests/pending",
            headers=self._auth_headers(3),
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()

        self.assertEqual(body["pagination"]["total_items"], 1)
        self.assertEqual([request["id"] for request in body["requests"]], [101])
        self.assertEqual(body["requests"][0]["employee_id"], 4)
        self.assertEqual(body["requests"][0]["status"], "Pending Manager")
        self.assertEqual(body["requests"][0]["current_processor_id"], 3)

    def test_summary_uses_same_authorized_filter_as_pending_list(self) -> None:
        response = self.client.get(
            "/api/manager/expense-requests/pending/summary",
            headers=self._auth_headers(3),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"pending_count": 1, "total_amount": "125.50"},
        )

    def test_non_manager_cannot_access_pending_requests(self) -> None:
        response = self.client.get(
            "/api/manager/expense-requests/pending",
            headers=self._auth_headers(
                4,
                UserRole.EMPLOYEE,
                "employee.one@example.com",
            ),
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["detail"],
            "Access forbidden: requires Manager role.",
        )

    def test_missing_user_cannot_access_pending_requests(self) -> None:
        response = self.client.get(
            "/api/manager/expense-requests/pending",
            headers=self._auth_headers(999),
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "User not found")

    def test_manager_can_open_and_approve_assigned_pending_request(self) -> None:
        detail_response = self.client.get(
            "/api/manager/requests/101",
            headers=self._auth_headers(3),
        )

        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["id"], 101)
        self.assertEqual(detail_response.json()["employee_id"], 4)

        update_response = self.client.patch(
            "/api/manager/requests/101/status",
            headers=self._auth_headers(3),
            json={"status": "Pending Finance"},
        )

        self.assertEqual(update_response.status_code, 200)
        body = update_response.json()
        self.assertEqual(body["status"], "Pending Finance")
        self.assertEqual(body["current_processor_id"], 2)
        self.assertTrue(body["is_locked"])

    def test_manager_can_approve_pending_request_to_pending_finance(self) -> None:
        response = self.client.patch(
            "/api/manager/requests/101/status",
            headers={"X-User-Id": "3"},
            json={"status": "Pending Finance"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "Pending Finance")
        self.assertIsNone(response.json()["current_processor_id"])

        with Session(self.engine) as session:
            expense = session.get(ExpenseRequest, 101)
            self.assertIsNotNone(expense)
            self.assertEqual(expense.status, RequestStatus.PENDING_FINANCE)
            self.assertIsNone(expense.current_processor_id)

            history_records = session.exec(
                select(RequestHistory).where(RequestHistory.expense_request_id == 101)
            ).all()
            self.assertEqual(len(history_records), 1)
            self.assertEqual(history_records[0].actor_id, 3)
            self.assertEqual(history_records[0].action_taken, "Approved")

    def test_manager_cannot_approve_non_pending_manager_request(self) -> None:
        response = self.client.patch(
            "/api/manager/requests/102/status",
            headers={"X-User-Id": "3"},
            json={"status": "Pending Finance"},
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(
            response.json()["detail"],
            "Only requests with status 'Pending Manager' can be processed by manager.",
        )

    def test_manager_cannot_approve_request_outside_direct_team(self) -> None:
        response = self.client.patch(
            "/api/manager/requests/104/status",
            headers={"X-User-Id": "3"},
            json={"status": "Pending Finance"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["detail"],
            "Access denied: this request is not assigned to your team.",
        )

    def test_manager_can_reject_pending_request_and_store_reason(self) -> None:
        response = self.client.patch(
            "/api/manager/requests/101/status",
            headers={"X-User-Id": "3"},
            json={"status": "Rejected", "rejection_reason": "Missing VAT invoice"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "Rejected")
        self.assertEqual(response.json()["rejection_reason"], "Missing VAT invoice")
        self.assertEqual(response.json()["current_processor_id"], 4)

        with Session(self.engine) as session:
            expense = session.get(ExpenseRequest, 101)
            self.assertIsNotNone(expense)
            self.assertEqual(expense.status, RequestStatus.REJECTED)
            self.assertEqual(expense.rejection_reason, "Missing VAT invoice")
            self.assertEqual(expense.current_processor_id, 4)

            history_records = session.exec(
                select(RequestHistory).where(RequestHistory.expense_request_id == 101)
            ).all()
            self.assertEqual(len(history_records), 1)
            self.assertEqual(history_records[0].action_taken, "Rejected")
            self.assertEqual(history_records[0].comments, "Missing VAT invoice")

    def test_manager_reject_requires_rejection_reason(self) -> None:
        response = self.client.patch(
            "/api/manager/requests/101/status",
            headers={"X-User-Id": "3"},
            json={"status": "Rejected"},
        )

        self.assertEqual(response.status_code, 422)

    def test_manager_reject_with_blank_reason_is_not_allowed(self) -> None:
        response = self.client.patch(
            "/api/manager/requests/101/status",
            headers={"X-User-Id": "3"},
            json={"status": "Rejected", "rejection_reason": "   "},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "rejection_reason is required when rejecting a request.",
        )

    def _seed_data(self) -> None:
        with Session(self.engine) as session:
            session.add_all(
                [
                    User(
                        id=2,
                        full_name="Finance One",
                        email="finance.one@example.com",
                        password_hash="not-used",
                        role=UserRole.FINANCE,
                    ),
                    User(
                        id=3,
                        full_name="Manager One",
                        email="manager.one@example.com",
                        password_hash="not-used",
                        role=UserRole.MANAGER,
                    ),
                    User(
                        id=30,
                        full_name="Manager Two",
                        email="manager.two@example.com",
                        password_hash="not-used",
                        role=UserRole.MANAGER,
                    ),
                    User(
                        id=4,
                        full_name="Employee One",
                        email="employee.one@example.com",
                        password_hash="not-used",
                        role=UserRole.EMPLOYEE,
                        manager_id=3,
                    ),
                    User(
                        id=5,
                        full_name="Employee Two",
                        email="employee.two@example.com",
                        password_hash="not-used",
                        role=UserRole.EMPLOYEE,
                        manager_id=3,
                    ),
                    User(
                        id=6,
                        full_name="Other Team Employee",
                        email="other.employee@example.com",
                        password_hash="not-used",
                        role=UserRole.EMPLOYEE,
                        manager_id=30,
                    ),
                ]
            )
            session.add(ExpenseCategory(id=1, name="Travel"))
            session.add_all(
                [
                    ExpenseRequest(
                        id=101,
                        employee_id=4,
                        category_id=1,
                        start_date=date(2026, 5, 10),
                        end_date=date(2026, 5, 10),
                        total_amount=Decimal("125.50"),
                        status=RequestStatus.PENDING_MANAGER,
                        current_processor_id=3,
                    ),
                    ExpenseRequest(
                        id=102,
                        employee_id=5,
                        category_id=1,
                        start_date=date(2026, 5, 11),
                        end_date=date(2026, 5, 11),
                        total_amount=Decimal("300.00"),
                        status=RequestStatus.DRAFT,
                        current_processor_id=None,
                    ),
                    ExpenseRequest(
                        id=103,
                        employee_id=5,
                        category_id=1,
                        start_date=date(2026, 5, 12),
                        end_date=date(2026, 5, 12),
                        total_amount=Decimal("400.00"),
                        status=RequestStatus.PENDING_MANAGER,
                        current_processor_id=30,
                    ),
                    ExpenseRequest(
                        id=104,
                        employee_id=6,
                        category_id=1,
                        start_date=date(2026, 5, 13),
                        end_date=date(2026, 5, 13),
                        total_amount=Decimal("500.00"),
                        status=RequestStatus.PENDING_MANAGER,
                        current_processor_id=3,
                    ),
                ]
            )
            session.commit()


if __name__ == "__main__":
    unittest.main()
