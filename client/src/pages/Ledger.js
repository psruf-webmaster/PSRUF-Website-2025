import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["all", "phi", "sigma", "rho", "tau"];

function useOfficer(user) {
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  return roles.some(r => ["officer", "exec", "webmaster", "webdev"].includes(r));
}

export default function Ledger() {
  const { user } = useAuth();
  const isOfficer = useOfficer(user);
  const userId = user?._id || user?.id;

  const [summary, setSummary] = useState([]);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [category, setCategory] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ userId: "", category: "phi", points: "", note: "" });
  const [error, setError] = useState("");

  const headers = useMemo(() => (
    userId ? { Authorization: `Bearer ${userId}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" }
  ), [userId]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users/approved', { headers, credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
      /* ignore */
    }
  };

  const loadSummary = async () => {
    setError("");
    const params = new URLSearchParams();
    if (category !== "all") params.append("category", category);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (userFilter) params.append("userId", userFilter);
    const res = await fetch(`/api/ledger/summary?${params.toString()}`, { headers, credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load summary");
    setSummary(data.totals || []);
  };

  const loadEntries = async (pageNum = page) => {
    setError("");
    const params = new URLSearchParams();
    if (category !== "all") params.append("category", category);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (userFilter) params.append("userId", userFilter);
    params.append("page", pageNum);
    params.append("limit", limit);
    const res = await fetch(`/api/ledger?${params.toString()}`, { headers, credentials: "include" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load entries");
    setEntries(data.entries || []);
    setPage(data.page || 1);
    setLimit(data.limit || limit);
    setTotal(data.total || 0);
  };

  useEffect(() => {
    if (!isOfficer) return;
    loadUsers();
  }, [isOfficer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOfficer) return;
    (async () => {
      try {
        await loadSummary();
        await loadEntries(1);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [category, from, to, userFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        userId: manualForm.userId,
        category: manualForm.category,
        points: Number(manualForm.points),
        note: manualForm.note,
      };
      const res = await fetch('/api/ledger/manual', {
        method: 'POST',
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add manual entry");
      setManualOpen(false);
      setManualForm({ userId: "", category: "phi", points: "", note: "" });
      await loadSummary();
      await loadEntries(1);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!isOfficer) {
    return <div style={{ padding: 24 }}>Not authorized.</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Points Ledger</h1>
        <button style={styles.primaryBtn} onClick={() => setManualOpen(true)}>Add Manual Adjustment</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={category} onChange={e => setCategory(e.target.value)} style={styles.input}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.toUpperCase()}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={styles.input} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={styles.input} />
        <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={styles.input}>
          <option value="">All Users</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "12px 0" }}>Totals</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                <th style={styles.th}>User</th>
                <th style={styles.th}>PHI</th>
                <th style={styles.th}>SIGMA</th>
                <th style={styles.th}>RHO</th>
                <th style={styles.th}>TAU</th>
                <th style={styles.th}>Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 && (
                <tr><td style={styles.td} colSpan={6}>No totals</td></tr>
              )}
              {summary.map(row => (
                <tr key={row.userId} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={styles.td}>{row.firstName} {row.lastName}</td>
                  <td style={styles.td}>{row.totalsByCategory?.phi || 0}</td>
                  <td style={styles.td}>{row.totalsByCategory?.sigma || 0}</td>
                  <td style={styles.td}>{row.totalsByCategory?.rho || 0}</td>
                  <td style={styles.td}>{row.totalsByCategory?.tau || 0}</td>
                  <td style={styles.td}>{row.grandTotal || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 style={{ margin: "12px 0" }}>Entries</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Points</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td style={styles.td} colSpan={7}>No entries</td></tr>
              )}
              {entries.map(e => (
                <tr key={e._id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={styles.td}>{new Date(e.createdAt).toLocaleString()}</td>
                  <td style={styles.td}>{e.user ? `${e.user.firstName || ''} ${e.user.lastName || ''}` : ''}</td>
                  <td style={styles.td}>{e.category?.toUpperCase()}</td>
                  <td style={styles.td}>{e.points}</td>
                  <td style={styles.td}>{e.source}</td>
                  <td style={styles.td}>{e.event ? e.event.title : ''}</td>
                  <td style={styles.td}>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadEntries(p); }}>Prev</button>
          <div>Page {page} / {totalPages}</div>
          <button style={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); loadEntries(p); }}>Next</button>
        </div>
      </div>

      {manualOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Add Manual Adjustment</h3>
              <button style={styles.secondaryBtn} onClick={() => setManualOpen(false)}>Close</button>
            </div>
            <form onSubmit={handleManualSubmit}>
              <div style={styles.field}>
                <label>User</label>
                <select
                  value={manualForm.userId}
                  onChange={e => setManualForm(f => ({ ...f, userId: e.target.value }))}
                  required
                  style={styles.input}
                >
                  <option value="">Select user</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label>Category</label>
                <select
                  value={manualForm.category}
                  onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))}
                  style={styles.input}
                >
                  {["phi", "sigma", "rho", "tau"].map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label>Points (can be negative)</label>
                <input
                  type="number"
                  value={manualForm.points}
                  onChange={e => setManualForm(f => ({ ...f, points: e.target.value }))}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label>Note</label>
                <textarea
                  value={manualForm.note}
                  onChange={e => setManualForm(f => ({ ...f, note: e.target.value }))}
                  required
                  rows={3}
                  style={styles.textarea}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" style={styles.secondaryBtn} onClick={() => setManualOpen(false)}>Cancel</button>
                <button type="submit" style={styles.primaryBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#5b3ca5",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
  },
  input: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  textarea: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    resize: "vertical",
  },
  th: { padding: 8, fontSize: 13 },
  td: { padding: 8, fontSize: 13 },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 12,
  },
  modalCard: {
    background: "white",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
  },
  field: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 },
};
