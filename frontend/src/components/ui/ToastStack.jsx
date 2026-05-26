export default function ToastStack({ toasts, onDismiss }) {
  const labelForType = {
    success: "Success",
    error: "Error",
    info: "Info",
  };

  if (!toasts.length) return null;

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div
          className={`form-toast form-toast-${toast.type}`}
          key={toast.id}
          role={toast.type === "error" ? "alert" : "status"}
        >
          <span className="form-toast-label">
            {labelForType[toast.type] ?? "Notice"}
          </span>
          <span>{toast.message}</span>
          <button type="button" onClick={() => onDismiss(toast.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
