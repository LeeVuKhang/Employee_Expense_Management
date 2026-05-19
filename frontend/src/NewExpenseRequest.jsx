import { useState, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME = ["image/svg+xml", "image/png", "image/jpeg", "application/pdf"];
const CATEGORIES = ["Travel", "Meals", "Accommodation", "Equipment", "Software", "Marketing", "Other"];
const today = () => new Date().toISOString().split("T")[0];

// ─── Toast System ─────────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px", borderRadius: 10, minWidth: 280, maxWidth: 380,
          background: t.type === "success" ? "#f0fdf4" : t.type === "error" ? "#fef2f2" : "#eff6ff",
          border: `1.5px solid ${t.type === "success" ? "#86efac" : t.type === "error" ? "#fca5a5" : "#93c5fd"}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          animation: "slideIn 0.25s ease",
        }}>
          <span style={{ fontSize: 18 }}>
            {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
          </span>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: "#1a202c" }}>{t.message}</span>
          <button onClick={() => remove(t.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16 }}>✕</button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
};
const baseInput = {
  width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0",
  borderRadius: "8px", fontSize: "14px", color: "#1a202c", background: "#fff",
  outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
};
const errInput = { ...baseInput, border: "1.5px solid #f87171", background: "#fff5f5" };
const errText = { fontSize: 12, color: "#ef4444", marginTop: 4, display: "block" };
const cardStyle = {
  background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0",
  padding: "28px", marginBottom: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};
const sectionTitle = { margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#0f172a" };
const sectionSubtitle = { margin: "0 0 20px", fontSize: "13px", color: "#64748b" };

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ dark }) {
  return (
    <>
      <span style={{
        display: "inline-block", width: 14, height: 14,
        border: `2px solid ${dark ? "#cbd5e1" : "rgba(255,255,255,0.4)"}`,
        borderTopColor: dark ? "#374151" : "#fff",
        borderRadius: "50%", animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}

// ─── LineItem ─────────────────────────────────────────────────────────────────
function LineItem({ item, index, onChange, onRemove, showRemove, errors }) {
  const e = errors || {};
  return (
    <div style={{ background: "#f8f9fc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", marginBottom: "12px" }}>
      <div style={{ fontWeight: 600, color: "#1a202c", marginBottom: "14px", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Item {index + 1}</span>
        {showRemove && (
          <button onClick={onRemove}
            style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
            Remove
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginBottom: "12px" }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" max={today()} value={item.date}
            onChange={ev => onChange(index, "date", ev.target.value)}
            style={e.date ? errInput : baseInput} />
          {e.date && <span style={errText}>{e.date}</span>}
        </div>
        <div>
          <label style={labelStyle}>Item / Service Name</label>
          <input type="text" placeholder="e.g. Flight to NYC" value={item.name}
            onChange={ev => onChange(index, "name", ev.target.value)}
            style={e.name ? errInput : baseInput} />
          {e.name && <span style={errText}>{e.name}</span>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
        <div>
          <label style={labelStyle}>Amount ($)</label>
          <input type="number" min="0.01" step="0.01" placeholder="0.00" value={item.amount}
            onChange={ev => onChange(index, "amount", ev.target.value)}
            style={e.amount ? errInput : baseInput} />
          {e.amount && <span style={errText}>{e.amount}</span>}
        </div>
        <div>
          <label style={labelStyle}>Purpose / Note</label>
          <input type="text" placeholder="Reason for this expense" value={item.note}
            onChange={ev => onChange(index, "note", ev.target.value)}
            style={baseInput} />
        </div>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ category, totalAmount, isDraft, onReset }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        background: "#fff", borderRadius: "16px", padding: "60px 48px",
        textAlign: "center", boxShadow: "0 4px 32px rgba(0,0,0,0.10)", maxWidth: 420, width: "90%",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{isDraft ? "📝" : "✅"}</div>
        <h2 style={{ color: "#1a202c", fontWeight: 700, fontSize: 24, margin: "0 0 8px" }}>
          {isDraft ? "Draft Saved!" : "Request Submitted!"}
        </h2>
        <p style={{ color: "#64748b", fontSize: 15, marginBottom: 28 }}>
          {isDraft ? "Your draft has been saved. You can continue editing later." : "Your expense request has been sent for approval."}
        </p>
        <div style={{ background: "#f0f4f8", borderRadius: 10, padding: "16px 20px", textAlign: "left", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>Category</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#1a202c" }}>{category}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>Total Amount</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#2563eb" }}>${totalAmount.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b", fontSize: 14 }}>Status</span>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
              background: isDraft ? "#fef9c3" : "#dcfce7",
              color: isDraft ? "#854d0e" : "#166534",
            }}>
              {isDraft ? "DRAFT" : "PENDING MANAGER"}
            </span>
          </div>
        </div>
        <button onClick={onReset} style={{
          background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px",
          padding: "12px 32px", fontSize: "15px", fontWeight: 600, cursor: "pointer", width: "100%",
        }}>
          New Request
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NewExpenseRequest() {
  const { toasts, add: addToast, remove: removeToast } = useToast();

  // Form state
  const [category, setCategory] = useState("Travel");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [items, setItems] = useState([{ date: "", name: "", amount: "", note: "" }]);
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);

  // UI state
  const [formErrors, setFormErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  // Reactive total amount (FE-3)
  const totalAmount = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

  // ── Validation (FE-3) ─────────────────────────────────────────────────────
  function validate() {
    const formErrs = {};

    if (!startDate) {
      formErrs.startDate = "Start date is required.";
    } else if (startDate > today()) {
      formErrs.startDate = "Start date cannot be in the future.";
    }

    if (!endDate) {
      formErrs.endDate = "End date is required.";
    } else if (endDate > today()) {
      formErrs.endDate = "End date cannot be in the future.";
    } else if (startDate && endDate < startDate) {
      formErrs.endDate = "End date must be ≥ start date.";
    }

    const iErrs = items.map(it => {
      const e = {};
      if (!it.date) e.date = "Required.";
      else if (it.date > today()) e.date = "Cannot be in the future.";
      if (!it.name.trim()) e.name = "Required.";
      if (!it.amount || parseFloat(it.amount) <= 0) e.amount = "Must be > 0.";
      return e;
    });

    return { formErrs, iErrs, hasErrors: Object.keys(formErrs).length > 0 || iErrs.some(e => Object.keys(e).length > 0) };
  }

  // ── Item handlers (FE-2) ──────────────────────────────────────────────────
  const handleItemChange = (index, field, value) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
    setItemErrors(prev => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], [field]: undefined };
      return next;
    });
  };

  const addItem = () => setItems(prev => [...prev, { date: "", name: "", amount: "", note: "" }]);

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setItemErrors(prev => prev.filter((_, i) => i !== index));
  };

  // ── File handlers (FE-4) ──────────────────────────────────────────────────
  function processFiles(newFiles) {
    const errs = [];
    const valid = [];
    newFiles.forEach(file => {
      if (!ALLOWED_MIME.includes(file.type)) {
        errs.push(`"${file.name}": invalid file type.`);
      } else if (file.size > MAX_FILE_SIZE_BYTES) {
        errs.push(`"${file.name}": exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      } else {
        valid.push(file);
      }
    });
    setFileErrors(errs);
    if (errs.length > 0) errs.forEach(e => addToast(e, "error"));
    setAttachments(prev => {
      const slots = MAX_FILES - prev.length;
      return [...prev, ...valid.slice(0, slots)];
    });
  }

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (attachments.length >= MAX_FILES) return;
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e) => {
    processFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  // ── Submit handler (FE-5) ─────────────────────────────────────────────────
  async function handleSubmit(draft) {
    const { formErrs, iErrs, hasErrors } = validate();
    setFormErrors(formErrs);
    setItemErrors(iErrs);

    if (hasErrors) {
      addToast("Please fix the errors before submitting.", "error");
      return;
    }

    draft ? setLoadingDraft(true) : setLoading(true);
    setIsDraft(draft);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("totalAmount", totalAmount.toFixed(2));
      formData.append("isDraft", String(draft));
      formData.append("lineItems", JSON.stringify(items));
      attachments.forEach(file => formData.append("attachments", file));

      const res = await fetch("/api/expenses", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server error (${res.status}). Please try again.`);
      }

      addToast(draft ? "Draft saved successfully!" : "Request submitted for approval!", "success");
      setTimeout(() => setSubmitted(true), 800);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
      setLoadingDraft(false);
    }
  }

  function handleReset() {
    setSubmitted(false);
    setCategory("Travel");
    setStartDate(""); setEndDate("");
    setItems([{ date: "", name: "", amount: "", note: "" }]);
    setAttachments([]); setFileErrors([]);
    setFormErrors({}); setItemErrors([]);
    setIsDraft(false);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return <SuccessScreen category={category} totalAmount={totalAmount} isDraft={isDraft} onReset={handleReset} />;
  }

  const isAnyLoading = loading || loadingDraft;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Segoe UI', sans-serif" }}>
      <Toast toasts={toasts} remove={removeToast} />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", padding: "18px 0" }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", marginRight: 16, fontSize: 20, lineHeight: 1, padding: 4 }}>←</button>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#0f172a" }}>New Expense Request</h1>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", marginTop: 2 }}>Fill out the details below to submit a reimbursement.</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px", display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px", alignItems: "start" }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* Basic Details — FE-1 */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Basic Details</h2>
            <p style={sectionSubtitle}>Select the category and date range for this expense.</p>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Expense Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{
                  ...baseInput, appearance: "none",
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23374151' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 40,
                }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" max={today()} value={startDate}
                  onChange={e => { setStartDate(e.target.value); setFormErrors(p => ({ ...p, startDate: undefined })); }}
                  style={formErrors.startDate ? errInput : baseInput} />
                {formErrors.startDate && <span style={errText}>{formErrors.startDate}</span>}
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" max={today()} min={startDate || undefined} value={endDate}
                  onChange={e => { setEndDate(e.target.value); setFormErrors(p => ({ ...p, endDate: undefined })); }}
                  style={formErrors.endDate ? errInput : baseInput} />
                {formErrors.endDate && <span style={errText}>{formErrors.endDate}</span>}
              </div>
            </div>
          </div>

          {/* Line Items — FE-2 */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Line Items</h2>
            <p style={sectionSubtitle}>Itemize your expenses below.</p>

            {items.map((item, i) => (
              <LineItem key={i} item={item} index={i}
                onChange={handleItemChange}
                onRemove={() => removeItem(i)}
                showRemove={items.length > 1}
                errors={itemErrors[i]}
              />
            ))}

            <button onClick={addItem}
              style={{ width: "100%", border: "1.5px dashed #cbd5e1", background: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: 600, color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span style={{ fontSize: 18 }}>+</span> Add Another Item
            </button>
          </div>

          {/* Attachments — FE-4 */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Attachments</h2>
            <p style={sectionSubtitle}>Upload up to {MAX_FILES} receipts or invoices (Max {MAX_FILE_SIZE_MB}MB each).</p>

            {/* Drop zone — disabled when full */}
            <div
              onDrop={handleFileDrop}
              onDragOver={e => { e.preventDefault(); if (attachments.length < MAX_FILES) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => attachments.length < MAX_FILES && document.getElementById("file-input").click()}
              style={{
                border: `2px dashed ${attachments.length >= MAX_FILES ? "#e2e8f0" : dragOver ? "#2563eb" : "#cbd5e1"}`,
                borderRadius: "12px", padding: "40px 20px", textAlign: "center",
                cursor: attachments.length >= MAX_FILES ? "not-allowed" : "pointer",
                background: attachments.length >= MAX_FILES ? "#f8f9fc" : dragOver ? "#eff6ff" : "#fafbfc",
                transition: "all 0.2s", marginBottom: 16,
                opacity: attachments.length >= MAX_FILES ? 0.6 : 1,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10, color: "#94a3b8" }}>☁️</div>
              {attachments.length >= MAX_FILES
                ? <div style={{ fontWeight: 600, color: "#94a3b8", fontSize: 14 }}>Maximum {MAX_FILES} files reached</div>
                : <>
                  <div style={{ fontWeight: 600, color: "#374151", fontSize: 14 }}>Click to upload or drag and drop</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>SVG, PNG, JPG or PDF — max {MAX_FILE_SIZE_MB}MB each</div>
                </>
              }
              <input id="file-input" type="file" multiple accept=".svg,.png,.jpg,.jpeg,.pdf" hidden onChange={handleFileInput} />
            </div>

            {/* File size / type errors — red warning (FE-4) */}
            {fileErrors.map((err, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8 }}>
                <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 500 }}>⚠️ {err}</span>
              </div>
            ))}

            {/* File list */}
            {attachments.map((file, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8f9fc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>📎</span>
                <span style={{ flex: 1, fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => removeAttachment(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#e53e3e", fontSize: 16, padding: "0 4px" }}>✕</button>
              </div>
            ))}

            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
              {attachments.length}/{MAX_FILES} files uploaded
            </div>
          </div>
        </div>

        {/* ── RIGHT: Summary — FE-3 + FE-5 ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ ...cardStyle, padding: "24px" }}>
            <h2 style={{ ...sectionTitle, marginBottom: 20 }}>Summary</h2>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ color: "#64748b", fontSize: 14 }}>Items</span>
              <span style={{ fontWeight: 600, color: "#1a202c", fontSize: 14 }}>{items.length}</span>
            </div>

            {/* Reactive line item list */}
            {items.map((it, i) => (it.name || it.amount) ? (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#64748b", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                  {it.name || `Item ${i + 1}`}
                </span>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>${(parseFloat(it.amount) || 0).toFixed(2)}</span>
              </div>
            ) : null)}

            {/* Reactive total */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "2px solid #e2e8f0" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Total Amount</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: "#2563eb" }}>${totalAmount.toFixed(2)}</span>
            </div>

            {/* Submit Request (FE-5) */}
            <button
              onClick={() => handleSubmit(false)}
              disabled={isAnyLoading}
              style={{
                width: "100%", background: loading ? "#93c5fd" : "#2563eb", color: "#fff",
                border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px",
                fontWeight: 700, cursor: isAnyLoading ? "not-allowed" : "pointer",
                marginTop: 24, transition: "background 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: isAnyLoading ? 0.85 : 1,
              }}
              onMouseEnter={e => { if (!isAnyLoading) e.currentTarget.style.background = "#1d4ed8"; }}
              onMouseLeave={e => { if (!isAnyLoading) e.currentTarget.style.background = loading ? "#93c5fd" : "#2563eb"; }}
            >
              {loading && <Spinner />}
              {loading ? "Submitting..." : "Submit Request"}
            </button>

            {/* Save as Draft (FE-5) */}
            <button
              onClick={() => handleSubmit(true)}
              disabled={isAnyLoading}
              style={{
                width: "100%", background: "#fff", color: "#374151",
                border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "13px",
                fontSize: "15px", fontWeight: 600, cursor: isAnyLoading ? "not-allowed" : "pointer",
                marginTop: 10, transition: "background 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: isAnyLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!isAnyLoading) e.currentTarget.style.background = "#f8f9fc"; }}
              onMouseLeave={e => { if (!isAnyLoading) e.currentTarget.style.background = "#fff"; }}
            >
              {loadingDraft && <Spinner dark />}
              {loadingDraft ? "Saving..." : "Save as Draft"}
            </button>

            <p style={{ fontSize: 11.5, color: "#94a3b8", textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
              "Submit" sends for approval · "Draft" saves for later
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}