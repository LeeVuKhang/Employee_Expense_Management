import { NavLink, useNavigate } from "react-router-dom";

const AUTH_STORAGE_KEY = "eem.auth.user";

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

function inferRole(activePage, navItems) {
  const labels = [activePage, ...(navItems ?? []).map((item) => item.label)].join(" ");

  if (/finance/i.test(labels)) return "Finance";
  if (/manager|team requests/i.test(labels)) return "Manager";
  return "Employee";
}

export default function Navbar({
  activePage = "My Requests",
  navItems,
  onNavigate,
  role,
}) {
  const navigate = useNavigate();
  const currentRole = role ?? inferRole(activePage, navItems);
  const items = navItems ?? ROLE_NAV_ITEMS[currentRole] ?? ROLE_NAV_ITEMS.Employee;

  function handleLogout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event("eem:logout"));
    navigate("/login", { replace: true });
  }

  return (
    <header className="navbar">
      <div className="navbar-left">
        <NavLink className="navbar-brand" to="/my-requests">
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
          <span className="navbar-role-name">{currentRole}</span>
          <span className="navbar-role-label">Active Role</span>
        </div>
        <button className="navbar-logout" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
