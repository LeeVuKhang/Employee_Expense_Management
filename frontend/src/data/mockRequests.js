// src/data/mockRequests.js
// Single source of truth cho STATUS_CONFIG.
// Keys phải khớp CHÍNH XÁC với giá trị ENUM request_status trong DB (EEM.sql):
//   'Draft' | 'Pending Manager' | 'Pending Finance' | 'Finance Approved' | 'Paid' | 'Rejected' | 'Cancelled'

export const STATUS_CONFIG = {
  "Draft": {
    label: "Draft",
    color: "#3B82F6",
    bg:    "#EFF6FF",
    turn:  null,
  },
  "Pending Manager": {
    label: "Pending Manager",
    color: "#D97706",
    bg:    "#FFFBEB",
    turn:  "Manager",
  },
  "Pending Finance": {
    label: "Pending Finance",
    color: "#7C3AED",
    bg:    "#F5F3FF",
    turn:  "Finance",
  },
  "Finance Approved": {
    label: "Finance Approved",
    color: "#0891B2",
    bg:    "#ECFEFF",
    turn:  null,
  },
  "Paid": {
    label: "Paid",
    color: "#059669",
    bg:    "#ECFDF5",
    turn:  null,
  },
  "Rejected": {
    label: "Rejected",
    color: "#DC2626",
    bg:    "#FEF2F2",
    turn:  null,
  },
  "Cancelled": {
    label: "Cancelled",
    color: "#6B7280",
    bg:    "#F3F4F6",
    turn:  null,
  },
};
