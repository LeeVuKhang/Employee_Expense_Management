export default function CancelRequestModal({ onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
      >
        <h2 id="cancel-title">Cancel Request</h2>
        <p>Are you sure? This cannot be undone.</p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Keep Request
          </button>
          <button className="danger-button" type="button" onClick={onConfirm}>
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
