import unittest
from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.core.database import get_session
from app.main import app
from app.model.expense import ExpenseCategory, ExpenseLineItem, ExpenseRequest, RequestStatus
from app.model.user import User, UserRole
from app.service.auth_service import create_access_token


class ExpenseRequestActionsTest(unittest.TestCase):
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

    def _auth_headers(self, user_id: int, role: UserRole = UserRole.EMPLOYEE) -> dict[str, str]:
        token = create_access_token(
            {
                "sub": str(user_id),
                "role": role.value,
                "email": "employee.one@example.com",
            }
        )
        return {"Authorization": f"Bearer {token}"}

    def test_block_edit_on_locked_request(self) -> None:
        response = self.client.put(
            "/api/expenses/1",
            headers=self._auth_headers(4),
            json={"category_id": 1},
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["detail"],
            "Only Draft or Pending Manager requests can be changed.",
        )

    def test_duplicate_request(self) -> None:
        response = self.client.post(
            "/api/expenses/2/duplicate",
            headers=self._auth_headers(4),
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertNotEqual(body["id"], 2)
        self.assertEqual(body["employee_id"], 4)
        self.assertEqual(body["status"], "Draft")
        self.assertEqual(body["category_id"], 1)
        self.assertEqual(len(body["line_items"]), 1)
        self.assertEqual(body["line_items"][0]["item_service_name"], "Taxi")

    def test_submitted_request_is_assigned_to_employee_manager(self) -> None:
        response = self.client.post(
            "/api/expenses",
            headers=self._auth_headers(4),
            json={
                "category_id": 1,
                "start_date": "2026-05-12",
                "end_date": "2026-05-12",
                "status": "Pending Manager",
                "line_items": [
                    {
                        "expense_date": "2026-05-12",
                        "item_service_name": "Lunch",
                        "amount": "12.00",
                        "purpose_note": "Team lunch",
                    }
                ],
            },
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "Pending Manager")
        self.assertEqual(body["current_processor_id"], 3)

    def _seed_data(self) -> None:
        with Session(self.engine) as session:
            session.add(
                User(
                    id=3,
                    full_name="Manager One",
                    email="manager.one@example.com",
                    password_hash="not-used",
                    role=UserRole.MANAGER,
                )
            )
            session.add(
                User(
                    id=4,
                    full_name="Employee One",
                    email="employee.one@example.com",
                    password_hash="not-used",
                    role=UserRole.EMPLOYEE,
                    manager_id=3,
                )
            )
            session.add(ExpenseCategory(id=1, name="Travel"))
            session.add_all(
                [
                    ExpenseRequest(
                        id=1,
                        employee_id=4,
                        category_id=1,
                        start_date=date(2026, 5, 10),
                        end_date=date(2026, 5, 10),
                        total_amount=Decimal("100.00"),
                        status=RequestStatus.FINANCE_APPROVED,
                        is_locked=True,
                    ),
                    ExpenseRequest(
                        id=2,
                        employee_id=4,
                        category_id=1,
                        start_date=date(2026, 5, 11),
                        end_date=date(2026, 5, 11),
                        total_amount=Decimal("25.50"),
                        status=RequestStatus.PAID,
                        is_locked=True,
                    ),
                ]
            )
            session.add(
                ExpenseLineItem(
                    expense_request_id=2,
                    expense_date=date(2026, 5, 11),
                    item_service_name="Taxi",
                    amount=Decimal("25.50"),
                    purpose_note="Client visit",
                )
            )
            session.commit()


if __name__ == "__main__":
    unittest.main()
