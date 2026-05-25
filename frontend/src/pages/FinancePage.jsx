import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layouts/Navbar";
import StatCard from "../components/ui/StatCard";
import SearchBar from "../components/ui/SearchBar";
import RequestCard from "../components/requests/RequestCard";

export default function FinancePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Pending Finance");

  const [data, setData] = useState({
    summary: { total_pending: 0, total_amount: 0 },
    requests: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navItems = [
    { label: "Finance Approvals", href: "/finance", active: true }
  ];
  const filterOptions = [
    { value: "Pending Finance", label: "Pending Finance" },
    { value: "Paid", label: "Paid" },
    { value: "All", label: "All Requests" },
  ];

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "";
    // Chúng ta sử dụng user ID 2 (Finance Manager) để vượt qua phân quyền require_finance_role
    fetch(`${apiBase}/api/finance/pending`, {
      headers: {
        "X-User-Id": "2"
      }
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Không thể tải danh sách yêu cầu tài chính (${res.status}): ${text}`);
        }
        return res.json();
      })
      .then(fetchedData => {
        setData(fetchedData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Format currency sang USD hiển thị
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(val);
  };

  // Ánh xạ dữ liệu từ backend sang định dạng UI yêu cầu
  const mappedRequests = data.requests.map(req => ({
    id: `#${req.id}`,
    idRaw: req.id, // Lưu lại ID số để điều hướng
    employeeName: req.employee_name,
    category: req.category_name,
    submittedDate: req.created_at,
    amount: parseFloat(req.total_amount),
    status: req.status,
    description: req.line_items?.[0]?.purpose_note || "Yêu cầu thanh toán chi phí",
    tripDateFrom: req.start_date,
    tripDateTo: req.end_date,
  }));

  // Lọc danh sách theo trạng thái và tìm kiếm
  const filteredRequests = mappedRequests.filter(req => {
    // 1. Lọc theo dropdown status
    if (filter !== "All" && req.status !== filter) {
      return false;
    }
    // 2. Lọc theo từ khóa tìm kiếm (Tên nhân viên hoặc ID)
    if (search.trim() !== "") {
      const query = search.toLowerCase();
      const matchName = req.employeeName.toLowerCase().includes(query);
      const matchId = req.id.toLowerCase().includes(query);
      return matchName || matchId;
    }
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", fontFamily: "'Inter', sans-serif" }}>
      <Navbar activePage="Finance Approvals" navItems={navItems} />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#111827", margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>Finance Queue</h1>
          <p style={{ fontSize: 18, color: "#6B7280", margin: 0 }}>Review manager-approved requests and process payments.</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 24, marginBottom: 40 }}>
          <StatCard
            label="Awaiting Processing"
            value={loading ? "..." : data.summary.total_pending.toString()}
            color="#059669"
            bg="#ECFDF5"
            labelColor="#059669"
          />
          <div style={{ flex: 2 }}>
            <StatCard
              label="Total Pending Payment"
              value={loading ? "..." : formatCurrency(data.summary.total_amount)}
              color="#FFFFFF"
              bg="#1F2937"
              labelColor="#D1D5DB"
            />
          </div>
        </div>

        {/* Search & Filter Row */}
        <div style={{ marginBottom: 24 }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by Employee or ID..."
            filterValue={filter}
            onFilterChange={setFilter}
            filterOptions={filterOptions}
            filterLabel="Status"
          />
        </div>

        {/* Requests List */}
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#6B7280" }}>Đang tải danh sách yêu cầu...</div>
        ) : error ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#DC2626" }}>Lỗi: {error}</div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#6B7280" }}>Không tìm thấy yêu cầu thanh toán nào.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredRequests.map(req => (
              <RequestCard key={req.id} request={req} onClick={() => navigate(`/finance/request/${req.idRaw}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
