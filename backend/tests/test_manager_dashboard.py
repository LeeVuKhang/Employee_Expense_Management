import os
import unittest
from datetime import date
from decimal import Decimal

os.environ.setdefault("DATABASE_URL", "postgresql://user:password@localhost:5432/test")

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.database import get_session
from app.main import app
from app.model.expense import ExpenseCategory, ExpenseRequest, RequestStatus
from app.model.user import User, UserRole


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

    def test_manager_sees_only_direct_team_pending_requests_assigned_to_them(self) -> None:
        response = self.client.get(
            "/api/manager/expense-requests/pending",
            headers={"X-User-Id": "3"},
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
            headers={"X-User-Id": "3"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"pending_count": 1, "total_amount": "125.50"},
        )

    def test_non_manager_cannot_access_pending_requests(self) -> None:
        response = self.client.get(
            "/api/manager/expense-requests/pending",
            headers={"X-User-Id": "4"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Manager access required.")

    def test_missing_user_cannot_access_pending_requests(self) -> None:
        response = self.client.get(
            "/api/manager/expense-requests/pending",
            headers={"X-User-Id": "999"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Manager access required.")

    def _seed_data(self) -> None:
        with Session(self.engine) as session:
            session.add_all(
                [
                    User(
                        id=3,
                        full_name="Manager One",
                        email="manager.one@example.com",
                        role=UserRole.MANAGER,
                    ),
                    User(
                        id=30,
                        full_name="Manager Two",
                        email="manager.two@example.com",
                        role=UserRole.MANAGER,
                    ),
                    User(
                        id=4,
                        full_name="Employee One",
                        email="employee.one@example.com",
                        role=UserRole.EMPLOYEE,
                        manager_id=3,
                    ),
                    User(
                        id=5,
                        full_name="Employee Two",
                        email="employee.two@example.com",
                        role=UserRole.EMPLOYEE,
                        manager_id=3,
                    ),
                    User(
                        id=6,
                        full_name="Other Team Employee",
                        email="other.employee@example.com",
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
