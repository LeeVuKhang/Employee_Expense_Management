from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)

def test_block_edit_on_locked_request():
    # You will mock this with real DB data later
    locked_expense_id = 1 
    
    response = client.put(
        f"/api/expenses/{locked_expense_id}", 
        json={"total_amount": 9999}
    )
    
    # We expect Person B to return a 403 Forbidden
    assert response.status_code == 403

def test_duplicate_request():
    original_id = 2
    response = client.post(
        f"/api/expenses/{original_id}/duplicate",
        json={
            "new_start_date": "2026-06-01",
            "new_end_date": "2026-06-05"
        }
    )
    
    # We expect a 201 Created and a new ID
    assert response.status_code == 201
    assert "new_id" in response.json()