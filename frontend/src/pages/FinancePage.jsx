import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layouts/Navbar";
import StatCard from "../components/ui/StatCard";
import SearchBar from "../components/ui/SearchBar";
import RequestCard from "../components/requests/RequestCard";
import { MOCK_REQUESTS } from "../data/mockRequests";

export default function FinancePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Pending Finance");

  const navItems = [
    { label: "Finance Approvals", href: "/finance", active: true }
  ];

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
            value="1"
            color="#059669"
            bg="#ECFDF5"
            labelColor="#059669"
          />
          <div style={{ flex: 2 }}>
            <StatCard
              label="Total Pending Payment"
              value="$45.00"
              color="#FFFFFF"
              bg="#1F2937"
              labelColor="#D1D5DB"
            />
          </div>
        </div>

        {/* Search & Filter Row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by Employee or ID..." />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: "12px 18px",
                paddingRight: 44,
                borderRadius: 10,
                border: "1px solid #E5E7EB",
                backgroundColor: "#FFFFFF",
                fontSize: 15,
                color: "#374151",
                outline: "none",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}
            >
              <option value="Pending Finance">Pending Finance</option>
              <option value="Paid">Paid</option>
              <option value="All">All Requests</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {MOCK_REQUESTS.map(req => (
            <RequestCard key={req.id} request={req} onClick={() => navigate(`/finance/request/${req.id}`)} />
          ))}
        </div>
      </main>
    </div>
  );
}
