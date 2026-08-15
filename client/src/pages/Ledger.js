import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["all", "phi", "sigma", "rho", "tau"];
const CATEGORY_ORDER = ["phi", "sigma", "rho", "tau"];
const PALETTE = {
  burgundy: "#6f2232",
  orchidPink: "#e8a1b3",
  pearl: "#f8f2ee",
  mauve: "#b68aa5",
  blush: "#f6d7df",
  ink: "#432534",
  line: "rgba(111, 34, 50, 0.14)",
  shadow: "0 18px 50px rgba(111, 34, 50, 0.12)",
};
const CATEGORY_META = {
  phi: { label: "Phi", icon: "Φ", tint: "linear-gradient(135deg, #e8a1b3 0%, #f6d7df 100%)" },
  sigma: { label: "Sigma", icon: "Σ", tint: "linear-gradient(135deg, #f0cad7 0%, #f8f2ee 100%)" },
  rho: { label: "Rho", icon: "Ρ", tint: "linear-gradient(135deg, #d9bdd1 0%, #f8f2ee 100%)" },
  tau: { label: "Tau", icon: "Τ", tint: "linear-gradient(135deg, #b68aa5 0%, #f3dde4 100%)" },
};

function normalizeRoleList(user) {
  return Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
}

function getAllowedManualCategories(user) {
  if (!user) return [];

  const roles = normalizeRoleList(user);
  const positions = Array.isArray(user?.positions) ? user.positions : [];
  const positionKeys = new Set(positions.map(position => position?.key).filter(Boolean));

  if (
    roles.includes("webmaster") ||
    positionKeys.has("WEBMASTER") ||
    positionKeys.has("PRESIDENT") ||
    positionKeys.has("VP_STANDARDS")
  ) {
    return [...CATEGORY_ORDER];
  }

  const allowed = [];
  if (positionKeys.has("VP_SOCIAL")) allowed.push("phi");
  if (positionKeys.has("VP_SCHOLARSHIP")) allowed.push("sigma");
  if (positionKeys.has("VP_SERVICE")) allowed.push("rho");
  if (positionKeys.has("VP_FINANCE")) allowed.push("tau");
  return allowed;
}

function useOfficer(user) {
  const roles = normalizeRoleList(user);
  return roles.some(r => ["officer", "exec", "webmaster", "webdev"].includes(r));
}

