import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ROLE_NAV_ITEMS = {
  Employee: [
    { label: "My Requests", href: "/my-requests" },
    { label: "New Request", href: "/new-request" },
  ],
  Manager: [
    { label: "Team Requests", href: "/manager/pending-requests", page: "Manager Pending" },
  ],
  Finance: [
    { label: "Finance Approvals", href: "/finance" },
  ],
};

function dashboardForRole(role) {
  if (role === "Manager") return "/manager/pending-requests";
  if (role === "Finance") return "/finance";
  return "/my-requests";
}

export default function Navbar({
  activePage = "My Requests",
  navItems,
  onNavigate,
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentRole = user?.role ?? "Employee";
  const items = navItems ?? ROLE_NAV_ITEMS[currentRole] ?? ROLE_NAV_ITEMS.Employee;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <NavLink className="navbar-brand" to={dashboardForRole(currentRole)}>
          <span className="navbar-logo">E</span>
          <span className="navbar-brand-text">Expensify</span>
        </NavLink>

        <nav className="navbar-links" aria-label="Primary navigation">
          {items.map(({ label, href, page, active }) => (
            <NavLink
              key={`${label}-${href}`}
              to={href}
              onClick={(event) => {
                if (onNavigate) {
                  event.preventDefault();
                  onNavigate(page ?? label);
                }
              }}
              className={({ isActive }) => {
                const activeLink = active || isActive || label === activePage || page === activePage;
                return `navbar-link${activeLink ? " navbar-link-active" : ""}`;
              }}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="navbar-user">
        <div className="navbar-role" aria-label="Current role">
          <span className="navbar-role-name">{user?.full_name ?? currentRole}</span>
          <span className="navbar-role-label">{currentRole}</span>
        </div>
        <button
          className="navbar-logout"
          type="button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
