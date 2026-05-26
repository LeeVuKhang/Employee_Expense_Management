// src/hooks/useExpenseRequests.js
import { useCallback, useEffect, useState } from "react";
import { fetchExpenseRequests } from "../api/expenses";

export function useExpenseRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (options = {}) => {
    const { quiet = false } = options;

    if (!quiet) setLoading(true);
    setError(null);

    try {
      const normalized = await fetchExpenseRequests();
      setRequests(normalized);
    } catch (err) {
      setError(err.message);
      setRequests([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchRequests() {
      setLoading(true);
      setError(null);

      try {
        const normalized = await fetchExpenseRequests();
        if (!ignore) setRequests(normalized);
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
  }, []);

  return { requests, setRequests, loading, error, refresh };
}
