/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from "react";
import { loginUser } from "../api/auth";

const AuthContext = createContext(null);
const AUTH_USER_STORAGE_KEY = "eem.auth.user";
const AUTH_TOKEN_STORAGE_KEY = "eem.auth.token";

function readStoredUser() {
  try {
    const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

function readStoredToken() {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function getAuthToken() {
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function clearAuthStorage() {
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser());
  const [token, setToken] = useState(() => readStoredToken());

  async function login(email, password) {
    const data = await loginUser(email, password);
    const nextUser = data.user;
    const nextToken = data.access_token;

    setUser(nextUser);
    setToken(nextToken);
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(nextUser));
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, nextToken);

    return nextUser;
  }

  function logout() {
    setUser(null);
    setToken(null);
    clearAuthStorage();
  }

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated: Boolean(user && token),
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return value;
}
