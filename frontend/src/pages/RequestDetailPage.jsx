import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function Card({ children, title, subtitle }) {
  return (
    <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {title && <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 4px 0", letterSpacing: "-0.3px" }}>{title}</h2>}
      {subtitle && <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px 0" }}>{subtitle}</p>}
      {!subtitle && title && <div style={{ marginBottom: 20 }} />}
      {children}
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "";
    fetch(`${apiBase}/api/finance/requests/${id}`, {
      headers: {
        "X-User-Id": "2" // Finance Manager User ID
      }
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Không thể tải thông tin chi tiết yêu cầu thanh toán (${res.status}): ${text}`);
        }
        return res.json();
      })
      .then(fetchedData => {
        // Map backend fields to frontend model
        setRequest({
          id: `#${fetchedData.id}`,
          employeeName: fetchedData.employee_name,
          category: fetchedData.category_name,
          submittedDate: fetchedData.created_at,
          amount: parseFloat(fetchedData.total_amount),
          status: fetchedData.status,
          tripDateFrom: fetchedData.start_date,
          tripDateTo: fetchedData.end_date,
          line_items: fetchedData.line_items || []
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ color: "#6B7280", fontSize: 16 }}>Đang tải thông tin chi tiết...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: "'Inter', sans-serif", gap: 16 }}>
        <div style={{ color: "#DC2626", fontSize: 16 }}>Lỗi: {error}</div>
        <button
          onClick={() => navigate("/finance")}
          style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF", cursor: "pointer", fontSize: 14 }}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", fontFamily: "'Inter', sans-serif" }}>
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <button
              onClick={() => navigate("/finance")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 8px", marginTop: 4, color: "#374151" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.5px" }}>{request.id}</h1>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", backgroundColor: "#F3F4F6", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#6B7280" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Locked
                </span>
              </div>
              <p style={{ fontSize: 15, color: "#6B7280", margin: 0 }}>
                Submitted by <span style={{ fontWeight: 600 }}>{request.employeeName}</span> on {new Date(request.submittedDate).toLocaleDateString("en-US")}
              </p>
            </div>
          </div>

          <div style={{ display: "inline-flex", padding: "6px 12px", backgroundColor: "#F3F4F6", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#374151" }}>
            Current Processor: Finance
          </div>
        </div>

        {/* Grid Content */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {/* Left Column */}
          <div style={{ flex: "2 1 600px", display: "flex", flexDirection: "column" }}>
            <Card title="Expense Details">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 24, columnGap: 24 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}>Category</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{request.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}>Trip Dates</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{request.tripDateFrom} to {request.tripDateTo}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{request.status}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 4 }}>Total Amount</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>${request.amount.toFixed(2)}</div>
                </div>
              </div>
            </Card>

            <Card title="Line Items">
              <div style={{ width: "100%", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: "#6B7280", borderBottom: "1px solid #F3F4F6", backgroundColor: "#F9FAFB" }}>
                      <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12 }}>DATE</th>
                      <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12 }}>ITEM NAME</th>
                      <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12 }}>PURPOSE</th>
                      <th style={{ padding: "12px 16px", fontWeight: 600, fontSize: 12, textAlign: "right" }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.line_items.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "#6B7280" }}>Không có chi tiết mặt hàng nào.</td>
                      </tr>
                    ) : (
                      request.line_items.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: "1px solid #F3F4F6" }}>
                          <td style={{ padding: "16px", color: "#374151" }}>{item.expense_date}</td>
                          <td style={{ padding: "16px", color: "#111827", fontWeight: 500 }}>{item.item_service_name}</td>
                          <td style={{ padding: "16px", color: "#6B7280" }}>{item.purpose_note}</td>
                          <td style={{ padding: "16px", color: "#111827", fontWeight: 600, textAlign: "right" }}>${parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                    <tr style={{ backgroundColor: "#FAFAFA" }}>
                      <td colSpan={3} style={{ padding: "16px", fontWeight: 700, color: "#111827", textAlign: "center" }}>Total</td>
                      <td style={{ padding: "16px", fontWeight: 800, color: "#111827", textAlign: "right" }}>${request.amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Attachments" subtitle="Receipts and invoices for this request.">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {request.line_items && request.line_items.length > 0 ? (
                  request.line_items.map((item) => (
                    item.file_url ? (
                      <a
                        key={item.id}
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "12px",
                          backgroundColor: "#F9FAFB",
                          borderRadius: 8,
                          border: "1px solid #E5E7EB",
                          textDecoration: "none",
                          color: "#2563EB",
                          fontWeight: 500,
                          fontSize: 14,
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#EFF6FF";
                          e.currentTarget.style.borderColor = "#93C5FD";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#F9FAFB";
                          e.currentTarget.style.borderColor = "#E5E7EB";
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        </svg>
                        {item.file_name || "Download Receipt"}
                      </a>
                    ) : null
                  ))
                ) : (
                  <div style={{ border: "1px dashed #E5E7EB", borderRadius: 8, padding: "32px", textAlign: "center", color: "#6B7280", fontSize: 14, fontStyle: "italic" }}>
                    No attachments provided.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column" }}>
            <Card title="Actions">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {request.status !== "Finance Approved" && (
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      setError(null);
                      try {
                        const apiBase = import.meta.env.VITE_API_URL || "";
                        const res = await fetch(`${apiBase}/api/finance/requests/${id}/status`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            "X-User-Id": "2"
                          },
                          body: JSON.stringify({ status: "Finance Approved", rejection_reason: null })
                        });
                        if (!res.ok) {
                          const errData = await res.json();
                          throw new Error(errData.detail || "Failed to approve request");
                        }
                        const updated = await res.json();
                        setRequest(prev => ({ ...prev, status: updated.status }));
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 8, border: "none", cursor: submitting ? "not-allowed" : "pointer",
                      backgroundColor: "#10B981", color: "#FFFFFF", fontSize: 15, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: submitting ? 0.6 : 1
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Finance Approve
                  </button>
                )}
                {request.status === "Finance Approved" && (
                  <button
                    onClick={async () => {
                      setSubmitting(true);
                      setError(null);
                      try {
                        const apiBase = import.meta.env.VITE_API_URL || "";
                        const res = await fetch(`${apiBase}/api/finance/requests/${id}/status`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            "X-User-Id": "2"
                          },
                          body: JSON.stringify({ status: "Paid", rejection_reason: null })
                        });
                        if (!res.ok) {
                          const errData = await res.json();
                          throw new Error(errData.detail || "Failed to mark request as paid");
                        }
                        const updated = await res.json();
                        setRequest(prev => ({ ...prev, status: updated.status }));
                      } catch (err) {
                        setError(err.message);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    disabled={submitting}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 8, border: "none", cursor: submitting ? "not-allowed" : "pointer",
                      backgroundColor: "#2563EB", color: "#FFFFFF", fontSize: 15, fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: submitting ? 0.6 : 1
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Mark as Paid
                  </button>
                )}
                <button
                  onClick={() => setShowDeclineModal(true)}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 8, border: "none", cursor: "pointer",
                    backgroundColor: "#EF4444", color: "#FFFFFF", fontSize: 15, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  Decline Request
                </button>
              </div>
            </Card>

            <Card title="Timeline">
              <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
                {/* Vertical line connecting timeline items */}
                <div style={{ position: "absolute", left: 7, top: 8, bottom: 8, width: 2, backgroundColor: "#E5E7EB", zIndex: 0 }}></div>

                <div style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#3B82F6", border: "4px solid #FFFFFF", flexShrink: 0, marginTop: 2 }}></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Submitted</div>
                    <div style={{ fontSize: 13, color: "#6B7280" }}>{new Date(request.submittedDate).toLocaleDateString("en-US")}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#3B82F6", border: "4px solid #FFFFFF", flexShrink: 0, marginTop: 2 }}></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Manager Review</div>
                    <div style={{ fontSize: 13, color: "#6B7280" }}>Approved</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {showDeclineModal && (
        <div
          onClick={() => setShowDeclineModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
            padding: 24,
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
            }}
          >
            <h2 style={{ margin: "0 0 12px 0", fontSize: 20, fontWeight: 800, color: "#111827" }}>
              Decline Request
            </h2>
            <p style={{ margin: "0 0 24px 0", fontSize: 14, color: "#6B7280" }}>
              Please provide a reason for declining this expense request.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "1px solid #E5E7EB",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
                minHeight: 100,
                marginBottom: 24,
              }}
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason("");
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!declineReason.trim()) {
                    setError("Rejection reason is required.");
                    return;
                  }
                  setSubmitting(true);
                  setError(null);
                  try {
                    const apiBase = import.meta.env.VITE_API_URL || "";
                    const res = await fetch(`${apiBase}/api/finance/requests/${id}/status`, {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        "X-User-Id": "2"
                      },
                      body: JSON.stringify({ status: "Rejected", rejection_reason: declineReason })
                    });
                    if (!res.ok) {
                      const errData = await res.json();
                      throw new Error(errData.detail || "Failed to decline request");
                    }
                    const updated = await res.json();
                    setRequest(prev => ({ ...prev, status: updated.status, rejection_reason: updated.rejection_reason }));
                    setShowDeclineModal(false);
                    setDeclineReason("");
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting || !declineReason.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "#EF4444",
                  color: "#FFFFFF",
                  cursor: declineReason.trim() && !submitting ? "pointer" : "not-allowed",
                  fontSize: 14,
                  fontWeight: 600,
                  opacity: declineReason.trim() && !submitting ? 1 : 0.6,
                }}
              >
                {submitting ? "Declining..." : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
