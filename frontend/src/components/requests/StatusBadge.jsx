import { STATUS_CONFIG } from "../../data/mockRequests";

const STATUS_COLORS = {
  "Draft": { bg: "#dbeafe", color: "#1e40af" },
  "Pending Manager": { bg: "#fef3c7", color: "#92400e" },
  "Pending Finance": { bg: "#fef3c7", color: "#92400e" },
  "Finance Approved": { bg: "#d1fae5", color: "#065f46" },
  "Paid": { bg: "#d1fae5", color: "#065f46" },
  "Rejected": { bg: "#fee2e2", color: "#991b1b" },
  "Cancelled": { bg: "#f1f5f9", color: "#334155" },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status };
  const colors = STATUS_COLORS[status] ?? { bg: "#f1f5f9", color: "#334155" };

  return (
    <div className="status-badge-wrap">
      <span
        className="status-badge"
        style={{
          color: colors.color,
          backgroundColor: colors.bg,
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
