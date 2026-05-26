import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function dashboardForRole(role) {
  if (role === "Manager") return "/manager/pending-requests";
  if (role === "Finance") return "/finance";
  return "/my-requests";
}

export default function AccessDenied() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <main className="page-frame">
        <div className="card feedback-card error-state" role="alert">
          <h1>Access Denied</h1>
          <p>You don't have permission to view this page.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate(dashboardForRole(user?.role))}
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
