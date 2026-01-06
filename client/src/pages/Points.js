import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CAT_OPTIONS = ["all", "phi", "sigma", "rho", "tau", "any"];
const POINT_MAX = 50;

function Circle({ label, value, onClick }) {
  const pct = Math.max(0, Math.min(1, value / POINT_MAX));
  const angle = pct * 360;
  const bg = `conic-gradient(#6d2c2c ${angle}deg, #e5e7eb ${angle}deg 360deg)`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={onClick}>
      <div style={{
        width: 70,
        height: 70,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#222",
        fontWeight: 600,
        fontSize: 13,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: "#4b5563" }}>{Math.round(value)} / {POINT_MAX}</div>
    </div>
  );
}

export default function Points() {
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const location = useLocation();
  const navigate = useNavigate();
  const qs = new URLSearchParams(location.search);
  const initialCat = (qs.get("category") || "all").toLowerCase();

  const [category, setCategory] = useState(CAT_OPTIONS.includes(initialCat) ? initialCat : "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [totals, setTotals] = useState({ phi: 0, sigma: 0, rho: 0, tau: 0, any: 0, grand: 0 });
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [error, setError] = useState("");
  const [reqs, setReqs] = useState(null);

  const headers = useMemo(() => (
    userId ? { Authorization: `Bearer ${userId}` } : undefined
  ), [userId]);

  const loadTotals = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category !== "all" && category !== "any") params.append("category", category);
      const res = await fetch(`/api/ledger/summary/self?${params.toString()}`, { headers, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load totals");
      const row = (data.totals || [])[0] || {};
      const byCat = row.totalsByCategory || {};
      const grand = row.grandTotal || 0;
      const cats = {
        phi: byCat.phi || 0,
        sigma: byCat.sigma || 0,
        rho: byCat.rho || 0,
        tau: byCat.tau || 0,
      };
      const any = Math.max(0, grand - (cats.phi + cats.sigma + cats.rho + cats.tau));
      setTotals({ ...cats, any, grand });
    } catch (e) {
      setError(e.message);
      setTotals({ phi: 0, sigma: 0, rho: 0, tau: 0, any: 0, grand: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadRequirements = async () => {
    try {
      const res = await fetch('/api/requirements/active/self', { headers, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load requirements");
      setReqs(data);
    } catch (e) {
      setReqs(null);
      setError(prev => prev || e.message);
    }
  };

  const loadEntries = async (pageNum = page) => {
    setLoadingEntries(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.append("category", category === "any" ? "" : category);
      if (from) params.append("from", from);
      if (to) params.append("to", to);
      if (q) params.append("q", q);
      params.append("page", pageNum);
      params.append("limit", limit);
      const res = await fetch(`/api/ledger/entries/self?${params.toString()}`, { headers, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load entries");
      setEntries(data.entries || []);
      setPage(data.page || 1);
      setLimit(data.limit || limit);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadTotals();
      loadRequirements();
      loadEntries(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, from, to, q, userId]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const circleData = [
    { label: "Phi", key: "phi" },
    { label: "Sigma", key: "sigma" },
    { label: "Rho", key: "rho" },
    { label: "Tau", key: "tau" },
    { label: "Any", key: "any" },
  ];

  const handleCircleClick = (key) => {
    setCategory(key === "any" ? "any" : key);
    const params = new URLSearchParams(location.search);
    params.set("category", key);
    navigate({ pathname: "/points", search: params.toString() });
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>My Points</h1>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={category} onChange={e => setCategory(e.target.value)} style={styles.input}>
          {CAT_OPTIONS.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c.toUpperCase()}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={styles.input} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={styles.input} />
        <input
          placeholder="Search note"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>My Totals</div>
        {loading ? (
          <div>Loading totals...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 14 }}>
            {circleData.map(c => (
              <Circle
                key={c.key}
                label={c.label}
                value={totals[c.key] || 0}
                onClick={() => handleCircleClick(c.key)}
              />
            ))}
          </div>
        )}
      </div>

      {reqs && (
        <div style={{ marginBottom: 20, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Requirements</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {["phi","sigma","rho","tau"].map(cat => (
              <div key={cat} style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <div style={{ fontWeight: 600, textTransform: "uppercase" }}>{cat}</div>
                <div style={{ fontSize: 12, color: "#4b5563" }}>
                  Have: {reqs.requirements?.buckets?.[cat]?.have || 0} / {reqs.requirements?.minPerCategory}
                </div>
                <div style={{ fontSize: 12, color: reqs.requirements?.buckets?.[cat]?.met ? "green" : "red" }}>
                  {reqs.requirements?.buckets?.[cat]?.met ? "Met" : `Need ${reqs.requirements?.buckets?.[cat]?.need || 0}`}
                </div>
              </div>
            ))}
            <div style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <div style={{ fontWeight: 600 }}>Any</div>
              <div style={{ fontSize: 12, color: "#4b5563" }}>
                Have: {reqs.any?.have || 0} / {reqs.requirements?.minPerCategory}
              </div>
              <div style={{ fontSize: 12, color: reqs.any?.met ? "green" : "red" }}>
                {reqs.any?.met ? "Met" : `Need ${reqs.any?.need || 0}`}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            Overall: {reqs.requirements?.metAll ? "Meets requirements" : "Needs more points"}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>History</div>
        {loadingEntries ? (
          <div>Loading history...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Points</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Event</th>
                  <th style={styles.th}>Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td style={styles.td} colSpan={6}>No entries</td></tr>
                )}
                {entries.map(e => (
                  <tr key={e._id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={styles.td}>{new Date(e.createdAt).toLocaleString()}</td>
                    <td style={styles.td}>{e.category?.toUpperCase()}</td>
                    <td style={styles.td}>{e.points}</td>
                    <td style={styles.td}>{e.source}</td>
                    <td style={styles.td}>{e.eventTitle || ""}</td>
                    <td style={styles.td}>{e.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadEntries(p); }}>Prev</button>
          <div>Page {page} / {Math.max(1, Math.ceil(total / limit))}</div>
          <button style={styles.secondaryBtn} disabled={page >= Math.max(1, Math.ceil(total / limit))} onClick={() => { const p = Math.min(Math.max(1, Math.ceil(total / limit)), page + 1); setPage(p); loadEntries(p); }}>Next</button>
        </div>
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
};
