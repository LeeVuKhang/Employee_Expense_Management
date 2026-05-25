import { useMemo, useState } from "react";
import Navbar from "../components/layouts/Navbar";
import RequestCard from "../components/requests/RequestCard";
import StatusLegend from "../components/requests/StatusLegend";
import SearchBar from "../components/ui/SearchBar";
import StatCard from "../components/ui/StatCard";
import { STATUS_CONFIG } from "../data/mockRequests";
import { useExpenseRequests } from "../hooks/useExpenseRequests";

// TODO: Replace with the signed-in employee id once auth is wired in.
const CURRENT_USER_ID = 4;
const ALL_STATUSES = "all";

export default function MyRequests({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);

  const {
    requests: myRequests,
    loading,
    error,
  } = useExpenseRequests(CURRENT_USER_ID);

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
    <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <Navbar activePage="My Requests" onNavigate={onNavigate} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: 0 }}>My Requests</h1>
            <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 14 }}>Track your expense reimbursements in real time.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("New Request", { mode: "create" })}
            style={{ padding: "10px 20px", backgroundColor: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}
          >
            + New Request
          </button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Total Requests" value={stats.total} color="#6B7280" bg="#F3F4F6" />
          <StatCard label="Pending Review" value={stats.pending} color="#D97706" bg="#FFFBEB" />
          <StatCard label="Paid" value={stats.paid} color="#059669" bg="#ECFDF5" />
          <StatCard label="Rejected" value={stats.rejected} color="#DC2626" bg="#FEF2F2" />
          <StatCard label="Total Claimed" value={`$${stats.totalAmount.toLocaleString()}`} color="#2563EB" bg="#EFF6FF" />
        </div>

        <div style={{ marginBottom: 16 }}>
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

        <div style={{ marginBottom: 20 }}>
          <StatusLegend activeStatus={statusFilter} onSelect={setStatusFilter} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "#6B7280", fontSize: 15 }}>
              Loading requests...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 24px", backgroundColor: "#FEF2F2", borderRadius: 12, border: "1px solid #FECACA" }}>
              <div style={{ color: "#DC2626", fontWeight: 600, marginBottom: 4 }}>Unable to load requests</div>
              <div style={{ color: "#EF4444", fontSize: 13 }}>{error}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "#9CA3AF", fontSize: 15 }}>
              No requests found matching your filters.
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
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#9CA3AF" }}>
            Showing {filtered.length} of {myRequests.length} requests
          </p>
        )}
      </div>
    </div>
  );
}
