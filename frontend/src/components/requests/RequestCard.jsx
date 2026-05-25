import StatusBadge from "./StatusBadge";

function displayRequestId(id) {
  const value = String(id ?? "").replace(/^#/, "");
  return value.startsWith("REQ-") ? value : `REQ-${value.padStart(3, "0")}`;
}

function formatDate(value) {
  if (!value) return "-";

  const dateOnly = String(value).slice(0, 10);
  const [year, month, day] = dateOnly.split("-");

  if (year && month && day) {
    return `${Number(day)}/${Number(month)}/${year}`;
  }

  return value;
}

export default function RequestCard({ request, onClick }) {
  const sameDay = request.tripDateFrom === request.tripDateTo;
  const dateRange = sameDay
    ? request.tripDateFrom
    : `${request.tripDateFrom} to ${request.tripDateTo}`;
  const isFinanceRequest = Boolean(request.employeeName);
  const requestId = displayRequestId(request.id);
  const primaryMeta = isFinanceRequest ? request.employeeName : request.category;
  const detailLabel = isFinanceRequest
    ? `Category: ${request.category} | Trip Dates: ${dateRange}`
    : `Trip Dates: ${dateRange}`;
  const amount = Number(request.amount ?? 0);

  return (
    <article
      className="request-card"
      onClick={() => onClick?.(request)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(request);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="request-card-main">
        <div className="request-card-meta">
          <strong>{requestId}</strong>
          <span aria-hidden="true">•</span>
          <span>{primaryMeta}</span>
          <span aria-hidden="true">•</span>
          <span>{formatDate(request.submittedDate ?? request.submittedOn)}</span>
        </div>

        <div className="request-card-trip">{detailLabel}</div>
      </div>

      <div className="request-card-side">
        <strong className="request-card-amount">
          ${amount.toFixed(2)}
        </strong>
        <StatusBadge status={request.status} />
      </div>
    </article>
  );
}
