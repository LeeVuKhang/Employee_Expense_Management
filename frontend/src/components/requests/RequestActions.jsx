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
  const canManage = canManageRequestActions(request.status) && !request.isLocked

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
            className="danger-button"
            type="button"
            onClick={() => onCancel(request)}
          >
            Cancel Request
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onDuplicate(request)}
          >
            Duplicate Request
          </button>
        </>
      ) : (
        <>
          <div className="readonly-state">
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
