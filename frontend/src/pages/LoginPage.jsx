import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const DEMO_USERS = [
  {
    role: "Employee",
    fullName: "Employee Demo",
    email: "employee@eem.local",
  },
  {
    role: "Manager",
    fullName: "Manager Demo",
    email: "manager@eem.local",
  },
  {
    role: "Finance",
    fullName: "Finance Demo",
    email: "finance@eem.local",
  },
];

function dashboardForRole(role) {
  if (role === "Manager") return "/manager/pending-requests";
  if (role === "Finance") return "/finance";
  return "/my-requests";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !loading,
    [email, loading, password],
  );

  async function submitLogin(event) {
    event.preventDefault();
    if (!canSubmit) return;

    await runLogin(email, password);
  }

  async function runLogin(nextEmail, nextPassword) {
    setError("");
    setLoading(true);

    try {
      const user = await login(nextEmail, nextPassword);
      navigate(dashboardForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoUser(user) {
    setEmail(user.email);
    setPassword("demo123");
    await runLogin(user.email, "demo123");
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Sign in to Expensify">
        <div className="login-form">
          <div className="login-brand">
            <span className="login-logo">E</span>
            <span>Expensify</span>
          </div>

          <div className="login-heading">
            <h1>Sign in to your account</h1>
            <p>Securely manage your expenses and approvals.</p>
          </div>

          <form className="login-form-fields" onSubmit={submitLogin}>
            <label className="login-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </label>

            <label className="login-field">
              <span className="login-password-row">
                <span>Password</span>
                <a href="#forgot-password">Forgot password?</a>
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>

            <button className="login-submit" type="submit" disabled={!canSubmit}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {error && (
              <p className="modal-error-text" role="alert">
                {error}
              </p>
            )}
          </form>

          <div className="demo-access">
            <p>Demo Access</p>
            <div className="demo-access-grid">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.role}
                  type="button"
                  onClick={() => handleDemoUser(user)}
                  disabled={loading}
                >
                  {user.role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="login-hero" aria-label="Expense management overview">
          <div className="login-hero-content">
            <div>
              <p className="login-hero-kicker">EEM</p>
              <h2>Enterprise-grade expense management.</h2>
              <p>
                Streamline approvals, keep spend visible, and help every team
                resolve reimbursements with confidence.
              </p>
              <ul>
                <li>Role-based access control</li>
                <li>Automated approval workflows</li>
                <li>Real-time expense tracking</li>
              </ul>
            </div>

            <blockquote>
              <p>"Expensify transformed how our finance team operates."</p>
              <cite>CFO, Acme Corp</cite>
            </blockquote>
          </div>
        </aside>
      </section>
    </main>
  );
}
