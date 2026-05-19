// components/requests/StatusBadge.jsx
// AC2: Color-coded badge  AC3: Whose turn indicator
//
//  Draft           → Blue   (#3B82F6)
//  Pending Manager → Amber  (#D97706)
//  Pending Finance → Purple (#7C3AED)
//  Paid            → Green  (#059669)
//  Rejected        → Red    (#DC2626)

import { STATUS_CONFIG } from "../../data/mockRequests";

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "#6B7280",
    bg: "#F3F4F6",
    turn: null,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      {/* AC2: Colored badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: cfg.color,
          backgroundColor: cfg.bg,
          border: `1px solid ${cfg.color}33`,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ display: "none" }} />
        {cfg.label}
      </span>

    </div>
  );
}
