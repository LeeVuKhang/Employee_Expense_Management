import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  fetchManagerExpenseRequest,
  updateManagerExpenseRequestStatus,
} from "../api/expenses";
import Navbar from "../components/layouts/Navbar";

const PENDING_MANAGER_STATUS = "Pending Manager";
const APPROVED_FOR_FINANCE_STATUS = "Pending Finance";
const REJECTED_STATUS = "Rejected";

export default function ManagerRequestDetail() {
  const { requestId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeRequest = location.state?.request ?? null;

  const [request, setRequest] = useState(() =>
    routeRequest ? toManagerDetailViewModel(routeRequest) : null,
  );
  const [loading, setLoading] = useState(!routeRequest);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const fallbackRequest = routeRequest ? toManagerDetailViewModel(routeRequest) : null;

    async function loadRequest() {
      setLoading(!fallbackRequest);
      setLoadError(null);

      if (fallbackRequest) {
        setRequest(fallbackRequest);
      }

      try {
        const fetchedRequest = await fetchManagerExpenseRequest(requestId);
        if (isCurrent) {
          setRequest(toManagerDetailViewModel(fetchedRequest));
        }
      } catch (error) {
        if (!isCurrent) return;
        if (!fallbackRequest) {
          setLoadError(error.message);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    loadRequest();

    return () => {
      isCurrent = false;
    };
  }, [requestId, routeRequest]);

  async function updateStatus(status, rejectionReason = null) {
    setSubmitting(true);
    setActionError(null);

    try {
      const updatedRequest = await updateManagerExpenseRequestStatus(requestId, {
        status,
        rejectionReason,
      });
      setRequest(toManagerDetailViewModel(updatedRequest));
      return true;
    } catch (error) {
      setActionError(error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    await updateStatus(APPROVED_FOR_FINANCE_STATUS);
  }

  async function handleReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError("Reason is required.");
      return;
    }

    const updated = await updateStatus(REJECTED_STATUS, reason);
    if (updated) {
      setShowRejectModal(false);
      setRejectReason("");
      setRejectReasonError("");
    }
  }

  function openRejectModal() {
    setRejectReason("");
    setRejectReasonError("");
    setShowRejectModal(true);
  }

  return (
    <div className="app-shell">
      <Navbar activePage="Team Requests" />

      <main className="page-frame manager-detail-frame">
        {loading && (
          <div className="card dashboard-state" role="status">
            Loading request details...
          </div>
        )}

        {!loading && loadError && (
          <div className="card dashboard-state error-state" role="alert">
            <strong>Unable to load request details.</strong>
            <span>{loadError}</span>
            <button
              className="secondary-button"
              type="button"
              onClick={() => navigate("/manager/pending-requests")}
            >
              Back to Team Requests
            </button>
          </div>
        )}

        {!loading && !loadError && request && (
          <>
            <div className="detail-heading manager-detail-heading">
              <button
                className="back-button"
                type="button"
                onClick={() => navigate("/manager/pending-requests")}
              >
                ← Back
              </button>

              <div>
                <div className="title-line">
                  <h1>{request.id}</h1>
                </div>
                <p>
                  Submitted by <strong>{request.employeeName}</strong> on{" "}
                  {formatDate(request.submittedDate)}
                </p>
              </div>

              <span className="processor-pill">Current Processor: Manager</span>
            </div>

            <div className="detail-grid">
              <div className="detail-main">
                <section className="card">
                  <h2>Expense Details</h2>
                  <div className="details-grid">
                    <DetailField label="Category" value={request.category} />
                    <DetailField
                      label="Trip Dates"
                      value={`${formatDate(request.tripDateFrom)} to ${formatDate(request.tripDateTo)}`}
                    />
                    <DetailField label="Status" value={request.status} />
                    <DetailField
                      label="Total Amount"
                      value={formatCurrency(request.amount)}
                      isStrong
                    />
                  </div>
                </section>

                <section className="card">
                  <h2>Line Items</h2>
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
                        {request.lineItems.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No line items provided.</td>
                          </tr>
                        ) : (
                          request.lineItems.map((item) => (
                            <tr key={item.id}>
                              <td>{formatDate(item.date)}</td>
                              <td>{item.itemName}</td>
                              <td>{item.purpose}</td>
                              <td>{formatCurrency(item.amount)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}>Total</td>
                          <td>{formatCurrency(request.amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </section>

                <section className="card">
                  <h2>Attachments</h2>
                  {request.attachments.length === 0 ? (
                    <div className="attachment-box attachment-box-empty">
                      No attachments provided.
                    </div>
                  ) : (
                    <div className="attachment-box">
                      {request.attachments.map((attachment) => (
                        <a
                          className="attachment-chip"
                          key={attachment.id}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {attachment.name}
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="side-panel">
                <section className="card actions-card">
                  <h2>Actions</h2>
                  {actionError && (
                    <div className="readonly-state error-state" role="alert">
                      {actionError}
                    </div>
                  )}

                  <ManagerActions
                    isLocked={request.isLocked}
                    status={request.status}
                    submitting={submitting}
                    onApprove={handleApprove}
                    onReject={openRejectModal}
                  />
                </section>

                <section className="card timeline-card">
                  <h2>Timeline</h2>
                  <ol className="timeline">
                    <li>
                      <strong>Submitted</strong>
                      <span>{formatDate(request.submittedDate)}</span>
                    </li>
                  </ol>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>

      {showRejectModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="modal reject-reason-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-request-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="reject-request-title">Reject Request</h2>
            <p>Enter a reason before rejecting this request.</p>

            <label className="reject-reason-label">
              Reason
              <textarea
                className="reject-reason-textarea"
                value={rejectReason}
                onChange={(event) => {
                  setRejectReason(event.target.value);
                  if (rejectReasonError) setRejectReasonError("");
                }}
                placeholder="Enter rejection reason..."
              />
            </label>

            {rejectReasonError && (
              <p className="modal-error-text" role="alert">
                {rejectReasonError}
              </p>
            )}

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
              >
                {submitting ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerActions({ isLocked, status, submitting, onApprove, onReject }) {
  if (isLocked || status !== PENDING_MANAGER_STATUS) {
    return (
      <div className="readonly-state">
        <strong>No manager action available.</strong>
        <span>This request is currently {status}.</span>
      </div>
    );
  }

  return (
    <>
      <button
        className="approve-button"
        type="button"
        onClick={onApprove}
        disabled={submitting}
      >
        {submitting ? "Approving..." : "Approve Request"}
      </button>
      <button
        className="danger-button"
        type="button"
        onClick={onReject}
        disabled={submitting}
      >
        Reject Request
      </button>
    </>
  );
}

function DetailField({ label, value, isStrong = false }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <strong className={isStrong ? "amount-value" : undefined}>{value}</strong>
    </div>
  );
}

function toManagerDetailViewModel(request) {
  const lineItems = (request.lineItems ?? request.line_items ?? []).map((item, index) => ({
    id: String(item.id ?? index),
    date: item.date ?? item.expense_date,
    itemName: item.itemName ?? item.item_service_name ?? "Expense item",
    purpose: item.purpose ?? item.purpose_note ?? "-",
    amount: Number(item.amount ?? 0),
  }));

  return {
    id: formatRequestId(request.id),
    employeeName:
      request.employeeName ??
      request.employee ??
      request.employee_name ??
      `Employee #${request.employeeId ?? request.employee_id ?? "Unknown"}`,
    category:
      request.category ??
      request.requestType ??
      request.category_name ??
      `Category #${request.categoryId ?? request.category_id ?? "Unknown"}`,
    submittedDate:
      request.submittedDate ??
      request.submittedOn ??
      request.createdDate ??
      request.created_at,
    amount: Number(request.amount ?? request.total_amount ?? 0),
    status: request.status,
    tripDateFrom:
      request.tripDateFrom ??
      request.tripStart ??
      request.startDate ??
      request.start_date,
    tripDateTo:
      request.tripDateTo ??
      request.tripEnd ??
      request.endDate ??
      request.end_date,
    isLocked: Boolean(request.isLocked ?? request.is_locked),
    lineItems,
    attachments: request.attachments ?? [],
  };
}

function formatRequestId(id) {
  const rawId = String(id ?? "").trim();
  if (!rawId) return "REQ-000";
  if (/^REQ-/i.test(rawId)) return rawId.toUpperCase();

  return `REQ-${rawId.replace(/^#/, "").padStart(3, "0")}`;
}

function formatCurrency(value, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(value ?? 0));
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value ?? 0));
  }
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB").format(date);
}
