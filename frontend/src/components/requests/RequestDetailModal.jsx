import RequestActions from "./RequestActions";
import StatusBadge from "./StatusBadge";

export default function RequestDetailModal({
  request,
  onCancelRequest,
  onClose,
  onDuplicate,
  onEdit,
}) {
  if (!request) return null;

  const tripStart = request.tripDateFrom ?? request.tripStart;
  const tripEnd = request.tripDateTo ?? request.tripEnd;
  const sameDay = tripStart === tripEnd;
  const dateRange = sameDay ? tripStart : `${tripStart} -> ${tripEnd}`;
  const amount = Number(request.amount ?? 0);

  const rows = [
    ["Description", request.description],
    ["Amount", `$${amount.toFixed(2)}`],
    ["Submitted", request.submittedDate ?? request.submittedOn],
    ["Trip Dates", dateRange],
    ["Category", request.category],
    ["Processor", request.processor],
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
          maxHeight: "calc(100vh - 48px)",
          maxWidth: 560,
          overflowY: "auto",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          animation: "slideUp 0.2s ease",
        }}
      >
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
              #{request.id}
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
            x
          </button>
        </div>

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
              {val || "-"}
            </span>
          </div>
        ))}

        {request.lineItems?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 14, color: "#111827" }}>
              Line Items
            </h3>
            <div style={{ display: "grid", gap: 8 }}>
              {request.lineItems.map((lineItem) => (
                <div
                  key={lineItem.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    padding: 12,
                    border: "1px solid #E5E7EB",
                    borderRadius: 8,
                    background: "#F9FAFB",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#111827", fontSize: 13, fontWeight: 700 }}>
                      {lineItem.itemName}
                    </div>
                    <div style={{ color: "#6B7280", fontSize: 12 }}>
                      {lineItem.date} - {lineItem.purpose}
                    </div>
                  </div>
                  <strong style={{ color: "#111827", fontSize: 13 }}>
                    ${Number(lineItem.amount ?? 0).toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <StatusBadge status={request.status} />
        </div>

        <div style={{ marginTop: 20 }}>
          <RequestActions
            request={request}
            onCancel={onCancelRequest}
            onDuplicate={onDuplicate}
            onEdit={onEdit}
          />
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
