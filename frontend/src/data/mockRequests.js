// src/data/mockRequests.js

export const CURRENT_USER_ID = "user_001";

/**
 * STATUS_CONFIG — single source of truth for badge colors, labels, and turn indicators.
 *
 *  draft            → Blue   (#3B82F6)
 *  pending_manager  → Amber  (#D97706)
 *  pending_finance  → Purple (#7C3AED)
 *  paid             → Green  (#059669)
 *  rejected         → Red    (#DC2626)
 */
export const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "#3B82F6",
    bg: "#EFF6FF",
    turn: null,
  },
  pending_manager: {
    label: "Pending Manager",
    color: "#D97706",
    bg: "#FFFBEB",
    turn: "Manager",
  },
  pending_finance: {
    label: "Pending Finance",
    color: "#7C3AED",
    bg: "#F5F3FF",
    turn: "Finance",
  },
  paid: {
    label: "Paid",
    color: "#059669",
    bg: "#ECFDF5",
    turn: null,
  },
  rejected: {
    label: "Rejected",
    color: "#DC2626",
    bg: "#FEF2F2",
    turn: null,
  },
};

export const mockRequests = [
  {
    id: "EXP-2024-001",
    ownerId: "user_001",
    category: "Travel",
    description: "Round-trip flight to Ho Chi Minh City for client meeting",
    amount: 320.5,
    status: "paid",
    submittedDate: "2024-03-10",
    tripDateFrom: "2024-03-15",
    tripDateTo: "2024-03-17",
  },
  {
    id: "EXP-2024-002",
    ownerId: "user_001",
    category: "Meals & Entertainment",
    description: "Team dinner after Q1 review presentation",
    amount: 185.0,
    status: "pending_manager",
    submittedDate: "2024-04-02",
    tripDateFrom: "2024-04-01",
    tripDateTo: "2024-04-01",
  },
  {
    id: "EXP-2024-003",
    ownerId: "user_001",
    category: "Office Supplies",
    description: "Ergonomic keyboard and mouse for home office setup",
    amount: 97.99,
    status: "pending_finance",
    submittedDate: "2024-04-15",
    tripDateFrom: "2024-04-15",
    tripDateTo: "2024-04-15",
  },
  {
    id: "EXP-2024-004",
    ownerId: "user_001",
    category: "Software",
    description: "Annual Figma Professional license renewal",
    amount: 144.0,
    status: "draft",
    submittedDate: "2024-04-20",
    tripDateFrom: "2024-04-20",
    tripDateTo: "2024-04-20",
  },
  {
    id: "EXP-2024-005",
    ownerId: "user_001",
    category: "Travel",
    description: "Hotel accommodation — Hanoi tech conference (3 nights)",
    amount: 450.0,
    status: "rejected",
    submittedDate: "2024-03-25",
    tripDateFrom: "2024-04-05",
    tripDateTo: "2024-04-08",
  },
  {
    id: "EXP-2024-006",
    ownerId: "user_001",
    category: "Other",
    description: "Parking fees during client site visits",
    amount: 42.0,
    status: "paid",
    submittedDate: "2024-04-18",
    tripDateFrom: "2024-04-10",
    tripDateTo: "2024-04-18",
  },
  {
    id: "EXP-2024-007",
    ownerId: "user_002",
    category: "Travel",
    description: "Flight to Da Nang for regional partner summit",
    amount: 275.0,
    status: "pending_manager",
    submittedDate: "2024-04-22",
    tripDateFrom: "2024-04-28",
    tripDateTo: "2024-04-30",
  },
];
