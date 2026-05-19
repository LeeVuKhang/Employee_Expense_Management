// pages/MyRequests.jsx
import { useState, useMemo } from "react";
import Navbar from "../components/layouts/Navbar";
import RequestCard from "../components/requests/RequestCard";
import RequestDetailModal from "../components/requests/RequestDetailModal";
import StatusBadge from "../components/requests/StatusBadge";
import StatusLegend from "../components/requests/StatusLegend";
import SearchBar from "../components/ui/SearchBar";
import StatCard from "../components/ui/StatCard";
import { STATUS_CONFIG } from "../data/mockRequests";
import { useExpenseRequests } from "../hooks/useExpenseRequests";

// TODO: Thay bằng ID integer của user đang đăng nhập (lấy từ Supabase auth session)
// Ví dụ: const { data: { user } } = await supabase.auth.getUser();
// rồi join với bảng users để lấy users.id (integer)
const CURRENT_USER_ID = 4; // integer — Employee One (emp.one@company.com), có data trong DB

const ALL_STATUSES = "all";

export default function MyRequests() {
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState(ALL_STATUSES);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Fetch từ Supabase — chỉ lấy request của current user (lọc theo employee_id)
  const { requests: myRequests, loading, error } = useExpenseRequests(CURRENT_USER_ID);

  // Stats — dùng đúng giá trị ENUM từ DB
  const stats = useMemo(() => {
    const total       = myRequests.length;
    const pending     = myRequests.filter((r) =>
      r.status === "Pending Manager" || r.status === "Pending Finance"
    ).length;
    const paid        = myRequests.filter((r) => r.status === "Paid").length;
    const rejected    = myRequests.filter((r) => r.status === "Rejected").length;
    const totalAmount = myRequests
      .filter((r) => r.status !== "Rejected" && r.status !== "Cancelled")
      .reduce((s, r) => s + r.amount, 0);
    return { total, pending, paid, rejected, totalAmount };
  }, [myRequests]);

  // Filter theo search + status
  const filtered = useMemo(() =>
    myRequests.filter((r) => {
      const q = search.toLowerCase();
      const idStr = String(r.id); // id là integer trong DB
      const matchSearch =
        !q ||
        idStr.includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q);
      const matchStatus = statusFilter === ALL_STATUSES || r.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [myRequests, search, statusFilter]
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Navbar — component từ components/layouts/Navbar.jsx */}
      <Navbar activePage="My Requests" />

      {/* Body */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 24px" }}>

        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>My Requests</h1>
            <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 14 }}>Track your expense reimbursements in real time.</p>
          </div>
          <button style={{ padding: "10px 20px", backgroundColor: "#2563EB", color: "#FFFFFF", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }}>+ New Request</button>
        </div>

        {/* Stats — component từ components/ui/StatCard.jsx */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Total Requests"  value={stats.total}                                  color="#6B7280" bg="#F3F4F6" />
          <StatCard label="Pending Review"  value={stats.pending}                                color="#D97706" bg="#FFFBEB" />
          <StatCard label="Paid"            value={stats.paid}                                   color="#059669" bg="#ECFDF5" />
          <StatCard label="Rejected"        value={stats.rejected}                               color="#DC2626" bg="#FEF2F2" />
          <StatCard label="Total Claimed"   value={`$${stats.totalAmount.toLocaleString()}`}    color="#2563EB" bg="#EFF6FF" />
        </div>

        {/* Search + Status filter — component từ components/ui/SearchBar.jsx */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by ID, category, or description..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "10px 16px", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 14, color: "#374151", backgroundColor: "#FFFFFF", cursor: "pointer", outline: "none", fontFamily: "inherit", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", minWidth: 170 }}
          >
            <option value={ALL_STATUSES}>All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Legend chips — component từ components/requests/StatusLegend.jsx */}
        <div style={{ marginBottom: 20 }}>
          <StatusLegend activeStatus={statusFilter} onSelect={setStatusFilter} />
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "#6B7280", fontSize: 15 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
              Đang tải dữ liệu...
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 24px", backgroundColor: "#FEF2F2", borderRadius: 12, border: "1px solid #FECACA" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ color: "#DC2626", fontWeight: 600, marginBottom: 4 }}>Không thể tải dữ liệu</div>
              <div style={{ color: "#EF4444", fontSize: 13 }}>{error}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "#9CA3AF", fontSize: 15 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              No requests found matching your filters.
            </div>
          ) : (
            filtered.map((req) => <RequestCard key={req.id} request={req} onClick={setSelectedRequest} />)
          )}
        </div>

        {!loading && !error && filtered.length > 0 && (
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#9CA3AF" }}>
            Showing {filtered.length} of {myRequests.length} requests
          </p>
        )}
      </div>

      {/* Detail Modal — component từ components/requests/RequestDetailModal.jsx */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}