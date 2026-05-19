// pages/MyRequests.jsx
import { useState, useMemo } from "react";
import RequestCard from "../components/requests/RequestCard";
import StatusBadge from "../components/requests/StatusBadge";
import { STATUS_CONFIG } from "../data/mockRequests";
import { useExpenseRequests } from "../hooks/useExpenseRequests";

// TODO: Thay bằng ID integer của user đang đăng nhập (lấy từ Supabase auth session)
// Ví dụ: const { data: { user } } = await supabase.auth.getUser();
// rồi join với bảng users để lấy users.id (integer)
const CURRENT_USER_ID = 4; // integer — Employee One (emp.one@company.com), có data trong DB

const ALL_STATUSES = "all";

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ flex: 1, minWidth: 120, padding: "16px 20px", borderRadius: 12, backgroundColor: bg, border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

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

  // Format ngày từ ISO string sang locale
  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("vi-VN");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Navbar */}
      <nav style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5E7EB", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF", fontWeight: 800, fontSize: 16 }}>E</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Expensify</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ label: "My Requests", active: true }, { label: "New Request", active: false }].map(({ label, active }) => (
            <button key={label} style={{ padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, backgroundColor: active ? "#EFF6FF" : "transparent", color: active ? "#2563EB" : "#6B7280" }}>{label}</button>
          ))}
        </div>
        <div style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>JD</div>
      </nav>

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

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Total Requests"  value={stats.total}                                  color="#6B7280" bg="#F3F4F6" />
          <StatCard label="Pending Review"  value={stats.pending}                                color="#D97706" bg="#FFFBEB" />
          <StatCard label="Paid"            value={stats.paid}                                   color="#059669" bg="#ECFDF5" />
          <StatCard label="Rejected"        value={stats.rejected}                               color="#DC2626" bg="#FEF2F2" />
          <StatCard label="Total Claimed"   value={`$${stats.totalAmount.toLocaleString()}`}    color="#2563EB" bg="#EFF6FF" />
        </div>

        {/* Search + Status filter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <span style={{ color: "#9CA3AF" }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, category, or description..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: "#374151", backgroundColor: "transparent" }}
            />
            {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>}
          </div>
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

        {/* Legend chips */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", padding: "12px 16px", backgroundColor: "#FFFFFF", borderRadius: 10, border: "1px solid #E5E7EB", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>STATUS:</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const active = statusFilter === key;
            return (
              <button key={key} onClick={() => setStatusFilter(active ? ALL_STATUSES : key)} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.color, flexShrink: 0, display: "block" }} />
                <span style={{ fontSize: 12, color: active ? cfg.color : "#6B7280", fontWeight: active ? 700 : 400 }}>{cfg.label}</span>
              </button>
            );
          })}
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

      {/* Detail Modal */}
      {selectedRequest && (
        <div onClick={() => setSelectedRequest(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24, backdropFilter: "blur(2px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 32, maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827", fontFamily: "'DM Mono', monospace" }}>#{selectedRequest.id}</h2>
                <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>{selectedRequest.category}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} style={{ border: "none", background: "#F3F4F6", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 20, color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            {[
              ["Amount",     `$${selectedRequest.amount.toFixed(2)}`],
              ["Submitted",  fmtDate(selectedRequest.submittedDate)],
              ["Trip From",  fmtDate(selectedRequest.tripDateFrom)],
              ["Trip To",    fmtDate(selectedRequest.tripDateTo)],
              ...(selectedRequest.description && selectedRequest.description !== "—"
                ? [["Note", selectedRequest.description]]
                : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{val}</span>
              </div>
            ))}

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <StatusBadge status={selectedRequest.status} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}