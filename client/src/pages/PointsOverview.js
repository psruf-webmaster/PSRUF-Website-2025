import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const MEMBER_STATUS = ["all", "active", "inactive", "probation", "seniorStatus", "co-op", "dropped", "pending", "approved", "rejected"];
const CATEGORY_ORDER = ["phi", "sigma", "rho", "tau", "any", "total"];
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
  sigma: { label: "Sigma", icon: "Σ", tint: "linear-gradient(135deg, #efd2dc 0%, #f8f2ee 100%)" },
  rho: { label: "Rho", icon: "Ρ", tint: "linear-gradient(135deg, #dac0d2 0%, #f8f2ee 100%)" },
  tau: { label: "Tau", icon: "Τ", tint: "linear-gradient(135deg, #b68aa5 0%, #f0dce4 100%)" },
  any: { label: "Any", icon: "◇", tint: "linear-gradient(135deg, #f8f2ee 0%, #f1dbe3 100%)" },
  total: { label: "Total", icon: "◎", tint: "linear-gradient(135deg, #f6d7df 0%, #e8a1b3 100%)" },
};
const STATUS_META = {
  active: { label: "Active", icon: "●" },
  inactive: { label: "Inactive", icon: "○" },
  probation: { label: "Probation", icon: "!" },
  seniorStatus: { label: "Senior Status", icon: "★" },
  "co-op": { label: "Co-op", icon: "↺" },
  dropped: { label: "Dropped", icon: "×" },
  pending: { label: "Pending", icon: "…" },
  approved: { label: "Approved", icon: "✓" },
  rejected: { label: "Rejected", icon: "−" },
};

function formatStatusLabel(status) {
  return STATUS_META[status]?.label || status;
}

function formatStatusShortLabel(status) {
  const shortLabels = {
    seniorStatus: "Senior",
    probation: "Prob.",
    inactive: "Inactive",
    approved: "Approved",
    rejected: "Rejected",
  };
  return shortLabels[status] || formatStatusLabel(status);
}

function getRequirementRule(requirements) {
  return requirements?.rule || "per-category";
}

function getRequirementSummary(requirements) {
  const rule = getRequirementRule(requirements);

  if (rule === "none") {
    return "No point requirement";
  }

  if (rule === "anywhere") {
    return `${requirements?.totalRequired || 50} points anywhere`;
  }

  return `${requirements?.minPerCategory || 50} per bucket + any`;
}

function isOverviewAllowed(user) {
  const positions = Array.isArray(user?.positions) ? user.positions : [];
  const positionKeys = new Set(positions.map(position => position?.key).filter(Boolean));
  return positionKeys.has("PRESIDENT")
    || positionKeys.has("VP_STANDARDS")
    || positionKeys.has("VP_FINANCE");
}

