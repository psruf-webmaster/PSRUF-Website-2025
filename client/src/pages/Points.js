import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Award, CalendarDays, Search, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import "./Points.css";

const CAT_OPTIONS = ["all", "phi", "sigma", "rho", "tau", "any"];
const POINT_MAX = 50;
const CATEGORY_META = {
  phi: { label: "Phi", color: "#D4608A" }, 
  sigma: { label: "Sigma", color: "#6D2C2C" }, 
  rho: { label: "Rho", color: "#A04E74" }, 
  tau: { label: "Tau", color: "#BC6E8E" }, 
  any: { label: "Extra", color: "#C47878" }, 
};

function getCategoryMeta(category) {
  return CATEGORY_META[category] || { label: category?.toUpperCase?.() || "General", color: "#6D2C2C" };
}

function Circle({ label, value, index }) {
  const pct = Math.max(0, Math.min(1, value / POINT_MAX));
  const angle = pct * 360;
  const bg = `conic-gradient(#6D2C2C ${angle}deg, #ECE9F1 ${angle}deg 360deg)`;
  
  return (
    <motion.div 
      className="points-circle"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 + (index * 0.1) }}
      whileHover={{ scale: 1.08 }}
    >
      <div
        className="points-circle-ring"
        style={{ background: bg }}
      >
        {label}
      </div>
      <div className="points-circle-value">{Math.round(value)} / {POINT_MAX}</div>
    </motion.div>
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
      const res = await fetch(`/api/ledger/summary/self`, { headers, credentials: "include" });
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
      
      const coreCapped = Math.min(cats.phi, POINT_MAX) + 
                         Math.min(cats.sigma, POINT_MAX) + 
                         Math.min(cats.rho, POINT_MAX) + 
                         Math.min(cats.tau, POINT_MAX);
                         
      const any = Math.max(0, grand - coreCapped);
      
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (category !== "all") {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    navigate({ pathname: "/points", search: params.toString() }, { replace: true });
  }, [category, navigate, location.search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const minPerCategory = reqs?.requirements?.minPerCategory || POINT_MAX;
  const totalRequired = minPerCategory * 5;

  const effectiveTotal = Math.min(totals.phi, minPerCategory) + 
                         Math.min(totals.sigma, minPerCategory) + 
                         Math.min(totals.rho, minPerCategory) + 
                         Math.min(totals.tau, minPerCategory) + 
                         Math.min(totals.any, minPerCategory);
                         
  const percentComplete = totalRequired > 0 ? Math.round((effectiveTotal / totalRequired) * 100) : 0;
  const safePercent = Math.max(0, Math.min(100, percentComplete));

  const circleData = [
    { label: "Phi", key: "phi" },
    { label: "Sigma", key: "sigma" },
    { label: "Rho", key: "rho" },
    { label: "Tau", key: "tau" },
    { label: "Extra", key: "any" },
  ];

  return (
    <div className="points-page">
      <header className="points-header">
        <h1>My Points</h1>
        <p>Track your semester progress and requirements.</p>
      </header>

      {error && <div className="points-error">{error}</div>}

      <motion.section 
        className="points-filter-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        whileHover={{ boxShadow: '0 18px 40px rgba(29, 20, 32, 0.09)' }}
      >
        <div className="points-filter-grid">
          <label>
            Category
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CAT_OPTIONS.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : getCategoryMeta(c).label}</option>)}
            </select>
          </label>
          <label>
            From
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </label>
          <label>
            Search Notes
            <div className="points-search-wrap">
              <Search size={16} />
              <input
                placeholder="Find by note or source"
                value={q}
                onChange={e => setQ(e.target.value)}
              />
            </div>
          </label>
        </div>
      </motion.section>

      <div className="points-grid">
        <section className="points-main-column">
          <motion.article 
            className="points-card points-total-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            whileHover={{ y: -2, boxShadow: '0 18px 40px rgba(29, 20, 32, 0.09)' }}
          >
            <div className="points-card-head">
              <div className="points-total-headline">
                <span className="points-icon-wrap">
                  <Award size={18} />
                </span>
                <div>
                  <h2>{totals.grand} Points</h2>
                  <p>{totalRequired} required this semester</p>
                </div>
              </div>
              <span className="points-semester-pill">Current Semester</span>
            </div>

            <div className="points-master-progress">
              <div className="points-master-progress-track">
                <motion.div 
                  className="points-master-progress-fill" 
                  initial={{ width: 0 }}
                  animate={{ width: `${safePercent}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                />
              </div>
              <span>{percentComplete}% complete</span>
            </div>

            {loading ? (
              <div className="points-loading">Loading totals...</div>
            ) : (
              <div className="points-circle-grid">
                {circleData.map((c, index) => (
                  <Circle
                    key={c.key}
                    label={c.label}
                    value={totals[c.key] || 0}
                    index={index}
                  />
                ))}
              </div>
            )}
          </motion.article>

          <motion.article 
            className="points-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
            <div className="points-card-head">
              <h3>
                <span>
                  <CalendarDays size={18} />
                </span>
                Points History
              </h3>
            </div>

            {loadingEntries ? (
              <div className="points-loading">Loading history...</div>
            ) : (
              <div className="points-table-wrap">
                <table className="points-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Category</th>
                      <th>Points</th>
                      <th>Date</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 && (
                      <tr><td colSpan={5} className="points-empty-cell">No entries yet</td></tr>
                    )}
                    {entries.map((e, index) => {
                      const meta = getCategoryMeta(e.category);
                      return (
                        <motion.tr 
                          key={e._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 + 0.3, ease: "easeOut" }}
                          whileHover={{ backgroundColor: 'rgba(125, 52, 52, 0.03)' }}
                        >
                          <td>{e.eventTitle || e.source || "Manual Entry"}</td>
                          <td>
                            <span className="points-category-pill" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                              {meta.label}
                            </span>
                          </td>
                          <td className="points-score-cell">+{e.points}</td>
                          <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                          <td>{e.note || "-"}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="points-pagination">
              <button
                type="button"
                className="points-page-btn"
                disabled={page <= 1}
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  loadEntries(p);
                }}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                type="button"
                className="points-page-btn"
                disabled={page >= totalPages}
                onClick={() => {
                  const p = Math.min(totalPages, page + 1);
                  setPage(p);
                  loadEntries(p);
                }}
              >
                Next
              </button>
            </div>
          </motion.article>
        </section>

        <aside className="points-side-column">
          {reqs && (
            <motion.article 
              className="points-card points-requirements-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            >
              <div className="points-card-head">
                <h3>
                  <TrendingUp size={18} style={{ marginRight: "8px" }} />
                  Requirements
                </h3>
              </div>
              <div className="points-req-list">
                {["phi", "sigma", "rho", "tau", "any"].map((cat, index) => {
                  const have = cat === "any" ? (totals.any || 0) : (reqs.requirements?.buckets?.[cat]?.have ?? totals[cat] ?? 0);
                  const met = cat === "any" ? (have >= minPerCategory) : (reqs.requirements?.buckets?.[cat]?.met ?? (have >= minPerCategory));
                  const need = Math.max(0, minPerCategory - have);
                  const percent = Math.max(0, Math.min(100, (have / Math.max(1, minPerCategory)) * 100));
                  const meta = getCategoryMeta(cat);
                  
                  return (
                    <motion.div 
                      key={cat} 
                      className="points-req-item"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.1, ease: "easeOut" }}
                      whileHover={{ x: 2 }}
                    >
                      <div className="points-req-line">
                        <span>{meta.label}</span>
                        <span>{have} / {minPerCategory}</span>
                      </div>
                      <div className="points-req-track">
                        <motion.div 
                          className="points-req-fill" 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1, delay: 0.4 + index * 0.1, ease: "easeOut" }}
                          style={{ backgroundColor: meta.color }} 
                        />
                      </div>
                      <div className="points-req-copy" style={{ color: met ? "#127a4b" : "#7d3434" }}>
                        {met ? "Requirement met" : `${need} points to go!`}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.article>
          )}

          <motion.article 
            className="points-card points-callout-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            whileHover={{ y: -2, boxShadow: '0 18px 40px rgba(125, 52, 52, 0.18)' }}
          >
            <span className="points-icon-wrap">
              <Award size={18} />
            </span>
            <h4>{reqs?.requirements?.metAll ? "Great Progress!" : "Keep Going!"}</h4>
            <p>
              {reqs?.requirements?.metAll
                ? "You are on track to meet all requirements this semester."
                : "You are building momentum. Stay consistent and knock out each bucket."}
            </p>
          </motion.article>
        </aside>
      </div>
    </div>
  );
}