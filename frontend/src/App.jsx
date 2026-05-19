import { useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import CancelRequestModal from './components/requests/CancelRequestModal'
import RequestActions from './components/requests/RequestActions'
import './App.css'

const EDITABLE_REQUEST_ACTION_STATUSES = new Set(['Draft', 'Pending Manager'])
const params = new URLSearchParams(window.location.search)
const INITIAL_REQUEST_ID =
  params.get('id') ?? localStorage.getItem('requestId') ?? 'REQ-001'

const mockRequests = [
  {
    id: 'REQ-001',
    employee: 'Alice Smith',
    submittedOn: '2026-05-13',
    category: 'Travel',
    categoryId: 'travel',
    tripStart: '2026-05-10',
    tripEnd: '2026-05-12',
    status: 'Pending Manager',
    processor: 'Manager',
    attachments: [],
    lineItems: [
      {
        id: 'LI-001',
        date: '2026-05-10',
        itemName: 'Flight',
        purpose: 'Client meeting',
        amount: 300,
      },
      {
        id: 'LI-002',
        date: '2026-05-11',
        itemName: 'Hotel',
        purpose: 'Stay',
        amount: 150,
      },
    ],
    timeline: [{ label: 'Submitted', date: '2026-05-13' }],
  },
  {
    id: 'REQ-002',
    employee: 'Alice Smith',
    submittedOn: '2026-04-28',
    category: 'Meals',
    categoryId: 'meals',
    tripStart: '2026-04-25',
    tripEnd: '2026-04-25',
    status: 'Approved',
    processor: 'Finance',
    attachments: [{ id: 'ATT-001', fileName: 'client-dinner-receipt.pdf' }],
    lineItems: [
      {
        id: 'LI-003',
        date: '2026-04-25',
        itemName: 'Client dinner',
        purpose: 'Project kickoff',
        amount: 86.4,
      },
    ],
    timeline: [
      { label: 'Submitted', date: '2026-04-28' },
      { label: 'Manager approved', date: '2026-04-29' },
      { label: 'Finance approved', date: '2026-05-01' },
    ],
  },
  {
    id: 'REQ-003',
    employee: 'Alice Smith',
    submittedOn: '2026-05-18',
    category: 'Office Supplies',
    categoryId: 'office-supplies',
    tripStart: '2026-05-18',
    tripEnd: '2026-05-18',
    status: 'Draft',
    processor: 'Employee',
    attachments: [],
    lineItems: [
      {
        id: 'LI-004',
        date: '2026-05-18',
        itemName: 'Monitor stand',
        purpose: 'Home office setup',
        amount: 42.99,
      },
    ],
    timeline: [{ label: 'Draft created', date: '2026-05-18' }],
  },
]

function App() {
  const [requests, setRequests] = useState(mockRequests)

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={`/requests/${INITIAL_REQUEST_ID}`} replace />}
      />
      <Route
        path="/requests/:requestId"
        element={
          <ExpenseRequestWorkspace
            requests={requests}
            setRequests={setRequests}
          />
        }
      />
      <Route
        path="/requests/:requestId/edit"
        element={
          <ExpenseRequestWorkspace
            requests={requests}
            routeMode="edit"
            setRequests={setRequests}
          />
        }
      />
      <Route
        path="/requests/:requestId/duplicate"
        element={
          <ExpenseRequestWorkspace
            requests={requests}
            routeMode="duplicate"
            setRequests={setRequests}
          />
        }
      />
    </Routes>
  )
}

