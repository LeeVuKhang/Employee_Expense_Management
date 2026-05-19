// data/mockRequests.js

export const STATUS_CONFIG = {
  "Draft": { label: "Draft", color: "#3B82F6", bg: "#EFF6FF", turn: null },
  "Pending Manager": { label: "Pending Manager", color: "#D97706", bg: "#FEF3C7", turn: "Manager" },
  "Pending Finance": { label: "Pending Finance", color: "#D97706", bg: "#FEF3C7", turn: "Finance" },
  "Paid": { label: "Paid", color: "#059669", bg: "#ECFDF5", turn: null },
  "Rejected": { label: "Rejected", color: "#DC2626", bg: "#FEF2F2", turn: null },
};

export const MOCK_REQUESTS = [
  {
    id: "REQ-003",
    employeeName: "Bob Johnson",
    category: "Meals",
    submittedDate: "2026-02-05T00:00:00.000Z",
    amount: 45.00,
    status: "Pending Finance",
    description: "Business lunch with client",
    tripDateFrom: "2/5/2026",
    tripDateTo: "2/5/2026",
  }
];
