import { useEffect, useMemo, useState } from "react";
import {
  cancelExpenseRequest,
  duplicateExpenseRequest,
  fetchExpenseRequest,
} from "../api/expenses";
import CancelRequestModal from "../components/requests/CancelRequestModal";
import RequestActions from "../components/requests/RequestActions";

const EDITABLE_STATUSES = new Set(["Draft", "Pending Manager"]);

function canManageRequest(request) {
  return EDITABLE_STATUSES.has(request.status) && !request.isLocked;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function formatRequestId(requestId) {
  return `REQ-${String(requestId).padStart(3, "0")}`;
}

function formatDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return `${Number(day)}/${Number(month)}/${year}`;
}

function FieldValue({ label, value }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LineItemsTable({ lineItems, total }) {
  return (
    <div className="table-scroll">
      <table className="line-items-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item Name</th>
            <th>Purpose</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((lineItem) => (
            <tr key={lineItem.id}>
              <td>{lineItem.date}</td>
              <td>{lineItem.itemName}</td>
              <td>{lineItem.purpose}</td>
              <td>{formatCurrency(lineItem.amount)}</td>
            </tr>
          ))}
          <tr className="total-row">
            <td colSpan="2" />
            <td>Total</td>
            <td>{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ExpenseRequestDetail({
  initialRequest,
  onNavigate,
  requestId,
}) {
  const [request, setRequest] = useState(initialRequest ?? null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(!initialRequest);
  const [error, setError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadRequest() {
      if (!requestId || initialRequest) return;

      setLoading(true);
      setError(null);

      try {
        const nextRequest = await fetchExpenseRequest(requestId);
        if (!ignore) setRequest(nextRequest);
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadRequest();

    return () => { ignore = true; };
  }, [initialRequest, requestId]);

  const total = useMemo(
    () => request?.lineItems.reduce((sum, lineItem) => sum + Number(lineItem.amount || 0), 0) ?? 0,
    [request],
  );

  function showNotice(type, message) {
    setNotice({ type, message });
  }

  function handleEdit(nextRequest) {
    if (!canManageRequest(nextRequest)) {
      showNotice("error", "This request can no longer be edited.");
      return;
    }

    onNavigate?.("New Request", { mode: "edit", request: nextRequest });
  }

  async function handleDuplicate(nextRequest) {
    setActionBusy(true);
    setNotice(null);

    try {
      const duplicatedRequest = await duplicateExpenseRequest(nextRequest.id);
      showNotice("success", `Request ${formatRequestId(nextRequest.id)} was duplicated.`);
      onNavigate?.("Request Detail", { request: duplicatedRequest });
    } catch (err) {
      showNotice("error", err.message);
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmCancelRequest() {
    if (!cancelTarget) return;

    setActionBusy(true);
    setNotice(null);

    try {
      const cancelledRequest = await cancelExpenseRequest(cancelTarget.id);
      setRequest(cancelledRequest);
      showNotice("success", `Request ${formatRequestId(cancelTarget.id)} was cancelled.`);
    } catch (err) {
      showNotice("error", err.message);
    } finally {
      setCancelTarget(null);
      setActionBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <main className="page-frame request-detail-frame">
        {notice && (
          <div className={`toast toast-${notice.type}`} role="status">
            {notice.message}
          </div>
        )}

        {loading && (
          <div className="card feedback-card" role="status">
            Loading expense request...
          </div>
        )}

        {!loading && error && (
          <div className="card feedback-card error-state" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && request && (
          <section className="detail-grid">
            <div className="detail-main">
              <div className="detail-heading">
                <button
                  className="back-button"
                  type="button"
                  onClick={() => onNavigate?.("My Requests")}
                >
                  Back
                </button>

                <div>
                  <h1>{formatRequestId(request.id)}</h1>
                  <p>
                    Submitted by {request.employee} on {formatDate(request.submittedOn)}
                  </p>
                </div>

                <span className="processor-pill">
                  Current Processor: {request.processor}
                </span>
              </div>

              <div className="card">
                <h2>Expense Details</h2>
                <div className="details-grid">
                  <FieldValue label="Category" value={request.category} />
                  <FieldValue
                    label="Trip Dates"
                    value={`${request.tripStart} to ${request.tripEnd}`}
                  />
                  <FieldValue label="Status" value={request.status} />
                  <FieldValue label="Total Amount" value={formatCurrency(total)} />
                </div>
              </div>

              <div className="card">
                <h2>Line Items</h2>
                <LineItemsTable lineItems={request.lineItems} total={total} />
              </div>

              <div className="card">
                <h2>Attachments</h2>
                <p className="muted">Receipts and invoices for this request.</p>
                <div className="attachment-box">
                  {request.attachments.length ? (
                    request.attachments.map((attachment) => (
                      <span className="attachment-chip" key={attachment.id ?? attachment.fileName}>
                        {attachment.fileName}
                      </span>
                    ))
                  ) : (
                    <em>No attachments provided.</em>
                  )}
                </div>
              </div>
            </div>

            <aside className="side-panel">
              <RequestActions
                request={request}
                onCancel={(nextRequest) => setCancelTarget(nextRequest)}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
              />

              <div className="card timeline-card">
                <h2>Timeline</h2>
                <ol className="timeline">
                  {request.timeline.map((item) => (
                    <li key={`${item.label}-${item.date}`}>
                      <strong>{item.label}</strong>
                      <span>{formatDate(item.date)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </section>
        )}
      </main>

      {cancelTarget && (
        <CancelRequestModal
          onClose={() => !actionBusy && setCancelTarget(null)}
          onConfirm={confirmCancelRequest}
        />
      )}
    </div>
  );
}