function ExpenseRequestWorkspace({ requests, routeMode = 'detail', setRequests }) {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const selectedRequest =
    requests.find((request) => request.id === requestId) ?? null
  const [cancelRequestId, setCancelRequestId] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function showToast(type, message) {
    setToast({ type, message })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3600)
  }

  if (routeMode === 'edit' && selectedRequest && !canManageRequestActions(selectedRequest.status)) {
    return <Navigate to={`/requests/${selectedRequest.id}`} replace />
  }

  function startEditRequest(request) {
    if (!canManageRequestActions(request.status)) {
      showToast('error', 'This request is locked and can no longer be edited.')
      return
    }
    navigate(`/requests/${request.id}/edit`)
  }

  function startDuplicateRequest(request) {
    navigate(`/requests/${request.id}/duplicate`)
    showToast('success', `${request.id} was duplicated into a new draft.`)
  }

  function saveRequest(formData) {
    const normalizedForm = normalizeForm(formData)

    if (routeMode !== 'edit' && !normalizedForm.lineItems.length) {
      showToast('error', 'Add at least one line item before saving.')
      return
    }

    if (routeMode === 'edit') {
      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId
            ? {
                ...request,
                ...normalizedForm,
                attachments: normalizedForm.attachments.map((attachment, index) => ({
                  id: `ATT-${request.id}-${index}`,
                  fileName: attachment,
                })),
              }
            : request,
        ),
      )
      navigate(`/requests/${requestId}`)
      showToast('success', 'Request updated successfully.')
      return
    }

    const newRequest = {
      id: nextRequestId(requests),
      employee: 'Alice Smith',
      submittedOn: todayISO(),
      ...normalizedForm,
      attachments: normalizedForm.attachments.map((attachment, index) => ({
        id: `ATT-${Date.now()}-${index}`,
        fileName: attachment,
      })),
      status: normalizedForm.status ?? 'Draft',
      processor: normalizedForm.status === 'Pending Manager' ? 'Manager' : 'Employee',
      timeline: [
        {
          label: normalizedForm.status === 'Pending Manager' ? 'Submitted' : 'Draft created',
          date: todayISO(),
        },
      ],
    }

    setRequests((currentRequests) => [newRequest, ...currentRequests])
    navigate(`/requests/${newRequest.id}`)
    showToast(
      'success',
      routeMode === 'duplicate'
        ? 'Duplicated request saved as a new draft.'
        : 'Request created successfully.',
    )
  }

  function confirmCancelRequest() {
    if (!cancelRequestId) return

    const requestToCancel =
      selectedRequest?.id === cancelRequestId ? selectedRequest : null

    if (!requestToCancel || !canManageRequestActions(requestToCancel.status)) {
      setCancelRequestId(null)
      showToast('error', 'This request can no longer be cancelled.')
      return
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === cancelRequestId
          ? {
              ...request,
              status: 'Cancelled',
              processor: 'None',
              timeline: [...request.timeline, { label: 'Cancelled', date: todayISO() }],
            }
          : request,
      ),
    )
    setCancelRequestId(null)
    showToast('success', 'Request cancelled successfully.')
  }

  return (
    <div className="app-shell">
      <main className="page-frame">
        {toast && (
          <div className={`toast toast-${toast.type}`} role="status">
            {toast.message}
          </div>
        )}

        {!selectedRequest && (
          <div className="card feedback-card error-state" role="alert">
            Request not found.
          </div>
        )}

        {routeMode === 'detail' && selectedRequest && (
          <RequestDetail
            request={selectedRequest}
            onBack={() => navigate(-1)}
            onEdit={startEditRequest}
            onCancel={(request) => setCancelRequestId(request.id)}
            onDuplicate={startDuplicateRequest}
          />
        )}

        {routeMode !== 'detail' && selectedRequest && (
          <RequestForm
            key={`${routeMode}-${selectedRequest?.id}`}
            initialFormData={
              selectedRequest ? copyRequestToForm(selectedRequest) : createEmptyForm()
            }
            mode={routeMode}
            onCancel={() => navigate(`/requests/${requestId}`)}
            onSaveDraft={saveRequest}
            onSubmit={saveRequest}
          />
        )}
      </main>

      {cancelRequestId && (
        <CancelRequestModal
          onClose={() => setCancelRequestId(null)}
          onConfirm={confirmCancelRequest}
        />
      )}
    </div>
  )
}

function canManageRequestActions(status) {
  return EDITABLE_REQUEST_ACTION_STATUSES.has(status)
}

