// src/hooks/useExpenseRequests.js
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

/**
 * Fetch expense requests từ Supabase và map sang camelCase cho các component.
 *
 * Schema thực tế (EEM.sql):
 *   expense_requests: id, employee_id, category_id, start_date, end_date,
 *                     total_amount, status, created_at, rejection_reason, is_locked
 *   expense_categories: id, name
 *
 * @param {number|null} userId  - employee_id (INT) để lọc. null = lấy tất cả.
 */
export function useExpenseRequests(userId = null) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchRequests() {
      setLoading(true);
      setError(null);

      // Join expense_categories để lấy category name thay vì category_id
      let query = supabase
        .from("expense_requests")
        .select(`
          id,
          employee_id,
          start_date,
          end_date,
          total_amount,
          status,
          rejection_reason,
          is_locked,
          created_at,
          expense_categories ( name )
        `)
        .order("created_at", { ascending: false });

      if (userId !== null) {
        query = query.eq("employee_id", userId);
      }

      const { data, error: sbError } = await query;

      if (ignore) return;

      if (sbError) {
        setError(sbError.message);
        setRequests([]);
      } else {
        // Map DB columns → camelCase fields dùng trong các component
        const normalized = (data ?? []).map((row) => ({
          id:            row.id,
          ownerId:       row.employee_id,
          // category name từ join; fallback "Unknown" nếu chưa có data
          category:      row.expense_categories?.name ?? "Unknown",
          // description chưa có trong DB → hiển thị placeholder
          description:   row.rejection_reason ? `Rejected: ${row.rejection_reason}` : "—",
          amount:        Number(row.total_amount ?? 0),
          status:        row.status,                // enum: 'Draft' | 'Pending Manager' | …
          submittedDate: row.created_at,            // created_at dùng làm submitted date
          tripDateFrom:  row.start_date,
          tripDateTo:    row.end_date,
          isLocked:      row.is_locked,
        }));
        setRequests(normalized);
      }

      setLoading(false);
    }

    fetchRequests();
    return () => { ignore = true; };
  }, [userId]);

  return { requests, loading, error };
}
