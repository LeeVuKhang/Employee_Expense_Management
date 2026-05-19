import { useEffect, useState } from "react";
import ExpenseRequestDetail from "./pages/ExpenseRequestDetail";
import MyRequests from "./pages/MyRequests";
import NewExpenseRequest from "./pages/NewExpenseRequest";
import "./App.css";

const NEW_REQUEST_PAGE = "New Request";
const MY_REQUESTS_PAGE = "My Requests";
const REQUEST_DETAIL_PAGE = "Request Detail";

function requestIdFromPath() {
  const match = window.location.pathname.match(/^\/requests\/([^/]+)$/);
  return match?.[1] ?? null;
}

function pageFromPath() {
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes("new-request")) return NEW_REQUEST_PAGE;
  if (requestIdFromPath()) return REQUEST_DETAIL_PAGE;
  return MY_REQUESTS_PAGE;
}

function pathForPage(page, options = {}) {
  if (page === NEW_REQUEST_PAGE) return "/new-request";
  if (page === REQUEST_DETAIL_PAGE) {
    const requestId = options.request?.id ?? options.requestId;
    return requestId ? `/requests/${requestId}` : "/my-requests";
  }
  return "/my-requests";
}

export default function App() {
  const [activePage, setActivePage] = useState(pageFromPath);
  const [detailContext, setDetailContext] = useState({
    request: null,
    requestId: requestIdFromPath(),
  });
  const [requestFormContext, setRequestFormContext] = useState({
    mode: "create",
    request: null,
  });

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(pageFromPath());
      setDetailContext({
        request: null,
        requestId: requestIdFromPath(),
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (page, options = {}) => {
    setActivePage(page);
    setDetailContext(
      page === REQUEST_DETAIL_PAGE
        ? {
            request: options.request ?? null,
            requestId: options.request?.id ?? options.requestId ?? null,
          }
        : {
            request: null,
            requestId: null,
          }
    );
    setRequestFormContext(
      page === NEW_REQUEST_PAGE
        ? {
            mode: options.mode ?? "create",
            request: options.request ?? null,
          }
        : {
            mode: "create",
            request: null,
          }
    );

    const nextPath = pathForPage(page, options);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  };

  if (activePage === NEW_REQUEST_PAGE) {
    return (
      <NewExpenseRequest
        key={`${requestFormContext.mode}-${requestFormContext.request?.id ?? "new"}`}
        initialRequest={requestFormContext.request}
        mode={requestFormContext.mode}
        onNavigate={navigate}
        onSaved={(savedRequest) => {
          if (requestFormContext.mode === "edit") {
            navigate(REQUEST_DETAIL_PAGE, { request: savedRequest });
            return;
          }

          navigate(MY_REQUESTS_PAGE);
        }}
      />
    );
  }

  if (activePage === REQUEST_DETAIL_PAGE) {
    return (
      <ExpenseRequestDetail
        key={detailContext.request?.id ?? detailContext.requestId ?? "missing"}
        initialRequest={detailContext.request}
        onNavigate={navigate}
        requestId={detailContext.requestId}
      />
    );
  }

  return <MyRequests onNavigate={navigate} />;
}
