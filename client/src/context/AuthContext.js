import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("psr_user")) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (email, password) => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Login failed");
      setUser(data.user);
      localStorage.setItem("psr_user", JSON.stringify(data.user));
      return data.user;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("psr_user");
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem("psr_user", JSON.stringify(nextUser));
  };

  return (
    <AuthCtx.Provider value={{ user, loading, error, login, logout, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}
