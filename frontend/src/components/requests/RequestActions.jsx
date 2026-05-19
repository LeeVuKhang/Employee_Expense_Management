const EDITABLE_STATUSES = new Set(['Draft', 'Pending Manager'])

function canManageRequestActions(status) {
  return EDITABLE_STATUSES.has(status)
}

export default function RequestActions({
  request,
  onEdit,
  onDuplicate,
  onCancel,
}) {
  const canManage = canManageRequestActions(request.status)

  return (
    <div className="card actions-card">
      <h2>Actions</h2>

      {canManage ? (
        <>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onEdit(request)}
          >
            Edit Request
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onDuplicate(request)}
          >
            Duplicate Request
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={() => onCancel(request)}
          >
            Cancel Request
          </button>
        </>
      ) : (
        <>
          <div className="readonly-state">
            <LockIcon />
            <span>Locked</span>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onDuplicate(request)}
          >
            Duplicate Request
          </button>
        </>
      )}
    </div>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10V8a5 5 0 0 1 10 0v2" />
      <rect x="5" y="10" width="14" height="11" rx="2" />
    </svg>
  )
}
