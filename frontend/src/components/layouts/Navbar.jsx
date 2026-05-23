// components/layout/Navbar.jsx
// Sticky top navigation bar — standalone component

import { NavLink } from "react-router-dom";

const DEFAULT_NAV_ITEMS = [
  { label: "My Requests", href: "/my-requests" },
  { label: "New Request", href: "/new-request" },
];

export default function Navbar({
  activePage = "My Requests",
  navItems = DEFAULT_NAV_ITEMS,
  onNavigate,
}) {
  return (
    <nav
      style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: "#2563EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            fontWeight: 800,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          E
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "#111827",
            letterSpacing: "-0.2px",
          }}
        >
          Expensify
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", gap: 4 }}>
        {navItems.map(({ label, href }) => (
          <NavLink
            key={label}
            to={href}
            onClick={(event) => {
              if (onNavigate) {
                event.preventDefault();
                onNavigate(label);
              }
            }}
            style={({ isActive }) => {
              const active = isActive || label === activePage;

              return {
                padding: "6px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: active ? "#EFF6FF" : "transparent",
                color: active ? "#2563EB" : "#6B7280",
                textDecoration: "none",
                transition: "all 0.15s ease",
              };
            }}
            onMouseEnter={(e) => {
              if (label !== activePage) {
                e.currentTarget.style.backgroundColor = "#F3F4F6";
                e.currentTarget.style.color = "#374151";
              }
            }}
            onMouseLeave={(e) => {
              if (label !== activePage) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#6B7280";
              }
            }}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* User avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          backgroundColor: "#DBEAFE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "#2563EB",
          cursor: "pointer",
          border: "2px solid #BFDBFE",
        }}
        title="John Doe"
      >
        JD
      </div>
    </nav>
  );
}
