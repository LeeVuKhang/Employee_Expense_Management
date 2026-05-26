import { useMemo, useState } from "react";
import Navbar from "../components/layouts/Navbar";
import RequestCard from "../components/requests/RequestCard";
import StatusLegend from "../components/requests/StatusLegend";
import SearchBar from "../components/ui/SearchBar";
import StatCard from "../components/ui/StatCard";
import { STATUS_CONFIG } from "../data/mockRequests";
import { useExpenseRequests } from "../hooks/useExpenseRequests";

const ALL_STATUSES = "all";

export default function MyRequests({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const {
    requests: myRequests,
    loading,
    error,
  } = useExpenseRequests();

  const stats = useMemo(() => {
    const total = myRequests.length;
    const pending = myRequests.filter((r) =>
      r.status === "Pending Manager" || r.status === "Pending Finance"
    ).length;
    const paid = myRequests.filter((r) => r.status === "Paid").length;
    const rejected = myRequests.filter((r) => r.status === "Rejected").length;
    const totalAmount = myRequests
      .filter((r) => r.status !== "Rejected" && r.status !== "Cancelled")
      .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    return { total, pending, paid, rejected, totalAmount };
  }, [myRequests]);

  const filtered = useMemo(() =>
    myRequests.filter((request) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        String(request.id).toLowerCase().includes(q) ||
        String(request.category ?? "").toLowerCase().includes(q) ||
        String(request.description ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === ALL_STATUSES || request.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [myRequests, search, statusFilter]
  );

  const statusFilterOptions = [
    { value: ALL_STATUSES, label: "All Statuses" },
    ...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      value: key,
      label: cfg.label,
    })),
  ];

  return (
    <div className="app-shell">
      <Navbar activePage="My Requests" onNavigate={onNavigate} />

      <main className="page-frame employee-requests-frame">
        <div className="page-title-row employee-requests-heading">
          <div>
            <h1>My Requests</h1>
            <p>Manage your expense reimbursements.</p>
          </div>
          <button
            className="primary-button new-request-button"
            type="button"
            onClick={() => onNavigate?.("New Request", { mode: "create" })}
          >
            New Request
          </button>
        </div>

        <div className="employee-stats-grid">
          <StatCard label="Total Requests" value={stats.total} color="#6B7280" bg="#F3F4F6" />
          <StatCard label="Pending Review" value={stats.pending} color="#D97706" bg="#FFFBEB" />
          <StatCard label="Paid" value={stats.paid} color="#059669" bg="#ECFDF5" />
          <StatCard label="Rejected" value={stats.rejected} color="#DC2626" bg="#FEF2F2" />
          <StatCard label="Total Claimed" value={`$${stats.totalAmount.toLocaleString()}`} color="#2563EB" bg="#EFF6FF" />
        </div>

        <div className="requests-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by ID, category, or description..."
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={statusFilterOptions}
            filterLabel="Status"
          />
        </div>

        <div className="requests-legend">
          <StatusLegend activeStatus={statusFilter} onSelect={setStatusFilter} />
        </div>

        <div className="requests-list">
          {loading ? (
            <div className="dashboard-state" role="status">
              Loading requests...
            </div>
          ) : error ? (
            <div className="dashboard-state error-state" role="alert">
              <strong>Unable to load requests</strong>
              <span>{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="dashboard-state empty-state">
              <strong>No requests found</strong>
              <span>
                {myRequests.length
                  ? "No requests match the current search or status filter."
                  : "Create a new request to start tracking reimbursements."}
              </span>
            </div>
          ) : (
            filtered.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onClick={() => onNavigate?.("Request Detail", { request: req })}
              />
            ))
          )}
        </div>

        {!loading && !error && filtered.length > 0 && (
          <p className="requests-count">
            Showing {filtered.length} of {myRequests.length} requests
          </p>
        )}
      </main>
    </div>
  );
}
