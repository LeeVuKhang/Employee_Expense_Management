import { Routes, Route, Navigate } from "react-router-dom";
import FinancePage from "./pages/FinancePage";
import RequestDetailPage from "./pages/RequestDetailPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/finance" replace />} />
      <Route path="/finance" element={<FinancePage />} />
      <Route path="/finance/request/:id" element={<RequestDetailPage />} />
    </Routes>
  );
}

export default App;
