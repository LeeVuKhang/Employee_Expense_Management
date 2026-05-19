// components/requests/StatusLegend.jsx
// Clickable color legend chips — click to quick-filter by status

import { STATUS_CONFIG } from "../../data/mockRequests";

export default function StatusLegend({ activeStatus, onSelect }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        padding: "12px 16px",
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        border: "1px solid #E5E7EB",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>STATUS:</span>

      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
        const active = activeStatus === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(active ? "all" : key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              border: "none",
              background: active ? cfg.bg : "none",
              borderRadius: 6,
              padding: active ? "2px 8px" : "2px 4px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: cfg.color,
                flexShrink: 0,
                display: "block",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: active ? cfg.color : "#6B7280",
                fontWeight: active ? 700 : 400,
              }}
            >
              {cfg.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
