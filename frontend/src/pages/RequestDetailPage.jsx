import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/layouts/Navbar";

const APPROVED_STATUS = "Finance Approved";
const FINAL_STATUSES = new Set([APPROVED_STATUS, "Paid", "Rejected", "Cancelled"]);

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadRequest() {
      const apiBase = import.meta.env.VITE_API_URL || "";
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`${apiBase}/api/finance/requests/${id}`, {
          headers: {
            "X-User-Id": "2",
          },
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`Unable to load request details (${response.status}): ${message}`);
        }

        const fetchedData = await response.json();
        if (isCurrent) {
          setRequest(toRequestViewModel(fetchedData));
        }
      } catch (error) {
        if (isCurrent) {
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
  }, [id]);

  async function updateRequestStatus(status, rejectionReason = null) {
    setSubmitting(true);
    setActionError(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || "";
      const response = await fetch(`${apiBase}/api/finance/requests/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "2",
        },
        body: JSON.stringify({ status, rejection_reason: rejectionReason }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to update request status.");
      }

      const updated = await response.json();
      setRequest((previous) => ({
        ...previous,
        status: updated.status ?? status,
        rejectionReason: updated.rejection_reason ?? rejectionReason ?? previous.rejectionReason,
        isLocked: Boolean(updated.is_locked ?? previous.isLocked),
        updatedDate: updated.updated_at ?? previous.updatedDate,
      }));

      return true;
    } catch (error) {
      setActionError(error.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    await updateRequestStatus(APPROVED_STATUS);
  }

  async function handleReject() {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError("Rejection reason is required.");
      return;
    }

    const updated = await updateRequestStatus("Rejected", reason);
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
      <Navbar activePage="Manager Pending" role="Manager" />

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
                Back
              </button>

              <div>
                <div className="title-line">
                  <h1>{request.id}</h1>
                  {request.isLocked && <span className="locked-badge">Locked</span>}
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

                  {FINAL_STATUSES.has(request.status) ? (
                    <div className="readonly-state">
                      <strong>No manager action available.</strong>
                      <span>This request is currently {request.status}.</span>
                    </div>
                  ) : (
                    <>
                      <button
                        className="primary-button manager-action-approve"
                        type="button"
                        onClick={handleApprove}
                        disabled={submitting}
                      >
                        {submitting ? "Approving..." : "Approve Request"}
                      </button>
                      <button
                        className="danger-button manager-action-reject"
                        type="button"
                        onClick={openRejectModal}
                        disabled={submitting}
                      >
                        Reject Request
                      </button>
                    </>
                  )}
                </section>

                <section className="card timeline-card">
                  <h2>Timeline</h2>
                  <ol className="timeline">
                    {getTimelineEvents(request).map((event) => (
                      <li key={`${event.title}-${event.date}`}>
                        <strong>{event.title}</strong>
                        <span>{event.date}</span>
                      </li>
                    ))}
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
            <p>Enter a rejection reason before sending this request back.</p>

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

function DetailField({ label, value, isStrong = false }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <strong className={isStrong ? "amount-value" : undefined}>{value}</strong>
    </div>
  );
}

function toRequestViewModel(request) {
  const lineItems = (request.line_items ?? []).map((item) => ({
    id: String(item.id),
    date: item.expense_date,
    itemName: item.item_service_name,
    purpose: item.purpose_note,
    amount: Number(item.amount ?? 0),
    fileUrl: item.file_url,
    fileName: item.file_name,
  }));
  const lineItemAttachments = lineItems
    .filter((item) => item.fileUrl)
    .map((item) => ({
      id: `line-item-${item.id}`,
      name: item.fileName || `Receipt for ${item.itemName}`,
      url: item.fileUrl,
    }));
  const attachments = [
    ...(request.attachments ?? []).map((attachment) => ({
      id: String(attachment.id),
      name: attachment.file_name ?? attachment.name ?? "Attachment",
      url: attachment.file_url ?? attachment.url,
    })),
    ...lineItemAttachments,
  ].filter((attachment) => attachment.url);

  return {
    id: formatRequestId(request.id),
    employeeName: request.employee_name ?? `Employee #${request.employee_id ?? "Unknown"}`,
    category: request.category_name ?? `Category #${request.category_id ?? "Unknown"}`,
    submittedDate: request.created_at,
    updatedDate: request.updated_at,
    amount: Number(request.total_amount ?? 0),
    status: request.status,
    tripDateFrom: request.start_date,
    tripDateTo: request.end_date,
    rejectionReason: request.rejection_reason,
    isLocked: Boolean(request.is_locked),
    lineItems,
    attachments,
  };
}

function getTimelineEvents(request) {
  const events = [
    {
      title: "Submitted",
      date: formatDate(request.submittedDate),
    },
    {
      title: "Manager Review",
      date:
        request.status === "Pending Manager"
          ? "Pending"
          : formatDate(request.updatedDate || request.submittedDate),
    },
  ];

  if (request.rejectionReason) {
    events.push({
      title: "Rejected",
      date: request.rejectionReason,
    });
  }

  return events;
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
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
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
