// src/hooks/useExpenseRequests.js
import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function useExpenseRequests(userId = null) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchRequests() {
      if (userId === null) {
        setRequests([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/expenses`, {
          headers: {
            "X-User-Id": String(userId),
          },
        });

        if (ignore) return;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `HTTP ${res.status}`);
        }

        const data = await res.json();

        const normalized = (data ?? []).map((row) => ({
          id:            row.id,
          ownerId:       row.employee_id,
          category:      row.category_name ?? "Unknown",
          description:   row.rejection_reason ? `Rejected: ${row.rejection_reason}` : "—",
          amount:        Number(row.total_amount ?? 0),
          status:        row.status,
          submittedDate: row.created_at,
          tripDateFrom:  row.start_date,
          tripDateTo:    row.end_date,
          isLocked:      row.is_locked,
        }));
        setRequests(normalized);
      } catch (err) {
        if (!ignore) {
          setError(err.message);
          setRequests([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchRequests();
    return () => { ignore = true; };
  }, [userId]);

  return { requests, loading, error };
}
