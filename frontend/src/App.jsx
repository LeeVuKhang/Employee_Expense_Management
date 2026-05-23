import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { fetchExpenseRequest } from "./api/expenses";
import Navbar from "./components/layouts/Navbar";
import ManagerPendingRequestsDashboard from "./components/requests/ManagerPendingRequestsDashboard";
import ExpenseRequestDetail from "./pages/ExpenseRequestDetail";
import FinancePage from "./pages/FinancePage";
import MyRequests from "./pages/MyRequests";
import NewExpenseRequest from "./pages/NewExpenseRequest";
import RequestDetailPage from "./pages/RequestDetailPage";
import "./App.css";

const NEW_REQUEST_PAGE = "New Request";
const MY_REQUESTS_PAGE = "My Requests";
const REQUEST_DETAIL_PAGE = "Request Detail";
const MANAGER_PENDING_PAGE = "Manager Pending";

function pathForPage(page, options = {}) {
  if (page === NEW_REQUEST_PAGE) {
    if (options.mode === "edit" && options.request?.id) {
      return `/requests/${options.request.id}/edit`;
    }

    return "/new-request";
  }

  if (page === REQUEST_DETAIL_PAGE) {
    const requestId = options.request?.id ?? options.requestId;
    return requestId ? `/requests/${requestId}` : "/my-requests";
  }

  if (page === MANAGER_PENDING_PAGE) {
    return "/manager/pending-requests";
  }

  return "/my-requests";
}

function usePageNavigation() {
  const routerNavigate = useNavigate();

  return (page, options = {}) => {
    routerNavigate(pathForPage(page, options), {
      replace: Boolean(options.replace),
      state: {
        mode: options.mode,
        request: options.request ?? null,
      },
    });
  };
}

function RouteFeedback({ type = "status", children }) {
  return (
    <div className="app-shell">
      <main className="page-frame">
        <div
          className={`card feedback-card${type === "error" ? " error-state" : ""}`}
          role={type === "error" ? "alert" : "status"}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

function MyRequestsRoute() {
  const navigate = usePageNavigation();
  return <MyRequests onNavigate={navigate} />;
}

function ExpenseRequestDetailRoute() {
  const navigate = usePageNavigation();
  const location = useLocation();
  const { requestId } = useParams();
  const initialRequest = location.state?.request ?? null;

  return (
    <ExpenseRequestDetail
      key={initialRequest?.id ?? requestId ?? "missing"}
      initialRequest={initialRequest}
      onNavigate={navigate}
      requestId={requestId}
    />
  );
}

function NewExpenseRequestRoute({ editMode = false }) {
  const navigate = usePageNavigation();
  const location = useLocation();
  const { requestId } = useParams();
  const routeRequest = editMode ? location.state?.request ?? null : null;
  const [fetchedRequest, setFetchedRequest] = useState(null);
  const [loading, setLoading] = useState(editMode && !routeRequest);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadEditableRequest() {
      setError(null);

      if (!editMode) {
        setFetchedRequest(null);
        setLoading(false);
        return;
      }

      if (routeRequest) {
        setFetchedRequest(null);
        setLoading(false);
        return;
      }

      if (!requestId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const request = await fetchExpenseRequest(requestId);
        if (!ignore) setFetchedRequest(request);
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadEditableRequest();
    return () => { ignore = true; };
  }, [editMode, requestId, routeRequest]);

  if (loading) {
    return <RouteFeedback>Loading expense request...</RouteFeedback>;
  }

  if (error) {
    return <RouteFeedback type="error">{error}</RouteFeedback>;
  }

  const initialRequest = routeRequest ?? fetchedRequest;
  const mode = editMode ? "edit" : "create";

  return (
    <NewExpenseRequest
      key={`${mode}-${initialRequest?.id ?? "new"}`}
      initialRequest={initialRequest}
      mode={mode}
      onNavigate={navigate}
      onSaved={(savedRequest) => {
        if (mode === "edit") {
          navigate(REQUEST_DETAIL_PAGE, { request: savedRequest });
          return;
        }

        navigate(MY_REQUESTS_PAGE);
      }}
    />
  );
}

function ManagerPendingRequestsRoute() {
  const navigate = usePageNavigation();

  return (
    <div className="app-shell">
      <Navbar activePage={MANAGER_PENDING_PAGE} onNavigate={navigate} />
      <main className="page-frame">
        <ManagerPendingRequestsDashboard />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/my-requests" replace />} />
      <Route path="/my-requests" element={<MyRequestsRoute />} />
      <Route path="/new-request" element={<NewExpenseRequestRoute />} />
      <Route path="/requests/:requestId" element={<ExpenseRequestDetailRoute />} />
      <Route path="/requests/:requestId/edit" element={<NewExpenseRequestRoute editMode />} />
      <Route path="/finance" element={<FinancePage />} />
      <Route path="/finance/request/:id" element={<RequestDetailPage />} />
      <Route path="/manager" element={<Navigate to="/manager/pending-requests" replace />} />
      <Route path="/manager/pending-requests" element={<ManagerPendingRequestsRoute />} />
      <Route path="*" element={<Navigate to="/my-requests" replace />} />
    </Routes>
  );
}
