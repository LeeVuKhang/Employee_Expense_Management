const AUTH_STORAGE_KEY = "eem.auth.user";

function readStoredUser() {
  try {
    const rawUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

export default function RoleGuard({ allowedRoles = [], children }) {
  const user = readStoredUser();

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
}