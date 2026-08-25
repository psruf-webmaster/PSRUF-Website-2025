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
  phi: { label: "Phi", icon: "Φ", tint: "#f6d7df" },
  sigma: { label: "Sigma", icon: "Σ", tint: "#f8f2ee" },
  rho: { label: "Rho", icon: "Ρ", tint: "#f8f2ee" },
  tau: { label: "Tau", icon: "Τ", tint: "#f0dce4" },
  any: { label: "Any", icon: "◇", tint: "#f1dbe3" },
  total: { label: "Total", icon: "◎", tint: "#e8a1b3" },
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

  const styles = getStyles(isMobile, isCompact);

  return (
    <div style={styles.page}>
      <div style={styles.heroCard}>
        <div style={styles.heroTopRow}>
          <div>
            <div style={styles.kicker}>Executive Tracking Dashboard</div>
            <h1 style={styles.pageTitle}>Points Overview</h1>
            <p style={styles.pageSubtitle}>
              Review every member&apos;s status and points breakdown at a glance with cleaner hierarchy and faster scanning for exec decisions.
            </p>
          </div>
          <div style={styles.heroActions}>
            <button
              style={styles.primaryBtn}
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

        <div style={styles.metricsGrid}>
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
        <div style={styles.toolbarGrid}>
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
          <div style={styles.scrollHint}>
            {isMobile ? "Swipe to see all point categories" : "Scroll horizontally for the full breakdown if needed"}
          </div>
          <div style={styles.tableScroller}>
          <div style={styles.scrollFadeLeft} />
          <div style={styles.scrollFadeRight} />
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>User</th>
                <th style={styles.thCenter}>
                  <span style={styles.headerPill("status")}>◌ {isMobile ? "Stat" : "Status"}</span>
                </th>
                {CATEGORY_ORDER.map(categoryKey => (
                  <th key={categoryKey} style={styles.thCenter}>
                    <span style={styles.headerPill(categoryKey)}>
                      <span style={styles.headerIcon}>{CATEGORY_META[categoryKey].icon}</span>
                      {isMobile ? CATEGORY_META[categoryKey].icon : CATEGORY_META[categoryKey].label}
                    </span>
                  </th>
                ))}
                <th style={styles.thCenter}>
                  <span style={styles.headerPill("meets")}>✓ {isMobile ? "Met" : "Meets"}</span>
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
                  <td style={styles.memberCell}>
                    <div style={styles.memberName}>{r.firstName} {r.lastName}</div>
                    <div style={styles.memberSubtext}>{isMobile ? "Tap row for requirement detail" : "Hover for requirement detail"}</div>
                  </td>
                  <td style={styles.statusCell}>
                    <div style={styles.statusWrap}>
                      {(r.memberStatus || []).map(memberStatus => (
                        <span key={memberStatus} style={styles.statusBadge}>
                          <span style={styles.statusIcon}>{STATUS_META[memberStatus]?.icon || "•"}</span>
                          {isMobile ? formatStatusShortLabel(memberStatus) : formatStatusLabel(memberStatus)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={styles.numberCell}>{r.totals?.phi || 0}</td>
                  <td style={styles.numberCell}>{r.totals?.sigma || 0}</td>
                  <td style={styles.numberCell}>{r.totals?.rho || 0}</td>
                  <td style={styles.numberCell}>{r.totals?.tau || 0}</td>
                  <td style={styles.numberCell}>{r.totals?.any || 0}</td>
                  <td style={styles.totalCell}>{r.totals?.total || 0}</td>
                  <td style={styles.tdCenter}>
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
            <div style={styles.tooltip}>
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

function getStyles(isMobile, isCompact) {
  return {
    page: {
      minHeight: "100%",
      padding: isMobile ? "12px 8px 24px" : "32px 24px 40px",
      maxWidth: isMobile ? "100%" : 1420,
      margin: "0 auto",
      color: PALETTE.ink,
      background: "transparent",
      overflowX: "hidden",
    },
    heroCard: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 28,
      padding: "20px 16px 18px",
      marginBottom: 18,
      background: "#ffffff",
      border: `1px solid ${PALETTE.line}`,
      boxShadow: "none",
    },
    heroTopRow: {
      position: "relative",
      display: "flex",
      justifyContent: "space-between",
      alignItems: isMobile ? "stretch" : "flex-start",
      gap: 16,
      flexWrap: "wrap",
      marginBottom: 16,
    },
    heroActions: {
      display: "flex",
      flexDirection: "column",
      alignItems: isMobile ? "center" : "flex-end",
      gap: 10,
      width: "100%",
    },
    kicker: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: 999,
      marginBottom: 10,
      color: PALETTE.burgundy,
      background: "#ffffff",
      border: `1px solid ${PALETTE.line}`,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
    pageTitle: {
      margin: 0,
      fontSize: "clamp(1.6rem, 2.5vw, 3rem)",
      lineHeight: 1.1,
      color: PALETTE.burgundy,
    },
    pageSubtitle: {
      margin: "10px 0 0",
      maxWidth: 720,
      fontSize: 13.5,
      lineHeight: 1.5,
      color: "rgba(67, 37, 52, 0.82)",
    },
    metricsGrid: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 10,
      width: "100%",
    },
    metricCard: {
      padding: "14px 12px 12px",
      borderRadius: 16,
      background: "#ffffff",
      border: `1px solid ${PALETTE.line}`,
      backdropFilter: "blur(12px)",
      textAlign: "center",
    },
    metricLabel: {
      display: "block",
      fontSize: 11.5,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "rgba(67, 37, 52, 0.72)",
      lineHeight: 1.2,
      textAlign: "center",
    },
    metricValue: {
      display: "block",
      marginTop: 8,
      fontSize: 24,
      lineHeight: 1,
      color: PALETTE.burgundy,
      textAlign: "center",
    },
    input: {
      width: "100%",
      minHeight: 46,
      padding: "11px 14px",
      borderRadius: 14,
      border: `1px solid ${PALETTE.line}`,
      background: "#ffffff",
      color: PALETTE.ink,
      fontSize: 14,
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
      width: isMobile ? "100%" : "auto",
    },
    secondaryBtn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: `1px solid ${PALETTE.line}`,
      background: "#ffffff",
      cursor: "pointer",
      color: PALETTE.ink,
      fontWeight: 600,
      fontSize: 13,
    },
    toolbarCard: {
      padding: "18px 16px 18px",
      marginBottom: 18,
      borderRadius: 24,
      background: "#ffffff",
      border: `1px solid ${PALETTE.line}`,
      boxShadow: "none",
    },
    toolbarHeader: {
      marginBottom: 12,
    },
    sectionTitle: {
      margin: 0,
      fontSize: 18,
      color: PALETTE.burgundy,
    },
    sectionSubtitle: {
      margin: "4px 0 0",
      fontSize: 12.5,
      color: "rgba(67, 37, 52, 0.72)",
    },
    toolbarGrid: {
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : (isCompact ? "minmax(180px, 240px) minmax(220px, 1fr)" : "minmax(190px, 260px) minmax(260px, 1fr)"),
      gap: 12,
      alignItems: "end",
    },
    controlGroup: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    controlGroupWide: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    controlLabel: {
      fontSize: 11.5,
      fontWeight: 700,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "rgba(67, 37, 52, 0.72)",
    },
    loadingCard: {
      padding: "28px 20px",
      borderRadius: 24,
      background: "#ffffff",
      border: `1px solid ${PALETTE.line}`,
      boxShadow: "none",
      color: PALETTE.burgundy,
      fontWeight: 600,
      textAlign: "center",
    },
    tableCard: {
      position: "relative",
      padding: 0,
      borderRadius: 20,
      background: "#ffffff",
      border: `1px solid ${PALETTE.line}`,
      boxShadow: "none",
      overflow: "hidden",
    },
    scrollHint: {
      display: isMobile ? "block" : "none",
      padding: "10px 12px 0",
      fontSize: 11.5,
      color: "rgba(67, 37, 52, 0.68)",
    },
    tableScroller: {
      overflowX: isMobile ? "auto" : "visible",
      borderRadius: 20,
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "thin",
      scrollbarColor: `${PALETTE.mauve} rgba(232, 161, 179, 0.18)`,
      position: "relative",
      paddingBottom: isMobile ? 6 : 0,
    },
    scrollFadeLeft: {
      position: "sticky",
      left: 0,
      top: 0,
      bottom: 0,
      width: isMobile ? 12 : 0,
      background: isMobile ? "linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0) 100%)" : "transparent",
      pointerEvents: "none",
      zIndex: 3,
      float: "left",
    },
    scrollFadeRight: {
      position: "sticky",
      right: 0,
      top: 0,
      bottom: 0,
      width: isMobile ? 12 : 0,
      marginLeft: "auto",
      background: isMobile ? "linear-gradient(270deg, #ffffff 0%, rgba(255,255,255,0) 100%)" : "transparent",
      pointerEvents: "none",
      zIndex: 3,
      float: "right",
    },
    table: {
      width: isMobile ? "max-content" : "100%",
      minWidth: isMobile ? 640 : 0,
      borderCollapse: "separate",
      borderSpacing: 0,
      tableLayout: isMobile ? "auto" : "fixed",
    },
    headerRow: {
      textAlign: "left",
      background: "#ffffff",
    },
    th: {
      padding: isMobile ? "10px 6px" : "16px 18px",
      fontSize: isMobile ? 10.5 : 12,
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: "rgba(67, 37, 52, 0.74)",
      borderBottom: `1px solid ${PALETTE.line}`,
      whiteSpace: isMobile ? "nowrap" : "normal",
      textAlign: "left",
    },
    thCenter: {
      padding: isMobile ? "10px 6px" : "16px 18px",
      fontSize: isMobile ? 10.5 : 12,
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: "rgba(67, 37, 52, 0.74)",
      borderBottom: `1px solid ${PALETTE.line}`,
      whiteSpace: isMobile ? "nowrap" : "normal",
      textAlign: "center",
    },
    td: {
      padding: isMobile ? "10px 6px" : "18px 18px",
      fontSize: isMobile ? 12 : 14,
      color: PALETTE.ink,
      borderTop: `1px solid ${PALETTE.line}`,
      verticalAlign: "top",
      whiteSpace: isMobile ? "nowrap" : "normal",
      textAlign: "left",
    },
    tdCenter: {
      padding: isMobile ? "10px 6px" : "18px 18px",
      fontSize: isMobile ? 12 : 14,
      color: PALETTE.ink,
      borderTop: `1px solid ${PALETTE.line}`,
      verticalAlign: "top",
      whiteSpace: isMobile ? "nowrap" : "normal",
      textAlign: "center",
    },
    bodyRow: {
      background: "#ffffff",
    },
    memberCell: {
      padding: isMobile ? "10px 6px" : "18px 18px",
      fontSize: isMobile ? 12 : 14,
      color: PALETTE.ink,
      borderTop: `1px solid ${PALETTE.line}`,
      minWidth: isMobile ? 110 : 0,
      width: isMobile ? 110 : "18%",
      verticalAlign: "top",
      textAlign: "left",
    },
    memberName: {
      fontWeight: 700,
      color: PALETTE.burgundy,
      fontSize: isMobile ? 12.5 : 14,
    },
    memberSubtext: {
      marginTop: 3,
      fontSize: 11,
      color: "rgba(67, 37, 52, 0.62)",
    },
    statusCell: {
      padding: isMobile ? "10px 6px" : "18px 18px",
      borderTop: `1px solid ${PALETTE.line}`,
      minWidth: isMobile ? 110 : 0,
      width: isMobile ? 110 : "16%",
      verticalAlign: "top",
      textAlign: "center",
    },
    statusWrap: {
      display: "flex",
      gap: 4,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    statusBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      minHeight: 24,
      padding: "2px 8px",
      borderRadius: 999,
      background: "#ffffff",
      color: PALETTE.burgundy,
      border: `1px solid ${PALETTE.line}`,
      fontSize: 11,
      fontWeight: 600,
    },
    statusIcon: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 14,
      height: 14,
      borderRadius: "50%",
      background: "#ffffff",
      fontSize: 9,
    },
    numberCell: {
      padding: isMobile ? "10px 4px" : "18px 18px",
      fontSize: isMobile ? 12 : 14,
      fontWeight: 600,
      color: PALETTE.ink,
      borderTop: `1px solid ${PALETTE.line}`,
      textAlign: "center",
      verticalAlign: "top",
      minWidth: isMobile ? 38 : 0,
      width: isMobile ? 38 : "7.25%",
    },
    totalCell: {
      padding: isMobile ? "10px 4px" : "18px 18px",
      fontSize: isMobile ? 12 : 14,
      fontWeight: 800,
      color: PALETTE.burgundy,
      borderTop: `1px solid ${PALETTE.line}`,
      textAlign: "center",
      verticalAlign: "top",
      minWidth: isMobile ? 44 : 0,
      width: isMobile ? 44 : "8%",
    },
    meetsBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 52,
      minHeight: 26,
      padding: "2px 8px",
      borderRadius: 999,
      background: "#ffffff",
      color: PALETTE.burgundy,
      border: `1px solid ${PALETTE.line}`,
      fontSize: 11.5,
      fontWeight: 700,
    },
    needsBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 52,
      minHeight: 26,
      padding: "2px 8px",
      borderRadius: 999,
      background: "#ffffff",
      color: PALETTE.ink,
      border: `1px solid ${PALETTE.line}`,
      fontSize: 11.5,
      fontWeight: 700,
    },
    emptyCell: {
      padding: "28px 18px",
      textAlign: "center",
      fontSize: 14,
      color: "rgba(67, 37, 52, 0.7)",
    },
    headerPill: (key) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: isMobile ? 4 : 8,
      minHeight: 26,
      padding: isMobile ? "3px 6px" : "6px 10px",
      borderRadius: 999,
      background: CATEGORY_META[key]?.tint || "#ffffff",
      color: PALETTE.burgundy,
      fontSize: isMobile ? 10.5 : 12,
    }),
    headerIcon: {
      width: 16,
      height: 16,
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#ffffff",
      fontSize: 10,
      fontWeight: 800,
    },
    errorBanner: {
      marginBottom: 16,
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(111, 34, 50, 0.18)",
      background: "rgba(255, 238, 241, 0.95)",
      color: PALETTE.burgundy,
      fontSize: 13,
    },
    paginationRow: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      justifyContent: isMobile ? "center" : "space-between",
      marginTop: 14,
      flexWrap: "wrap",
    },
    paginationLabel: {
      fontSize: 13,
      color: "rgba(67, 37, 52, 0.76)",
    },
    tooltip: {
      position: isMobile ? "relative" : "fixed",
      right: isMobile ? "auto" : 20,
      bottom: isMobile ? "auto" : 20,
      left: isMobile ? "auto" : undefined,
      margin: isMobile ? "12px 0 0" : 0,
      background: "#ffffff",
      border: `1px solid ${PALETTE.line}`,
      borderRadius: 18,
      padding: 14,
      boxShadow: PALETTE.shadow,
      width: "100%",
      zIndex: 50,
    },
    tooltipHeader: {
      display: "flex",
      justifyContent: "space-between",
      gap: 10,
      alignItems: "flex-start",
      marginBottom: 10,
    },
    tooltipName: {
      fontSize: 15,
      fontWeight: 700,
      color: PALETTE.burgundy,
    },
    tooltipSubtitle: {
      marginTop: 3,
      fontSize: 11.5,
      color: "rgba(67, 37, 52, 0.66)",
    },
    tooltipList: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    tooltipRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: 10,
      alignItems: "center",
    },
    tooltipCategory: (categoryKey) => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      minHeight: 26,
      padding: "4px 8px",
      borderRadius: 999,
      background: CATEGORY_META[categoryKey].tint,
      color: PALETTE.burgundy,
      fontSize: 11.5,
      fontWeight: 700,
    }),
    tooltipValue: {
      fontSize: 12.5,
      fontWeight: 700,
      color: PALETTE.ink,
    },
    tooltipNeed: {
      fontSize: 11.5,
      fontWeight: 500,
      color: "rgba(67, 37, 52, 0.66)",
    },
    tooltipRuleNote: {
      fontSize: 12,
      lineHeight: 1.4,
      color: "rgba(67, 37, 52, 0.78)",
    },
  };
}