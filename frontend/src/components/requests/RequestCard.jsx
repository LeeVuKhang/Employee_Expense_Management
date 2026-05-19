// components/requests/RequestCard.jsx
import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { STATUS_CONFIG } from "../../data/mockRequests";

// Khớp với expense_categories.name trong DB:
//   Travel | Accommodation | Meals | Office Supplies | Training
const CATEGORY_ICONS = {
  "Travel":                "✈️",
  "Accommodation":         "🏨",
  "Meals":                 "🍽️",
  "Meals & Entertainment": "🍽️",  // fallback nếu tên cũ vẫn tồn tại
  "Office Supplies":       "🖊️",
  "Training":              "📚",
  "Software":              "💻",
  "Other":                 "📎",
};

export default function RequestCard({ request, onClick }) {
  const [hovered, setHovered] = useState(false);

  const icon = CATEGORY_ICONS[request.category] ?? "📎";
  const cfg  = STATUS_CONFIG[request.status] ?? {};

  // start_date / end_date đến từ DB dưới dạng "YYYY-MM-DD" string
  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("vi-VN");
  };

  const sameDay   = request.tripDateFrom === request.tripDateTo;
  const dateRange = sameDay
    ? fmtDate(request.tripDateFrom)
    : `${fmtDate(request.tripDateFrom)} → ${fmtDate(request.tripDateTo)}`;

  // submitted date từ created_at (ISO timestamp)
  const submittedLabel = request.submittedDate
    ? new Date(request.submittedDate).toLocaleDateString("vi-VN")
    : "—";

  return (
    <div
      onClick={() => onClick?.(request)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "20px 24px",
        backgroundColor: hovered ? "#FAFAFA" : "#FFFFFF",
        borderRadius:    12,
        border:          "1px solid",
        borderColor:     hovered ? (cfg.color ?? "#E5E7EB") : "#E5E7EB",
        cursor:          "pointer",
        transition:      "all 0.18s ease",
        boxShadow:       hovered ? "0 4px 16px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
        transform:       hovered ? "translateY(-1px)" : "none",
        gap:             16,
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: cfg.bg ?? "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827", fontFamily: "'DM Mono', monospace" }}>#{request.id}</span>
            <span style={{ color: "#D1D5DB", fontSize: 12 }}>•</span>
            <span style={{ fontSize: 14, color: "#374151", fontWeight: 500 }}>{request.category}</span>
            <span style={{ color: "#D1D5DB", fontSize: 12 }}>•</span>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>{submittedLabel}</span>
          </div>
          {/* description: nếu có rejection_reason thì hiển thị */}
          {request.description && request.description !== "—" && (
            <p style={{ margin: 0, fontSize: 13, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>
              {request.description}
            </p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9CA3AF" }}>📅 {dateRange}</p>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#111827", fontFamily: "'DM Mono', monospace" }}>
          ${request.amount.toFixed(2)}
        </span>
        <StatusBadge status={request.status} />
      </div>
    </div>
  );
}