export default function Ledger() {
  const { user } = useAuth();
  const isOfficer = useOfficer(user);
  const userId = user?._id || user?.id;
  const allowedManualCategories = useMemo(() => getAllowedManualCategories(user), [user]);
  const canManageManualAdjustments = allowedManualCategories.length > 0;

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
  const [manualForm, setManualForm] = useState({ userId: "", category: allowedManualCategories[0] || "", points: "", note: "" });
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
        await loadEntries(1);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [category, from, to, userFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setManualForm(form => {
      const nextCategory = allowedManualCategories.includes(form.category)
        ? form.category
        : (allowedManualCategories[0] || "");
      if (nextCategory === form.category) return form;
      return { ...form, category: nextCategory };
    });
  }, [allowedManualCategories]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!canManageManualAdjustments || !allowedManualCategories.includes(manualForm.category)) {
      setError("You do not have permission to create manual adjustments for that category.");
      return;
    }
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
      setManualForm({ userId: "", category: allowedManualCategories[0] || "", points: "", note: "" });
      await loadEntries(1);
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visibleMembers = new Set(entries.map(entry => entry.user?._id || `${entry.user?.firstName || ""}-${entry.user?.lastName || ""}`)).size;
  const manualEntryCount = entries.filter(entry => entry.source === "manual").length;

  if (!isOfficer) {
    return <div style={{ padding: 24 }}>Not authorized.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.heroCard}>
        <div style={styles.heroGlow} />
        <div style={styles.heroContent}>
          <div>
            <div style={styles.kicker}>Member Performance Ledger</div>
            <h1 style={styles.pageTitle}>Points Ledger</h1>
            <p style={styles.pageSubtitle}>
              Review category totals, scan recent movement, and create tightly controlled manual adjustments.
            </p>
          </div>
          <div style={styles.heroActions}>
            <button
              style={canManageManualAdjustments ? styles.primaryBtn : styles.disabledBtn}
              onClick={() => canManageManualAdjustments && setManualOpen(true)}
              disabled={!canManageManualAdjustments}
              title={canManageManualAdjustments ? "Add Manual Adjustment" : "Only the Webmaster and designated VPs can add manual adjustments"}
            >
              Add Manual Adjustment
            </button>
            {!canManageManualAdjustments && (
              <div style={styles.permissionBadge}>Manual adjustments are limited to the Webmaster and category VPs.</div>
            )}
          </div>
        </div>
        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Visible members</span>
            <strong style={styles.metricValue}>{visibleMembers}</strong>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Manual entries on page</span>
            <strong style={styles.metricValue}>{manualEntryCount}</strong>
          </div>
        </div>
      </div>

      <div style={styles.toolbarCard}>
        <div style={styles.toolbarTitleRow}>
          <div>
            <h2 style={styles.sectionTitle}>Filter activity</h2>
            <p style={styles.sectionSubtitle}>Keep the controls compact while preserving breathing room between each filter.</p>
          </div>
        </div>
        <div style={styles.toolbarGrid}>
          <label style={styles.controlGroup}>
            <span style={styles.controlLabel}>Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)} style={styles.input}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.toUpperCase()}</option>)}
            </select>
          </label>
          <label style={styles.controlGroup}>
            <span style={styles.controlLabel}>From</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.controlGroup}>
            <span style={styles.controlLabel}>To</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.controlGroup}>
            <span style={styles.controlLabel}>Member</span>
            <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={styles.input}>
              <option value="">All Users</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.sectionTitle}>Entries</h3>
            <p style={styles.sectionSubtitle}>Recent ledger activity with clearer spacing and softer contrast.</p>
          </div>
        </div>
        <div style={styles.tableShell}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>User</th>
                <th style={styles.th}>
                  <span style={styles.headerPill("phi")}>Category</span>
                </th>
                <th style={styles.th}>Points</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td style={styles.emptyCell} colSpan={7}>No ledger entries found for the current filters.</td></tr>
              )}
              {entries.map(e => (
                <tr key={e._id} style={styles.bodyRow}>
                  <td style={styles.td}>{new Date(e.createdAt).toLocaleString()}</td>
                  <td style={styles.memberCell}>{e.user ? `${e.user.firstName || ''} ${e.user.lastName || ''}` : ''}</td>
                  <td style={styles.td}>
                    <span style={styles.headerPill(e.category)}>
                      <span style={styles.headerIcon}>{CATEGORY_META[e.category]?.icon || "•"}</span>
                      {e.category?.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.pointsCell(e.points)}>{e.points}</td>
                  <td style={styles.td}>{e.source}</td>
                  <td style={styles.td}>{e.event ? e.event.title : ''}</td>
                  <td style={styles.noteCell}>{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationRow}>
          <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadEntries(p); }}>Prev</button>
          <div style={styles.paginationLabel}>Page {page} / {totalPages}</div>
          <button style={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); loadEntries(p); }}>Next</button>
        </div>
      </div>

      {manualOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Add Manual Adjustment</h3>
                <p style={styles.modalSubtitle}>Only approved categories for your role are available.</p>
              </div>
              <button style={styles.secondaryBtn} onClick={() => setManualOpen(false)}>Close</button>
            </div>
            <form onSubmit={handleManualSubmit}>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>User</label>
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
                <label style={styles.fieldLabel}>Category</label>
                <select
                  value={manualForm.category}
                  onChange={e => setManualForm(f => ({ ...f, category: e.target.value }))}
                  style={styles.input}
                  disabled={!canManageManualAdjustments}
                >
                  {allowedManualCategories.map(c => <option key={c} value={c}>{CATEGORY_META[c].label.toUpperCase()}</option>)}
                </select>
                <div style={styles.helperText}>
                  {canManageManualAdjustments
                    ? `Allowed categories: ${allowedManualCategories.map(c => CATEGORY_META[c].label).join(", ")}`
                    : "You do not currently hold a role that allows manual point adjustments."}
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Points (can be negative)</label>
                <input
                  type="number"
                  value={manualForm.points}
                  onChange={e => setManualForm(f => ({ ...f, points: e.target.value }))}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>Note</label>
                <textarea
                  value={manualForm.note}
                  onChange={e => setManualForm(f => ({ ...f, note: e.target.value }))}
                  required
                  rows={3}
                  style={styles.textarea}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" style={styles.secondaryBtn} onClick={() => setManualOpen(false)}>Cancel</button>
                <button type="submit" style={canManageManualAdjustments ? styles.primaryBtn : styles.disabledBtn} disabled={!canManageManualAdjustments}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100%",
    padding: "32px 24px 40px",
    maxWidth: 1240,
    margin: "0 auto",
    color: PALETTE.ink,
    background: `radial-gradient(circle at top right, rgba(232, 161, 179, 0.28), transparent 34%), linear-gradient(180deg, ${PALETTE.pearl} 0%, #fffdfb 100%)`,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    padding: "28px 28px 24px",
    marginBottom: 24,
    background: `linear-gradient(145deg, rgba(248, 242, 238, 0.96) 0%, rgba(246, 215, 223, 0.94) 100%)`,
    border: `1px solid ${PALETTE.line}`,
    boxShadow: PALETTE.shadow,
  },
  heroGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    right: -80,
    top: -90,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(182, 138, 165, 0.34) 0%, rgba(232, 161, 179, 0) 72%)",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  kicker: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    borderRadius: 999,
    marginBottom: 14,
    color: PALETTE.burgundy,
    background: "rgba(255,255,255,0.72)",
    border: `1px solid ${PALETTE.line}`,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  pageTitle: {
    margin: 0,
    fontSize: "clamp(2rem, 3vw, 3rem)",
    lineHeight: 1,
    color: PALETTE.burgundy,
  },
  pageSubtitle: {
    margin: "12px 0 0",
    maxWidth: 680,
    fontSize: 15,
    lineHeight: 1.65,
    color: "rgba(67, 37, 52, 0.82)",
  },
  heroActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 10,
  },
  permissionBadge: {
    maxWidth: 320,
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.7)",
    border: `1px solid ${PALETTE.line}`,
    fontSize: 12,
    lineHeight: 1.45,
    color: "rgba(67, 37, 52, 0.78)",
  },
  metricGrid: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
  },
  metricCard: {
    padding: "18px 18px 16px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.78)",
    border: `1px solid ${PALETTE.line}`,
    backdropFilter: "blur(12px)",
  },
  metricLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.72)",
  },
  metricValue: {
    display: "block",
    marginTop: 10,
    fontSize: 28,
    lineHeight: 1,
    color: PALETTE.burgundy,
  },
  toolbarCard: {
    padding: "18px 20px 20px",
    marginBottom: 18,
    borderRadius: 24,
    background: "rgba(255,255,255,0.88)",
    border: `1px solid ${PALETTE.line}`,
    boxShadow: "0 10px 30px rgba(111, 34, 50, 0.06)",
  },
  toolbarTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
  },
  toolbarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 14,
    alignItems: "end",
  },
  sectionCard: {
    padding: "18px 20px 20px",
    marginBottom: 18,
    borderRadius: 24,
    background: "rgba(255,255,255,0.9)",
    border: `1px solid ${PALETTE.line}`,
    boxShadow: "0 10px 30px rgba(111, 34, 50, 0.05)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    color: PALETTE.burgundy,
  },
  sectionSubtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "rgba(67, 37, 52, 0.72)",
  },
  primaryBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "none",
    background: `linear-gradient(135deg, ${PALETTE.burgundy} 0%, ${PALETTE.mauve} 100%)`,
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 14px 28px rgba(111, 34, 50, 0.18)",
  },
  disabledBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, rgba(182, 138, 165, 0.45) 0%, rgba(232, 161, 179, 0.4) 100%)",
    color: "rgba(67, 37, 52, 0.6)",
    cursor: "not-allowed",
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${PALETTE.line}`,
    background: "rgba(255,255,255,0.86)",
    cursor: "pointer",
    color: PALETTE.ink,
    fontWeight: 600,
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.72)",
  },
  input: {
    width: "100%",
    minHeight: 46,
    padding: "11px 14px",
    borderRadius: 14,
    border: `1px solid ${PALETTE.line}`,
    background: "rgba(255,255,255,0.92)",
    color: PALETTE.ink,
  },
  textarea: {
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${PALETTE.line}`,
    background: "rgba(255,255,255,0.92)",
    resize: "vertical",
  },
  tableShell: {
    overflowX: "auto",
    borderRadius: 20,
    border: `1px solid ${PALETTE.line}`,
    background: `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248, 242, 238, 0.88) 100%)`,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  headerRow: {
    textAlign: "left",
    background: "linear-gradient(180deg, rgba(246, 215, 223, 0.58) 0%, rgba(255,255,255,0.9) 100%)",
  },
  th: {
    padding: "16px 18px",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
  },
  td: {
    padding: "18px 18px",
    fontSize: 14,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    verticalAlign: "top",
  },
  bodyRow: {
    background: "rgba(255,255,255,0.84)",
  },
  memberCell: {
    padding: "18px 18px",
    fontSize: 14,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    minWidth: 180,
  },
  memberName: {
    fontWeight: 700,
    color: PALETTE.burgundy,
  },
  memberSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: "rgba(67, 37, 52, 0.62)",
  },
  noteCell: {
    padding: "18px 18px",
    fontSize: 14,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    minWidth: 220,
    lineHeight: 1.5,
  },
  pointsCell: (points) => ({
    padding: "18px 18px",
    fontSize: 14,
    fontWeight: 700,
    color: points < 0 ? PALETTE.burgundy : "#5d3b55",
    borderTop: `1px solid ${PALETTE.line}`,
  }),
  emptyCell: {
    padding: "28px 18px",
    textAlign: "center",
    fontSize: 14,
    color: "rgba(67, 37, 52, 0.7)",
  },
  headerPill: (categoryKey) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: CATEGORY_META[categoryKey]?.tint || "rgba(246, 215, 223, 0.6)",
    color: PALETTE.burgundy,
  }),
  headerIcon: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: 800,
  },
  errorBanner: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid rgba(111, 34, 50, 0.18)`,
    background: "rgba(255, 238, 241, 0.95)",
    color: PALETTE.burgundy,
  },
  paginationRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 14,
    flexWrap: "wrap",
  },
  paginationLabel: {
    fontSize: 14,
    color: "rgba(67, 37, 52, 0.76)",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(67, 37, 52, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 12,
  },
  modalCard: {
    background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${PALETTE.pearl} 100%)`,
    borderRadius: 22,
    padding: 20,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: PALETTE.shadow,
    border: `1px solid ${PALETTE.line}`,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 16,
  },
  modalTitle: {
    margin: 0,
    color: PALETTE.burgundy,
  },
  modalSubtitle: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "rgba(67, 37, 52, 0.72)",
  },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: PALETTE.burgundy,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 1.5,
    color: "rgba(67, 37, 52, 0.7)",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 18,
  },
};
