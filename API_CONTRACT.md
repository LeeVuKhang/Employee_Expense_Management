# API Rules

## Duplicate Expense (POST /api/expenses/:id/duplicate)
Frontend: Send the new dates in this JSON format.
Backend: Fetch the old request, insert a new request with these dates (Status: Draft), then copy the line items over.

{
  "new_start_date": "2026-06-01",
  "new_end_date": "2026-06-05"
}

---

## Create Expense (POST /api/expenses)
Frontend/Backend: Use this exact structure. Note that IDs are now INTEGERS, not strings.

{
  "employee_id": 42,
  "category_id": 3,
  "start_date": "2026-05-19",
  "end_date": "2026-05-21",
  "total_amount": 450.00,
  "line_items": [
    {
      "expense_date": "2026-05-19",
      "item_service_name": "Flight",
      "purpose_note": "Client meeting",
      "amount": 300.00
    }
  ]
}