function RequestDetail({ request, onBack, onEdit, onCancel, onDuplicate }) {
  const total = calculateTotal(request.lineItems)

  return (
    <section className="detail-grid">
      <div className="detail-main">
        <div className="detail-heading">
          <button className="back-button" type="button" onClick={onBack}>
            <BackIcon />
            <span className="sr-only">Back to requests</span>
          </button>

          <div>
            <h1>{request.id}</h1>
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
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onCancel={onCancel}
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
  )
}

function RequestForm({
  mode,
  initialFormData,
  onCancel,
  onSaveDraft,
  onSubmit,
}) {
  const [formData, setFormData] = useState(initialFormData)
  const itemCount = formData.lineItems.length
  const formTotal = calculateTotal(formData.lineItems)
  const title =
    mode === 'edit'
      ? 'Edit Expense Request'
      : mode === 'duplicate'
        ? 'Duplicate Expense Request'
        : 'New Expense Request'
  const helperText =
    mode === 'edit'
      ? 'Update the details below before resubmitting this request.'
      : mode === 'duplicate'
        ? 'Review the copied details, make changes, then submit as a new request.'
        : 'Fill out the details below to submit a reimbursement.'

  function updateField(field, value) {
    setFormData((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function updateLineItem(lineItemId, field, value) {
    setFormData((currentForm) => ({
      ...currentForm,
      lineItems: currentForm.lineItems.map((lineItem) =>
        lineItem.id === lineItemId ? { ...lineItem, [field]: value } : lineItem,
      ),
    }))
  }

  function addLineItem() {
    setFormData((currentForm) => ({
      ...currentForm,
      lineItems: [
        ...currentForm.lineItems,
        {
          id: `TEMP-${crypto.randomUUID()}`,
          date: todayISO(),
          itemName: '',
          purpose: '',
          amount: '',
        },
      ],
    }))
  }

  function removeLineItem(lineItemId) {
    setFormData((currentForm) => ({
      ...currentForm,
      lineItems: currentForm.lineItems.filter(
        (lineItem) => lineItem.id !== lineItemId,
      ),
    }))
  }

  return (
    <section className="request-form-page">
      <div className="form-page-heading">
        <button className="back-button" type="button" onClick={onCancel}>
          <BackIcon />
          <span className="sr-only">Back to request detail</span>
        </button>
        <div>
          <h1>{title}</h1>
          <p>{helperText}</p>
        </div>
      </div>

      <div className="request-form-grid">
        <div className="request-form-main">
          <div className="card form-card">
            <h2>Basic Details</h2>
            <p className="muted">Select the category and date range for this expense.</p>
            <div className="basic-details-grid">
              <label className="full-span">
                Expense Category
                <select
                  value={formData.category}
                  onChange={(event) =>
                    updateField('category', event.target.value)
                  }
                >
                  <option>Travel</option>
                  <option>Meals</option>
                  <option>Office Supplies</option>
                  <option>Software</option>
                  <option>Training</option>
                </select>
              </label>
              <label>
                Start Date
                <input
                  type="date"
                  value={formData.tripStart}
                  onChange={(event) =>
                    updateField('tripStart', event.target.value)
                  }
                />
              </label>
              <label>
                End Date
                <input
                  type="date"
                  value={formData.tripEnd}
                  onChange={(event) =>
                    updateField('tripEnd', event.target.value)
                  }
                />
              </label>
            </div>
          </div>

          <div className="card form-card">
            <h2>Line Items</h2>
            <p className="muted">Itemize your expenses below.</p>

            <div className="line-item-editor">
              {formData.lineItems.map((lineItem, index) => (
                <div className="line-item-row" key={lineItem.id}>
                  <h3>Item {index + 1}</h3>
                  <label>
                    Date
                    <input
                      type="date"
                      value={lineItem.date}
                      onChange={(event) =>
                        updateLineItem(lineItem.id, 'date', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Item / Service Name
                    <input
                      value={lineItem.itemName}
                      placeholder="e.g. Flight to NYC"
                      onChange={(event) =>
                        updateLineItem(
                          lineItem.id,
                          'itemName',
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    Amount ($)
                    <input
                      min="0"
                      step="0.01"
                      type="number"
                      value={lineItem.amount}
                      onChange={(event) =>
                        updateLineItem(lineItem.id, 'amount', event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Purpose / Note
                    <input
                      value={lineItem.purpose}
                      placeholder="Reason for this expense"
                      onChange={(event) =>
                        updateLineItem(
                          lineItem.id,
                          'purpose',
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  {formData.lineItems.length > 1 && (
                    <button
                      className="remove-button"
                      type="button"
                      onClick={() => removeLineItem(lineItem.id)}
                      aria-label={`Remove ${lineItem.itemName || 'line item'}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="add-item-button" type="button" onClick={addLineItem}>
              <span aria-hidden="true">+</span>
              Add Another Item
            </button>
          </div>

          <div className="card form-card">
            <h2>Attachments</h2>
            <p className="muted">Upload up to 3 receipts or invoices (Max 10MB each).</p>
            <label className="attachment-upload">
              <input
                type="text"
                value={formData.attachmentsText}
                placeholder="receipt.pdf, invoice.png"
                onChange={(event) =>
                  updateField('attachmentsText', event.target.value)
                }
              />
              <span className="upload-icon" aria-hidden="true">
                ^
              </span>
              <strong>Click to upload or drag and drop</strong>
              <span>SVG, PNG, JPG or PDF</span>
            </label>
          </div>
        </div>

        <aside className="card summary-card">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Items</span>
            <strong>{itemCount}</strong>
          </div>
          <div className="summary-total">
            <span>Total Amount</span>
            <strong>{formatCurrency(formTotal)}</strong>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => onSubmit(formData)}
          >
            Submit Request
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSaveDraft(formData)}
          >
            Save as Draft
          </button>
        </aside>
        </div>
    </section>
  )
}

function FieldValue({ label, value }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
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
              <td>{formatCurrency(Number(lineItem.amount))}</td>
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
  )
}

function createEmptyForm() {
  return {
    category: 'Travel',
    categoryId: '',
    tripStart: todayISO(),
    tripEnd: todayISO(),
    status: 'Draft',
    attachmentsText: '',
    lineItems: [
      {
        id: `TEMP-${crypto.randomUUID()}`,
        date: todayISO(),
        itemName: '',
        purpose: '',
        amount: '',
      },
    ],
  }
}

function copyRequestToForm(request) {
  return {
    category: request.category,
    categoryId: request.categoryId,
    tripStart: request.tripStart,
    tripEnd: request.tripEnd,
    status: request.status,
    attachmentsText: request.attachments
      .map((attachment) => attachment.fileName)
      .join(', '),
    lineItems: request.lineItems.map((lineItem) => ({
      ...lineItem,
      id: `TEMP-${crypto.randomUUID()}`,
      amount: String(lineItem.amount),
    })),
  }
}

function normalizeForm(form) {
  return {
    category: form.category,
    categoryId: form.categoryId,
    tripStart: form.tripStart,
    tripEnd: form.tripEnd,
    status: form.status,
    attachments: form.attachmentsText
      .split(',')
      .map((attachment) => attachment.trim())
      .filter(Boolean),
    lineItems: form.lineItems
      .filter(
        (lineItem) => lineItem.itemName.trim() || lineItem.purpose.trim(),
      )
      .map((lineItem, index) => ({
        id: `LI-${Date.now()}-${index}`,
        date: lineItem.date,
        itemName: lineItem.itemName.trim() || 'Expense item',
        purpose: lineItem.purpose.trim() || 'Business expense',
        amount: Number(lineItem.amount) || 0,
      })),
  }
}

function nextRequestId(requests) {
  const nextId =
    Math.max(
      ...requests.map((request) => Number(request.id.replace('REQ-', ''))),
      0,
    ) + 1

  return `REQ-${String(nextId).padStart(3, '0')}`
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function calculateTotal(lineItems) {
  return lineItems.reduce(
    (total, lineItem) => total + Number(lineItem.amount || 0),
    0,
  )
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function formatDate(dateString) {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-')
  return `${Number(month)}/${Number(day)}/${year}`
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export default App
