import { useMemo, useState } from "react";

const DEMO_USERS = [
  {
    role: "Employee",
    fullName: "Employee Demo",
    email: "employee@eem.local",
    password: "demo123",
  },
  {
    role: "Manager",
    fullName: "Manager Demo",
    email: "manager@eem.local",
    password: "demo123",
  },
  {
    role: "Finance",
    fullName: "Finance Demo",
    email: "finance@eem.local",
    password: "demo123",
  },
];

function resolveUser(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const demoUser = DEMO_USERS.find((user) => user.email === normalizedEmail);

  return demoUser ?? {
    role: "Employee",
    fullName: "Employee Demo",
    email: normalizedEmail || "employee@eem.local",
  };
}

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password],
  );

  function submitLogin(event) {
    event.preventDefault();
    if (!canSubmit) return;

    onLogin(resolveUser(email));
  }

  function handleDemoUser(user) {
    setEmail(user.email);
    setPassword(user.password);
    onLogin({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
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
              Sign in
            </button>
          </form>

          <div className="demo-access">
            <p>Demo Access</p>
            <div className="demo-access-grid">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.role}
                  type="button"
                  onClick={() => handleDemoUser(user)}
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
