// src/data/mockRequests.js
// Single source of truth cho STATUS_CONFIG.
// Keys phải khớp CHÍNH XÁC với giá trị ENUM request_status trong DB (EEM.sql):
//   'Draft' | 'Pending Manager' | 'Pending Finance' | 'Finance Approved' | 'Paid' | 'Rejected' | 'Cancelled'

export const STATUS_CONFIG = {
  "Draft": {
    label: "Draft",
    color: "#1e40af",
    bg:    "#dbeafe",
    turn:  null,
  },
  "Pending Manager": {
    label: "Pending Manager",
    color: "#92400e",
    bg:    "#fef3c7",
    turn:  "Manager",
  },
  "Pending Finance": {
    label: "Pending Finance",
    color: "#92400e",
    bg:    "#fef3c7",
    turn:  "Finance",
  },
  "Finance Approved": {
    label: "Finance Approved",
    color: "#065f46",
    bg:    "#d1fae5",
    turn:  null,
  },
  "Paid": {
    label: "Paid",
    color: "#065f46",
    bg:    "#d1fae5",
    turn:  null,
  },
  "Rejected": {
    label: "Rejected",
    color: "#991b1b",
    bg:    "#fee2e2",
    turn:  null,
  },
  "Cancelled": {
    label: "Cancelled",
    color: "#334155",
    bg:    "#f1f5f9",
    turn:  null,
  },
};
