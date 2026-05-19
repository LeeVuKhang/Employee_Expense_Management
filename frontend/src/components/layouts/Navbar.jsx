// components/layout/Navbar.jsx
// Sticky top navigation bar — standalone component

const DEFAULT_NAV_ITEMS = [
  { label: "My Requests", href: "/my-requests", active: true },
  { label: "New Request", href: "/new-request", active: false },
];

export default function Navbar({ activePage = "My Requests", navItems = DEFAULT_NAV_ITEMS }) {
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
        {navItems.map(({ label, icon }) => {
          const isActive = label === activePage;
          return (
            <button
              key={label}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: isActive ? "#EFF6FF" : "transparent",
                color: isActive ? "#2563EB" : "#6B7280",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "#F3F4F6";
                  e.currentTarget.style.color = "#374151";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#6B7280";
                }
              }}
            >
              {label}
            </button>
          );
        })}
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
