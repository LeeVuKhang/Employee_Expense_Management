import { useEffect, useState } from "react";
import MyRequests from "./pages/MyRequests";
import NewExpenseRequest from "./pages/NewExpenseRequest";
import "./App.css";

const NEW_REQUEST_PAGE = "New Request";
const MY_REQUESTS_PAGE = "My Requests";

function pageFromPath() {
  return window.location.pathname.toLowerCase().includes("new-request")
    ? NEW_REQUEST_PAGE
    : MY_REQUESTS_PAGE;
}

function pathForPage(page) {
  return page === NEW_REQUEST_PAGE ? "/new-request" : "/my-requests";
}

export default function App() {
  const [activePage, setActivePage] = useState(pageFromPath);

  useEffect(() => {
    const handlePopState = () => setActivePage(pageFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (page) => {
    setActivePage(page);
    const nextPath = pathForPage(page);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, "", nextPath);
    }
  };

  if (activePage === NEW_REQUEST_PAGE) {
    return <NewExpenseRequest onNavigate={navigate} />;
  }

  return <MyRequests onNavigate={navigate} />;
}