export default function PointsOverview() {
  const { user } = useAuth();
  const userId = user?._id || user?.id;
  const allowed = isOverviewAllowed(user);
  const userScopeKey = useMemo(() => JSON.stringify({
    role: user?.role || [],
    memberStatus: user?.memberStatus || [],
    positions: user?.positions || [],
  }), [user?.role, user?.memberStatus, user?.positions]);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoverRow, setHoverRow] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth));

  const isMobile = viewportWidth < 768;
  const isCompact = viewportWidth < 1024;

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
    if (!allowed) {
      setRows([]);
      setLoading(false);
      return;
    }

    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, status, q, userScopeKey]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const trackedMembers = rows.length;
  const meetsCount = rows.filter(row => row.requirements?.metAll).length;

  if (!allowed) {
    return <div style={{ padding: 24 }}>Not authorized.</div>;
  }

  return (
    <div style={styles.page(isMobile)}>
      <div style={styles.heroCard}>
        <div style={styles.heroGlow} />
        <div style={styles.heroTopRow(isMobile)}>
          <div>
            <div style={styles.kicker}>Executive Tracking Dashboard</div>
            <h1 style={styles.pageTitle}>Points Overview</h1>
            <p style={styles.pageSubtitle}>
              Review every member&apos;s status and points breakdown at a glance with cleaner hierarchy and faster scanning for exec decisions.
            </p>
          </div>
          <div style={styles.heroActions}>
            <button
              style={styles.primaryBtn(isMobile)}
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
        </div>

        <div style={styles.metricsGrid(isMobile, isCompact)}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Visible members</span>
            <strong style={styles.metricValue}>{trackedMembers}</strong>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>Members meeting requirements</span>
            <strong style={styles.metricValue}>{meetsCount}</strong>
          </div>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.toolbarCard}>
        <div style={styles.toolbarHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Filter roster</h2>
            <p style={styles.sectionSubtitle}>Keep the table intact while making it easier to focus on one population at a time.</p>
          </div>
        </div>
        <div style={styles.toolbarGrid(isMobile, isCompact)}>
          <label style={styles.controlGroup}>
            <span style={styles.controlLabel}>Member status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} style={styles.input}>
              {MEMBER_STATUS.map(s => (
                <option key={s} value={s}>{s === "all" ? "All Statuses" : formatStatusLabel(s)}</option>
              ))}
            </select>
          </label>
          <label style={styles.controlGroupWide}>
            <span style={styles.controlLabel}>Search member</span>
            <input
              placeholder="Search by first or last name"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={styles.input}
            />
          </label>
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingCard}>Loading overview...</div>
      ) : (
        <div style={styles.tableCard}>
          <div style={styles.scrollHint(isMobile)}>
            {isMobile ? "Swipe to see all point categories" : "Scroll horizontally for the full breakdown if needed"}
          </div>
          <div style={styles.tableScroller(isMobile)}>
          <div style={styles.scrollFadeLeft(isMobile)} />
          <div style={styles.scrollFadeRight(isMobile)} />
          <table style={styles.table(isMobile)}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th(isMobile)}>User</th>
                <th style={styles.th(isMobile)}>
                  <span style={styles.headerPill("status", isMobile)}>◌ {isMobile ? "Stat" : "Status"}</span>
                </th>
                {CATEGORY_ORDER.map(categoryKey => (
                  <th key={categoryKey} style={styles.th(isMobile)}>
                    <span style={styles.headerPill(categoryKey, isMobile)}>
                      <span style={styles.headerIcon}>{CATEGORY_META[categoryKey].icon}</span>
                      {isMobile ? CATEGORY_META[categoryKey].icon : CATEGORY_META[categoryKey].label}
                    </span>
                  </th>
                ))}
                <th style={styles.th(isMobile)}>
                  <span style={styles.headerPill("meets", isMobile)}>✓ {isMobile ? "Met" : "Meets"}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td style={styles.emptyCell} colSpan={9}>No members found</td></tr>
              )}
              {rows.map(r => (
                <tr
                  key={r.userId}
                  style={styles.bodyRow}
                  onMouseEnter={() => !isMobile && setHoverRow(r)}
                  onMouseLeave={() => !isMobile && setHoverRow(null)}
                  onClick={() => isMobile && setHoverRow(current => current?.userId === r.userId ? null : r)}
                >
                  <td style={styles.memberCell(isMobile)}>
                    <div style={styles.memberName}>{r.firstName} {r.lastName}</div>
                    <div style={styles.memberSubtext}>{isMobile ? "Tap row for requirement detail" : "Hover for requirement detail"}</div>
                  </td>
                  <td style={styles.statusCell(isMobile)}>
                    <div style={styles.statusWrap}>
                      {(r.memberStatus || []).map(memberStatus => (
                        <span key={memberStatus} style={styles.statusBadge}>
                          <span style={styles.statusIcon}>{STATUS_META[memberStatus]?.icon || "•"}</span>
                          {isMobile ? formatStatusShortLabel(memberStatus) : formatStatusLabel(memberStatus)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={styles.numberCell(isMobile)}>{r.totals?.phi || 0}</td>
                  <td style={styles.numberCell(isMobile)}>{r.totals?.sigma || 0}</td>
                  <td style={styles.numberCell(isMobile)}>{r.totals?.rho || 0}</td>
                  <td style={styles.numberCell(isMobile)}>{r.totals?.tau || 0}</td>
                  <td style={styles.numberCell(isMobile)}>{r.totals?.any || 0}</td>
                  <td style={styles.totalCell(isMobile)}>{r.totals?.total || 0}</td>
                  <td style={styles.td(isMobile)}>
                    <span style={r.requirements?.metAll ? styles.meetsBadge : styles.needsBadge}>
                      {r.requirements?.metAll ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {hoverRow && (
            <div style={styles.tooltip(isMobile)}>
              <div style={styles.tooltipHeader}>
                <div>
                  <div style={styles.tooltipName}>{hoverRow.firstName} {hoverRow.lastName}</div>
                  <div style={styles.tooltipSubtitle}>{getRequirementSummary(hoverRow.requirements)}</div>
                </div>
                <span style={hoverRow.requirements?.metAll ? styles.meetsBadge : styles.needsBadge}>
                  {hoverRow.requirements?.metAll ? "On Track" : "Not Yet Met"}
                </span>
              </div>
              {getRequirementRule(hoverRow.requirements) === "per-category" ? (
                <div style={styles.tooltipList}>
                {["phi","sigma","rho","tau","any"].map(cat => {
                  const have = hoverRow.requirements?.buckets?.[cat]?.have;
                  const anyHave = hoverRow.any?.have;
                  const totalVal = hoverRow.totals?.[cat];
                  const value = have ?? anyHave ?? totalVal ?? 0;
                  const need = cat === "any"
                    ? hoverRow.any?.need
                    : hoverRow.requirements?.buckets?.[cat]?.need;
                  return (
                    <div key={cat} style={styles.tooltipRow}>
                      <span style={styles.tooltipCategory(cat)}>
                        <span style={styles.headerIcon}>{CATEGORY_META[cat].icon}</span>
                        {CATEGORY_META[cat].label}
                      </span>
                      <span style={styles.tooltipValue}>
                        {value}
                        {need != null && <span style={styles.tooltipNeed}> / need {need}</span>}
                      </span>
                    </div>
                  );
                })}
                </div>
              ) : (
                <div style={styles.tooltipList}>
                  <div style={styles.tooltipRow}>
                    <span style={styles.tooltipCategory("total")}>
                      <span style={styles.headerIcon}>{CATEGORY_META.total.icon}</span>
                      Total points
                    </span>
                    <span style={styles.tooltipValue}>
                      {hoverRow.totals?.total || 0}
                      {getRequirementRule(hoverRow.requirements) === "anywhere" ? (
                        <span style={styles.tooltipNeed}> / need {hoverRow.requirements?.totalRequired || 50}</span>
                      ) : null}
                    </span>
                  </div>
                  <div style={styles.tooltipRuleNote}>
                    {getRequirementRule(hoverRow.requirements) === "anywhere"
                      ? "Any category counts toward this requirement."
                      : "This member does not have a semester point requirement for the current status."}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <div style={styles.paginationRow}>
        <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => { const p = Math.max(1, page - 1); setPage(p); load(p); }}>Prev</button>
        <div style={styles.paginationLabel}>Page {page} / {totalPages}</div>
        <button style={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); load(p); }}>Next</button>
      </div>
    </div>
  );
}

const styles = {
  page: (isMobile) => ({
    minHeight: "100%",
    padding: isMobile ? "20px 14px 32px" : "32px 24px 40px",
    maxWidth: isMobile ? 1240 : 1420,
    margin: "0 auto",
    color: PALETTE.ink,
    background: `radial-gradient(circle at top right, rgba(232, 161, 179, 0.28), transparent 34%), linear-gradient(180deg, ${PALETTE.pearl} 0%, #fffdfb 100%)`,
  }),
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    padding: "28px 28px 24px",
    marginBottom: 18,
    background: `linear-gradient(145deg, rgba(248, 242, 238, 0.96) 0%, rgba(246, 215, 223, 0.94) 100%)`,
    border: `1px solid ${PALETTE.line}`,
    boxShadow: PALETTE.shadow,
  },
  heroGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    right: -70,
    top: -90,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(182, 138, 165, 0.34) 0%, rgba(232, 161, 179, 0) 72%)",
    pointerEvents: "none",
  },
  heroTopRow: (isMobile) => ({
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: isMobile ? "stretch" : "flex-start",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 20,
  }),
  heroActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 10,
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
    maxWidth: 720,
    fontSize: 15,
    lineHeight: 1.65,
    color: "rgba(67, 37, 52, 0.82)",
  },
  metricsGrid: (isMobile, isCompact) => ({
    position: "relative",
    display: "grid",
    gridTemplateColumns: isMobile
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(2, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
  }),
  metricCard: {
    padding: "18px 18px 16px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.78)",
    border: `1px solid ${PALETTE.line}`,
    backdropFilter: "blur(12px)",
  },
  metricLabel: {
    display: "block",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.72)",
    lineHeight: 1.2,
  },
  metricValue: {
    display: "block",
    marginTop: 10,
    fontSize: 28,
    lineHeight: 1,
    color: PALETTE.burgundy,
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
  primaryBtn: (isMobile) => ({
    padding: "12px 18px",
    borderRadius: 14,
    border: "none",
    background: `linear-gradient(135deg, ${PALETTE.burgundy} 0%, ${PALETTE.mauve} 100%)`,
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 14px 28px rgba(111, 34, 50, 0.18)",
    width: isMobile ? "100%" : "auto",
  }),
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid ${PALETTE.line}`,
    background: "rgba(255,255,255,0.88)",
    cursor: "pointer",
    color: PALETTE.ink,
    fontWeight: 600,
  },
  toolbarCard: {
    padding: "18px 20px 20px",
    marginBottom: 18,
    borderRadius: 24,
    background: "rgba(255,255,255,0.88)",
    border: `1px solid ${PALETTE.line}`,
    boxShadow: "0 10px 30px rgba(111, 34, 50, 0.06)",
  },
  toolbarHeader: {
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
  toolbarGrid: (isMobile, isCompact) => ({
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : (isCompact ? "minmax(180px, 240px) minmax(220px, 1fr)" : "minmax(190px, 260px) minmax(260px, 1fr)"),
    gap: 14,
    alignItems: "end",
  }),
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  controlGroupWide: {
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
  loadingCard: {
    padding: "28px 20px",
    borderRadius: 24,
    background: "rgba(255,255,255,0.88)",
    border: `1px solid ${PALETTE.line}`,
    boxShadow: "0 10px 30px rgba(111, 34, 50, 0.06)",
    color: PALETTE.burgundy,
    fontWeight: 600,
  },
  tableCard: {
    position: "relative",
    padding: 0,
    borderRadius: 24,
    background: "rgba(255,255,255,0.9)",
    border: `1px solid ${PALETTE.line}`,
    boxShadow: "0 10px 30px rgba(111, 34, 50, 0.05)",
    overflow: "hidden",
  },
  scrollHint: (isMobile) => ({
    display: isMobile ? "block" : "none",
    padding: isMobile ? "10px 14px 0" : "12px 18px 0",
    fontSize: 12,
    color: "rgba(67, 37, 52, 0.68)",
  }),
  tableScroller: (isMobile) => ({
    overflowX: isMobile ? "auto" : "visible",
    borderRadius: 24,
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "thin",
    scrollbarColor: `${PALETTE.mauve} rgba(232, 161, 179, 0.18)`,
    position: "relative",
    paddingBottom: isMobile ? 6 : 0,
  }),
  scrollFadeLeft: (isMobile) => ({
    position: "sticky",
    left: 0,
    top: 0,
    bottom: 0,
    width: isMobile ? 18 : 0,
    background: isMobile ? `linear-gradient(90deg, rgba(248, 242, 238, 0.96) 0%, rgba(248, 242, 238, 0) 100%)` : "transparent",
    pointerEvents: "none",
    zIndex: 3,
    float: "left",
  }),
  scrollFadeRight: (isMobile) => ({
    position: "sticky",
    right: 0,
    top: 0,
    bottom: 0,
    width: isMobile ? 18 : 0,
    marginLeft: "auto",
    background: isMobile ? `linear-gradient(270deg, rgba(248, 242, 238, 0.96) 0%, rgba(248, 242, 238, 0) 100%)` : "transparent",
    pointerEvents: "none",
    zIndex: 3,
    float: "right",
  }),
  table: (isMobile) => ({
    width: isMobile ? "max-content" : "100%",
    minWidth: isMobile ? 760 : 0,
    borderCollapse: "separate",
    borderSpacing: 0,
    tableLayout: isMobile ? "auto" : "fixed",
  }),
  headerRow: {
    textAlign: "left",
    background: "linear-gradient(180deg, rgba(246, 215, 223, 0.58) 0%, rgba(255,255,255,0.9) 100%)",
  },
  th: (isMobile) => ({
    padding: isMobile ? "13px 10px" : "16px 18px",
    fontSize: isMobile ? 11 : 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
    whiteSpace: isMobile ? "nowrap" : "normal",
  }),
  td: (isMobile) => ({
    padding: isMobile ? "14px 10px" : "18px 18px",
    fontSize: isMobile ? 13 : 14,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    verticalAlign: "top",
    whiteSpace: isMobile ? "nowrap" : "normal",
  }),
  bodyRow: {
    background: "rgba(255,255,255,0.84)",
  },
  memberCell: (isMobile) => ({
    padding: isMobile ? "14px 10px" : "18px 18px",
    fontSize: isMobile ? 13 : 14,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    minWidth: isMobile ? 132 : 0,
    width: isMobile ? 132 : "18%",
    verticalAlign: "top",
  }),
  memberName: {
    fontWeight: 700,
    color: PALETTE.burgundy,
  },
  memberSubtext: {
    marginTop: 5,
    fontSize: 12,
    color: "rgba(67, 37, 52, 0.62)",
  },
  statusCell: (isMobile) => ({
    padding: isMobile ? "14px 10px" : "18px 18px",
    borderTop: `1px solid ${PALETTE.line}`,
    minWidth: isMobile ? 132 : 0,
    width: isMobile ? 132 : "16%",
    verticalAlign: "top",
  }),
  statusWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 28,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(246, 215, 223, 0.62)",
    color: PALETTE.burgundy,
    border: `1px solid ${PALETTE.line}`,
    fontSize: 12,
    fontWeight: 600,
  },
  statusIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.72)",
    fontSize: 10,
  },
  numberCell: (isMobile) => ({
    padding: isMobile ? "14px 8px" : "18px 18px",
    fontSize: isMobile ? 13 : 14,
    fontWeight: 600,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    textAlign: "center",
    verticalAlign: "top",
    minWidth: isMobile ? 48 : 0,
    width: isMobile ? 48 : "7.25%",
  }),
  totalCell: (isMobile) => ({
    padding: isMobile ? "14px 8px" : "18px 18px",
    fontSize: isMobile ? 13 : 14,
    fontWeight: 800,
    color: PALETTE.burgundy,
    borderTop: `1px solid ${PALETTE.line}`,
    textAlign: "center",
    verticalAlign: "top",
    minWidth: isMobile ? 56 : 0,
    width: isMobile ? 56 : "8%",
  }),
  meetsBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 68,
    minHeight: 30,
    padding: "4px 10px",
    borderRadius: 999,
    background: "linear-gradient(135deg, rgba(232, 161, 179, 0.7) 0%, rgba(248, 242, 238, 0.95) 100%)",
    color: PALETTE.burgundy,
    border: `1px solid ${PALETTE.line}`,
    fontSize: 12,
    fontWeight: 700,
  },
  needsBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
    minHeight: 30,
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.88)",
    color: PALETTE.ink,
    border: `1px solid ${PALETTE.line}`,
    fontSize: 12,
    fontWeight: 700,
  },
  emptyCell: {
    padding: "28px 18px",
    textAlign: "center",
    fontSize: 14,
    color: "rgba(67, 37, 52, 0.7)",
  },
  headerPill: (key, isMobile) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
    padding: isMobile ? "5px 8px" : "6px 10px",
    borderRadius: 999,
    background: CATEGORY_META[key]?.tint || "rgba(246, 215, 223, 0.6)",
    color: PALETTE.burgundy,
    fontSize: isMobile ? 11 : 12,
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
  tooltip: (isMobile) => ({
    position: isMobile ? "static" : "fixed",
    right: isMobile ? "auto" : 20,
    bottom: isMobile ? "auto" : 20,
    left: isMobile ? "auto" : undefined,
    margin: isMobile ? "14px 14px 0" : 0,
    background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, ${PALETTE.pearl} 100%)`,
    border: `1px solid ${PALETTE.line}`,
    borderRadius: 18,
    padding: 16,
    boxShadow: PALETTE.shadow,
    minWidth: isMobile ? 0 : 280,
    width: isMobile ? "auto" : "auto",
    zIndex: 50,
  }),
  tooltipHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  tooltipName: {
    fontSize: 16,
    fontWeight: 700,
    color: PALETTE.burgundy,
  },
  tooltipSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(67, 37, 52, 0.66)",
  },
  tooltipList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  tooltipRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  tooltipCategory: (categoryKey) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: CATEGORY_META[categoryKey].tint,
    color: PALETTE.burgundy,
    fontSize: 12,
    fontWeight: 700,
  }),
  tooltipValue: {
    fontSize: 13,
    fontWeight: 700,
    color: PALETTE.ink,
  },
  tooltipNeed: {
    fontSize: 12,
    fontWeight: 500,
    color: "rgba(67, 37, 52, 0.66)",
  },
  tooltipRuleNote: {
    fontSize: 13,
    lineHeight: 1.5,
    color: "rgba(67, 37, 52, 0.78)",
  },
};
