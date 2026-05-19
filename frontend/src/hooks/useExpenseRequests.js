// src/hooks/useExpenseRequests.js
import { useCallback, useEffect, useState } from "react";
import { fetchExpenseRequests } from "../api/expenses";

export function useExpenseRequests(userId = null) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async (options = {}) => {
    const { quiet = false } = options;

    if (userId === null) {
      setRequests([]);
      setLoading(false);
      return;
    }

    if (!quiet) setLoading(true);
    setError(null);

    try {
      const normalized = await fetchExpenseRequests(userId);
      setRequests(normalized);
    } catch (err) {
      setError(err.message);
      setRequests([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [userId]);

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
        const normalized = await fetchExpenseRequests(userId);
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
  }, [userId]);

  return { requests, setRequests, loading, error, refresh };
}
