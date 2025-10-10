import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      nav("/dashboard", { replace: true });
    } catch {}
  };

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Sign in</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email" placeholder="Personal email"
          value={email} onChange={e=>setEmail(e.target.value)}
          required style={{ padding: 10 }}
        />
        <input
          type="password" placeholder="Password"
          value={password} onChange={e=>setPassword(e.target.value)}
          required style={{ padding: 10 }}
        />
        <button disabled={loading} style={{ padding: 10 }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && <div style={{ color: "crimson" }}>{error}</div>}
      </form>
      <div style={{ marginTop: 12 }}>
        Don’t have an account? <Link to="/signup">Sign up</Link>
      </div>
    </div>
  );
}
