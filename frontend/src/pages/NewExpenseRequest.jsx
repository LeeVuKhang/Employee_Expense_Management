import { useState, useCallback, useEffect } from "react";
import { updateExpenseRequest } from "../api/expenses";
import Navbar from "../components/layouts/Navbar";

const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME = ["image/svg+xml", "image/png", "image/jpeg", "application/pdf"];
const FALLBACK_CATEGORIES = [
  { id: 1, name: "Travel" },
  { id: 3, name: "Meals" },
  { id: 2, name: "Accommodation" },
  { id: 4, name: "Office Supplies" },
  { id: 5, name: "Training" },
];
const today = () => new Date().toISOString().split("T")[0];

function Toast({ toasts, remove }) {
  const labelForType = {
    success: "Success",
    error: "Error",
    info: "Info",
  };

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div className={`form-toast form-toast-${toast.type}`} key={toast.id} role="status">
          <span className="form-toast-label">{labelForType[toast.type] ?? "Notice"}</span>
          <span>{toast.message}</span>
          <button type="button" onClick={() => remove(toast.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);
  const remove = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return { toasts, add, remove };
}

function Spinner({ dark }) {
  return (
    <>
      <span className={`button-spinner${dark ? " button-spinner-dark" : ""}`} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

function inputClassName(hasError) {
  return `form-input${hasError ? " form-input-error" : ""}`;
}

function LineItem({ item, index, onChange, onRemove, showRemove, errors }) {
  const currentErrors = errors || {};

  return (
    <div className="line-item-panel">
      <div className="line-item-header">
        <h3>Item {index + 1}</h3>
        {showRemove && (
          <button className="remove-button" onClick={onRemove} type="button">
            Remove
          </button>
        )}
      </div>

      <div className="line-item-fields">
        <label className="form-field">
          <span>Date</span>
          <input
            className={inputClassName(currentErrors.date)}
            max={today()}
            onChange={(event) => onChange(index, "date", event.target.value)}
            type="date"
            value={item.date}
          />
          {currentErrors.date && <span className="form-error">{currentErrors.date}</span>}
        </label>

        <label className="form-field line-item-wide">
          <span>Item Name</span>
          <input
            className={inputClassName(currentErrors.name)}
            onChange={(event) => onChange(index, "name", event.target.value)}
            placeholder="e.g. Flight to NYC"
            type="text"
            value={item.name}
          />
          {currentErrors.name && <span className="form-error">{currentErrors.name}</span>}
        </label>

        <label className="form-field">
          <span>Amount</span>
          <input
            className={inputClassName(currentErrors.amount)}
            min="0.01"
            onChange={(event) => onChange(index, "amount", event.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={item.amount}
          />
          {currentErrors.amount && <span className="form-error">{currentErrors.amount}</span>}
        </label>

        <label className="form-field line-item-wide">
          <span>Purpose</span>
          <input
            className="form-input"
            onChange={(event) => onChange(index, "note", event.target.value)}
            placeholder="Reason for this expense"
            type="text"
            value={item.note}
          />
        </label>
      </div>
    </div>
  );
}

function SuccessScreen({ category, totalAmount, isDraft, onReset }) {
  return (
    <main className="request-success-page">
      <div className="card request-success-card">
        <span className="success-status-text">{isDraft ? "Draft Saved" : "Request Submitted"}</span>
        <h2>{isDraft ? "Draft saved" : "Request submitted"}</h2>
        <p>
          {isDraft
            ? "Your draft has been saved. You can continue editing later."
            : "Your expense request has been sent for approval."}
        </p>

        <div className="success-summary">
          <div>
            <span>Category</span>
            <strong>{category}</strong>
          </div>
          <div>
            <span>Total Amount</span>
            <strong>${totalAmount.toFixed(2)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{isDraft ? "Draft" : "Pending Manager"}</strong>
          </div>
        </div>

        <button className="primary-button" onClick={onReset} type="button">
          New Request
        </button>
      </div>
    </main>
  );
}

function emptyLineItem() {
  return { date: "", name: "", amount: "", note: "" };
}

function requestToFormState(request) {
  if (!request) {
    return {
      category: FALLBACK_CATEGORIES[0].name,
      categoryId: FALLBACK_CATEGORIES[0].id,
      startDate: "",
      endDate: "",
      items: [emptyLineItem()],
    };
  }

  return {
    category: request.category,
    categoryId: request.categoryId,
    startDate: request.tripStart ?? request.tripDateFrom ?? "",
    endDate: request.tripEnd ?? request.tripDateTo ?? "",
    items: request.lineItems?.length
      ? request.lineItems.map((lineItem) => ({
          date: lineItem.date,
          name: lineItem.itemName,
          amount: String(lineItem.amount ?? ""),
          note: lineItem.purpose,
        }))
      : [emptyLineItem()],
  };
}

function categoryIdForName(categories, categoryName, fallbackId) {
  return categories.find((option) => option.name === categoryName)?.id ?? fallbackId;
}

export default function NewExpenseRequest({
  initialRequest = null,
  mode = "create",
  onNavigate,
  onSaved,
}) {
  const { toasts, add: addToast, remove: removeToast } = useToast();
  const isEditMode = Boolean(mode === "edit" && initialRequest);
  const initialForm = requestToFormState(initialRequest);

  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [category, setCategory] = useState(initialForm.category);
  const [categoryId, setCategoryId] = useState(initialForm.categoryId);
  const [startDate, setStartDate] = useState(initialForm.startDate);
  const [endDate, setEndDate] = useState(initialForm.endDate);
  const [items, setItems] = useState(initialForm.items);
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/expense-categories");
        if (!response.ok) return;

        const data = await response.json();
        if (!ignore && Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch {
        // Keep fallback categories when the category endpoint is unavailable.
      }
    }

    loadCategories();
    return () => {
      ignore = true;
    };
  }, []);

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

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
      formErrs.endDate = "End date cannot be earlier than start date.";
    }

    const iErrs = items.map((item) => {
      const errors = {};
      if (!item.date) errors.date = "Required.";
      else if (item.date > today()) errors.date = "Cannot be in the future.";
      if (!item.name.trim()) errors.name = "Required.";
      if (!item.amount || parseFloat(item.amount) <= 0) errors.amount = "Must be greater than 0.";
      return errors;
    });

    return {
      formErrs,
      iErrs,
      hasErrors:
        Object.keys(formErrs).length > 0 ||
        iErrs.some((errors) => Object.keys(errors).length > 0),
    };
  }

  const handleItemChange = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
    setItemErrors((current) => {
      const next = [...current];
      if (next[index]) next[index] = { ...next[index], [field]: undefined };
      return next;
    });
  };

  const addItem = () => setItems((current) => [...current, emptyLineItem()]);

  const removeItem = (index) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setItemErrors((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  function processFiles(newFiles) {
    const errs = [];
    const valid = [];

    newFiles.forEach((file) => {
      if (!ALLOWED_MIME.includes(file.type)) {
        errs.push(`"${file.name}": invalid file type.`);
      } else if (file.size > MAX_FILE_SIZE_BYTES) {
        errs.push(`"${file.name}": exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
      } else {
        valid.push(file);
      }
    });

    setFileErrors(errs);
    if (errs.length > 0) errs.forEach((error) => addToast(error, "error"));
    setAttachments((current) => {
      const slots = MAX_FILES - current.length;
      return [...current, ...valid.slice(0, slots)];
    });
  }

  const handleFileDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    if (attachments.length >= MAX_FILES) return;
    processFiles(Array.from(event.dataTransfer.files));
  };

  const handleFileInput = (event) => {
    processFiles(Array.from(event.target.files));
    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setFileErrors([]);
  };

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
      const resolvedCategoryId = categoryIdForName(categories, category, categoryId);

      if (isEditMode) {
        if (!resolvedCategoryId) {
          throw new Error("Please choose a valid expense category.");
        }

        const updatedRequest = await updateExpenseRequest(initialRequest.id, {
          categoryId: resolvedCategoryId,
          tripStart: startDate,
          tripEnd: endDate,
          lineItems: items.map((item) => ({
            date: item.date,
            itemName: item.name,
            amount: Number(item.amount),
            purpose: item.note || "No note provided",
          })),
        });

        addToast("Request updated successfully.", "success");
        setTimeout(() => onSaved?.(updatedRequest), 800);
        return;
      }

      const testEmployeeId = "4";
      const formData = new FormData();
      formData.append("category", category);
      if (resolvedCategoryId) formData.append("categoryId", String(resolvedCategoryId));
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("totalAmount", totalAmount.toFixed(2));
      formData.append("isDraft", String(draft));
      formData.append("lineItems", JSON.stringify(items));
      formData.append("employeeId", testEmployeeId);
      attachments.forEach((file) => formData.append("attachments", file));

      const res = await fetch("/api/expenses", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
        throw new Error(
          data.error ||
            data.message ||
            detail ||
            `Server error (${res.status}). Please try again.`,
        );
      }

      addToast(draft ? "Draft saved successfully." : "Request submitted for approval.", "success");
      setTimeout(() => setSubmitted(true), 800);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
      setLoadingDraft(false);
    }
  }

  function handleReset() {
    const nextForm = requestToFormState(null);
    setSubmitted(false);
    setCategory(nextForm.category);
    setCategoryId(nextForm.categoryId);
    setStartDate(nextForm.startDate);
    setEndDate(nextForm.endDate);
    setItems(nextForm.items);
    setAttachments([]);
    setFileErrors([]);
    setFormErrors({});
    setItemErrors([]);
    setIsDraft(false);
  }

  if (submitted) {
    return (
      <>
        <Navbar activePage="New Request" onNavigate={onNavigate} />
        <SuccessScreen
          category={category}
          isDraft={isDraft}
          onReset={handleReset}
          totalAmount={totalAmount}
        />
      </>
    );
  }

  const isAnyLoading = loading || loadingDraft;
  const categoryOptions = categories.some((option) => option.name === category)
    ? categories
    : [{ id: categoryId, name: category }, ...categories];
  const uploadClassName = [
    "attachment-upload-area",
    dragOver ? "attachment-upload-area-active" : "",
    attachments.length >= MAX_FILES ? "attachment-upload-area-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="app-shell">
      <Navbar activePage="New Request" onNavigate={onNavigate} />
      <Toast toasts={toasts} remove={removeToast} />

      <main className="page-frame request-form-page">
        <div className="form-page-heading">
          <button
            aria-label="Back to My Requests"
            className="back-button form-back-button"
            onClick={() => onNavigate?.("My Requests")}
            type="button"
          >
            ←
          </button>
          <div>
            <h1>{isEditMode ? `Edit Expense Request #${initialRequest.id}` : "New Expense Request"}</h1>
            <p>
              {isEditMode
                ? "Update this Draft or Pending Manager request."
                : "Fill out the details below to submit a reimbursement."}
            </p>
          </div>
        </div>

        <div className="request-form-grid">
          <div className="request-form-main">
            <section className="card form-card">
              <div>
                <h2>Basic Details</h2>
                <p className="muted">Select the category and date range for this expense.</p>
              </div>

              <div className="basic-details-grid">
                <label className="form-field full-span">
                  <span>Category</span>
                  <select
                    className="form-input"
                    onChange={(event) => {
                      setCategory(event.target.value);
                      setCategoryId(categoryIdForName(categoryOptions, event.target.value, categoryId));
                    }}
                    value={category}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.id ?? option.name} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Start Date</span>
                  <input
                    className={inputClassName(formErrors.startDate)}
                    max={today()}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setFormErrors((current) => ({ ...current, startDate: undefined }));
                    }}
                    type="date"
                    value={startDate}
                  />
                  {formErrors.startDate && (
                    <span className="form-error">{formErrors.startDate}</span>
                  )}
                </label>

                <label className="form-field">
                  <span>End Date</span>
                  <input
                    className={inputClassName(formErrors.endDate)}
                    max={today()}
                    min={startDate || undefined}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setFormErrors((current) => ({ ...current, endDate: undefined }));
                    }}
                    type="date"
                    value={endDate}
                  />
                  {formErrors.endDate && <span className="form-error">{formErrors.endDate}</span>}
                </label>
              </div>
            </section>

            <section className="card form-card">
              <div>
                <h2>Line Items</h2>
                <p className="muted">Itemize your expenses below.</p>
              </div>

              <div className="line-item-editor">
                {items.map((item, index) => (
                  <LineItem
                    errors={itemErrors[index]}
                    index={index}
                    item={item}
                    key={index}
                    onChange={handleItemChange}
                    onRemove={() => removeItem(index)}
                    showRemove={items.length > 1}
                  />
                ))}

                <button className="add-item-button" onClick={addItem} type="button">
                  Add Another Item
                </button>
              </div>
            </section>

            <section className="card form-card">
              <div>
                <h2>Attachments</h2>
                <p className="muted">
                  Upload up to {MAX_FILES} receipts or invoices. Max {MAX_FILE_SIZE_MB}MB each.
                </p>
              </div>

              <div
                className={uploadClassName}
                onClick={() => {
                  if (attachments.length < MAX_FILES) {
                    document.getElementById("file-input")?.click();
                  }
                }}
                onDragLeave={() => setDragOver(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (attachments.length < MAX_FILES) setDragOver(true);
                }}
                onDrop={handleFileDrop}
                role="button"
                tabIndex={0}
              >
                {attachments.length >= MAX_FILES ? (
                  <p className="upload-primary">Maximum {MAX_FILES} files reached</p>
                ) : (
                  <>
                    <p className="upload-primary">Click to upload or drag and drop</p>
                    <p>SVG, PNG, JPG or PDF</p>
                  </>
                )}
                <input
                  accept=".svg,.png,.jpg,.jpeg,.pdf"
                  hidden
                  id="file-input"
                  multiple
                  onChange={handleFileInput}
                  type="file"
                />
              </div>

              {fileErrors.map((error, index) => (
                <div className="file-error" key={`${error}-${index}`}>
                  {error}
                </div>
              ))}

              {attachments.length > 0 && (
                <div className="attachment-list">
                  {attachments.map((file, index) => (
                    <div className="attachment-file-row" key={`${file.name}-${index}`}>
                      <div className="attachment-file-name">
                        <span>File</span>
                        <strong>{file.name}</strong>
                      </div>
                      <span>{(file.size / 1024).toFixed(0)} KB</span>
                      <button
                        className="remove-file-button"
                        onClick={() => removeAttachment(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="attachment-count">
                {attachments.length}/{MAX_FILES} files uploaded
              </p>
            </section>
          </div>

          <aside className="card summary-card">
            <h2>Summary</h2>

            <div className="summary-row">
              <span>Items</span>
              <strong>{items.length}</strong>
            </div>

            <div className="summary-item-list">
              {items.map((item, index) =>
                item.name || item.amount ? (
                  <div className="summary-item-row" key={`${item.name}-${index}`}>
                    <span>{item.name || `Item ${index + 1}`}</span>
                    <strong>${(parseFloat(item.amount) || 0).toFixed(2)}</strong>
                  </div>
                ) : null,
              )}
            </div>

            <div className="summary-total">
              <span>Total Amount</span>
              <strong>${totalAmount.toFixed(2)}</strong>
            </div>

            <button
              className="primary-button summary-action-button"
              disabled={isAnyLoading}
              onClick={() => handleSubmit(false)}
              type="button"
            >
              {loading && <Spinner />}
              {loading ? (isEditMode ? "Saving..." : "Submitting...") : isEditMode ? "Save Changes" : "Submit Request"}
            </button>

            {!isEditMode && (
              <button
                className="secondary-button summary-action-button"
                disabled={isAnyLoading}
                onClick={() => handleSubmit(true)}
                type="button"
              >
                {loadingDraft && <Spinner dark />}
                {loadingDraft ? "Saving..." : "Save as Draft"}
              </button>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
