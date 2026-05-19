// components/requests/RequestDetailModal.jsx
// Modal hiển thị chi tiết một request khi click vào card

import StatusBadge from "./StatusBadge";

export default function RequestDetailModal({ request, onClose }) {
  if (!request) return null;

  const sameDay = request.tripDateFrom === request.tripDateTo;
  const dateRange = sameDay
    ? request.tripDateFrom
    : `${request.tripDateFrom} → ${request.tripDateTo}`;

  const rows = [
    ["Description", request.description],
    ["Amount", `$${request.amount.toFixed(2)}`],
    ["Submitted", request.submittedDate],
    ["Trip Dates", dateRange],
    ["Category", request.category],
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 24,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "slideUp 0.2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                color: "#111827",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {request.id}
            </h2>
            <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: 13 }}>
              {request.category}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#F3F4F6",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 20,
              color: "#6B7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Detail rows */}
        {rows.map(([label, val]) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "12px 0",
              borderBottom: "1px solid #F3F4F6",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500, flexShrink: 0 }}>
              {label}
            </span>
            <span
              style={{
                fontSize: 13,
                color: "#111827",
                fontWeight: 600,
                textAlign: "right",
                wordBreak: "break-word",
              }}
            >
              {val}
            </span>
          </div>
        ))}

        {/* Status badge */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <StatusBadge status={request.status} />
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
