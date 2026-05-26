import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layouts/Navbar";
import StatusBadge from "../components/requests/StatusBadge";
import SearchBar from "../components/ui/SearchBar";
import { clearAuthStorage, getAuthToken } from "../contexts/AuthContext";

const FINANCE_FILTER_OPTIONS = [
  { value: "All", label: "All Finance Statuses" },
  { value: "Pending Finance", label: "Pending Finance" },
  { value: "Finance Approved", label: "Finance Approved" },
  { value: "Paid", label: "Paid" },
];

export default function FinancePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [data, setData] = useState({
    summary: { total_pending: 0, total_amount: 0 },
    requests: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCurrent = true;
    const apiBase = import.meta.env.VITE_API_URL || "";

    async function loadFinanceQueue() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBase}/api/finance/pending`, {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        });

        if (response.status === 401) {
          clearAuthStorage();
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`Unable to load finance queue (${response.status}): ${message}`);
        }

        const fetchedData = await response.json();
        if (isCurrent) {
          setData(fetchedData);
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.message);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    loadFinanceQueue();

    return () => {
      isCurrent = false;
    };
  }, []);

  const mappedRequests = useMemo(
    () => data.requests.map(toFinanceRequestViewModel),
    [data.requests],
  );

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mappedRequests.filter((request) => {
      const matchesFilter = filter === "All" || request.status === filter;
      const matchesSearch =
        !query ||
        [request.employeeName, request.employeeId, request.id].some((value) =>
          String(value ?? "").toLowerCase().includes(query),
        );

      return matchesFilter && matchesSearch;
    });
  }, [filter, mappedRequests, search]);

  return (
    <div className="app-shell">
      <Navbar activePage="Finance Approvals" />

      <main className="page-frame finance-page-frame">
        <section className="finance-dashboard">
          <div className="page-title-row finance-dashboard-heading">
            <div>
              <h1>Finance Queue</h1>
              <p>Review manager-approved requests and process payments.</p>
            </div>
          </div>

          <div className="finance-summary-grid" aria-label="Finance queue summary">
            <article className="card finance-summary-card finance-summary-card-emerald">
              <span>Awaiting Processing</span>
              <strong>{loading ? "-" : Number(data.summary.total_pending ?? 0)}</strong>
            </article>
            <article className="card finance-summary-card finance-summary-card-dark">
              <span>Total Pending Payment</span>
              <strong>{loading ? "-" : formatCurrency(data.summary.total_amount)}</strong>
            </article>
          </div>

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by Employee or ID..."
            filterValue={filter}
            onFilterChange={setFilter}
            filterOptions={FINANCE_FILTER_OPTIONS}
            filterLabel="Status"
          />

          {loading && (
            <div className="dashboard-state" role="status">
              Loading finance queue...
            </div>
          )}

          {!loading && error && (
            <div className="dashboard-state error-state" role="alert">
              <strong>Unable to load finance queue.</strong>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && filteredRequests.length === 0 && (
            <div className="dashboard-state empty-state">
              <strong>No matching requests</strong>
              <span>Try another employee, request ID, or finance status.</span>
            </div>
          )}

          {!loading && !error && filteredRequests.length > 0 && (
            <div className="finance-request-list">
              {filteredRequests.map((request) => (
                <FinanceRequestCard
                  key={request.idRaw}
                  request={request}
                  onOpen={() => navigate(`/finance/request/${request.idRaw}`)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FinanceRequestCard({ request, onOpen }) {
  return (
    <button
      className="finance-request-card"
      type="button"
      onClick={onOpen}
      aria-label={`Open ${request.id} from ${request.employeeName}`}
    >
      <span className="finance-request-avatar" aria-hidden="true">
        {getInitial(request.employeeName)}
      </span>

      <span className="finance-request-main">
        <span className="finance-request-title-row">
          <strong>{request.employeeName}</strong>
          <span>{request.id}</span>
        </span>
        <span className="finance-request-subtitle">
          {request.category} - Submitted {formatDate(request.submittedDate)}
        </span>
      </span>

      <span className="finance-request-side">
        <strong>{formatCurrency(request.amount)}</strong>
        <StatusBadge status={request.status} />
        <span className="finance-request-arrow" aria-hidden="true">→</span>
      </span>
    </button>
  );
}

function toFinanceRequestViewModel(request) {
  return {
    id: formatRequestId(request.id),
    idRaw: request.id,
    employeeId: request.employee_id,
    employeeName: request.employee_name ?? `Employee #${request.employee_id ?? "Unknown"}`,
    category: request.category_name ?? `Category #${request.category_id ?? "Unknown"}`,
    submittedDate: request.created_at,
    amount: Number(request.total_amount ?? 0),
    status: request.status,
  };
}

function formatRequestId(id) {
  const rawId = String(id ?? "").trim();
  if (!rawId) return "REQ-000";
  if (/^REQ-/i.test(rawId)) return rawId.toUpperCase();

  return `REQ-${rawId.replace(/^#/, "").padStart(3, "0")}`;
}

function getInitial(name) {
  return String(name ?? "F").trim().charAt(0).toUpperCase() || "F";
}

function formatCurrency(value, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(value ?? 0));
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value ?? 0));
  }
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB").format(date);
}
