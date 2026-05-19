// components/requests/RequestCard.jsx
import { useState } from "react";
import StatusBadge from "./StatusBadge";

export default function RequestCard({ request, onClick }) {
  const [hovered, setHovered] = useState(false);
  const sameDay = request.tripDateFrom === request.tripDateTo;
  const dateRange = sameDay ? request.tripDateFrom : `${request.tripDateFrom} → ${request.tripDateTo}`;

  return (
    <div
      onClick={() => onClick?.(request)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 28px",
        backgroundColor: hovered ? "#FAFAFA" : "#FFFFFF",
        borderRadius: 12,
        border: "1px solid",
        borderColor: hovered ? "#D1D5DB" : "#E5E7EB",
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-1px)" : "none",
        gap: 16,
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 0 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#475569", flexShrink: 0 }}>
          {request.category ? request.category.charAt(0) : "U"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>#{request.id}</span>
            <span style={{ color: "#D1D5DB", fontSize: 12 }}>•</span>
            <span style={{ fontSize: 14, color: "#6B7280" }}>{request.category}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: "#6B7280" }}>{dateRange}</span>
            <span style={{ color: "#D1D5DB", fontSize: 12 }}>•</span>
            <span style={{ fontSize: 14, color: "#6B7280" }}>Submitted {new Date(request.submittedDate).toLocaleDateString("en-US")}</span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 18, color: "#111827", fontFamily: "'Inter', sans-serif" }}>${request.amount.toFixed(2)}</span>
        <StatusBadge status={request.status} />
        <span style={{ color: "#9CA3AF", fontSize: 20 }}>→</span>
      </div>
    </div>
  );
}
