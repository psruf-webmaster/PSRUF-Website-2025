import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const MEMBER_STATUS = ["all", "active", "inactive", "probation", "seniorStatus", "scholarship", "co-op", "dropped", "pending", "approved", "rejected"];

function isOverviewAllowed(user) {
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  return roles.some(r => ["exec", "webmaster", "webdev"].includes(r));
}

export default function PointsOverview() {
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const allowed = isOverviewAllowed(user);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoverRow, setHoverRow] = useState(null);

  const headers = useMemo(() => (
    userId ? { Authorization: `Bearer ${userId}` } : undefined
  ), [userId]);

  const load = async (pageNum = page) => {
    if (!allowed) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.append("memberStatus", status);
      if (q) params.append("q", q);
      params.append("page", pageNum);
      params.append("limit", limit);
      const res = await fetch(`/api/ledger/overview?${params.toString()}`, {
        headers,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load points");
      setRows(data.rows || []);
      setPage(data.page || 1);
      setLimit(data.limit || limit);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (!allowed) {
    return <div style={{ padding: 24 }}>Not authorized.</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 12 }}>Points Overview</h1>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={styles.input}>
          {MEMBER_STATUS.map(s => (
            <option key={s} value={s}>{s === "all" ? "All Statuses" : s}</option>
          ))}
        </select>
        <input
          placeholder="Search name"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={styles.input}
        />
        <button
          style={styles.secondaryBtn}
          onClick={() => {
            const header = ["User", "Status", "PHI", "SIGMA", "RHO", "TAU", "Any", "Total"];
            const lines = [header.join(",")];
            rows.forEach(r => {
              lines.push([
                `${r.firstName} ${r.lastName}`,
                (r.memberStatus || []).join('|'),
                r.totals?.phi || 0,
                r.totals?.sigma || 0,
                r.totals?.rho || 0,
                r.totals?.tau || 0,
                r.totals?.any || 0,
                r.totals?.total || 0,
              ].join(","));
            });
            const blob = new Blob([lines.join("\n")], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "points-overview.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>PHI</th>
                <th style={styles.th}>SIGMA</th>
                <th style={styles.th}>RHO</th>
                <th style={styles.th}>TAU</th>
                <th style={styles.th}>Any</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Meets</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td style={styles.td} colSpan={8}>No members found</td></tr>
              )}
              {rows.map(r => (
                <tr
                  key={r.userId}
                  style={{ borderTop: "1px solid #e5e7eb" }}
                  onMouseEnter={() => setHoverRow(r)}
                  onMouseLeave={() => setHoverRow(null)}
                >
                  <td style={styles.td}>{r.firstName} {r.lastName}</td>
                  <td style={styles.td}>{(r.memberStatus || []).join(', ')}</td>
                  <td style={styles.td}>{r.totals?.phi || 0}</td>
                  <td style={styles.td}>{r.totals?.sigma || 0}</td>
                  <td style={styles.td}>{r.totals?.rho || 0}</td>
                  <td style={styles.td}>{r.totals?.tau || 0}</td>
                  <td style={styles.td}>{r.totals?.any || 0}</td>
                  <td style={styles.td}>{r.totals?.total || 0}</td>
                  <td style={styles.td}>{r.requirements?.metAll ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hoverRow && (
            <div style={styles.tooltip}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{hoverRow.firstName} {hoverRow.lastName}</div>
              {["phi","sigma","rho","tau","any"].map(cat => {
                const have = hoverRow.requirements?.buckets?.[cat]?.have;
                const anyHave = hoverRow.any?.have;
                const totalVal = hoverRow.totals?.[cat];
                const value = have ?? anyHave ?? totalVal ?? 0;
                const need = hoverRow.requirements?.buckets?.[cat]?.need;
                return (
                  <div key={cat} style={{ fontSize: 12 }}>
                    {cat.toUpperCase()}: {value}
                    {need != null && ` (need ${need})`}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
        <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p); }}>Prev</button>
        <div>Page {page} / {totalPages}</div>
        <button style={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); load(p); }}>Next</button>
      </div>
    </div>
  );
}

const styles = {
  input: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  th: { padding: 8, fontSize: 13 },
  td: { padding: 8, fontSize: 13 },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
  },
  tooltip: {
    position: "fixed",
    right: 20,
    bottom: 20,
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    minWidth: 200,
    zIndex: 50,
  }
};
