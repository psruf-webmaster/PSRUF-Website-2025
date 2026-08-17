import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../context/AuthContext";

const ROLE_OPTIONS = [
  "pending",
  "pnm",
  "candidate",
  "candOfficer",
  "member",
  "alumni",
  "officer",
  "exec",
  "webmaster",
  "webdev",
];

const MEMBER_STATUS_OPTIONS = [
  "active",
  "inactive",
  "probation",
  "seniorStatus",
  "co-op",
  "dropped",
];

const SCHOLARSHIP_OPTIONS = [0, 25, 50, 75, 100];

const EXEC_OPTIONS = [
  "PRESIDENT",
  "VP_STANDARDS",
  "VP_COMMUNICATIONS",
  "VP_FINANCE",
  "VP_SOCIAL",
  "VP_SERVICE",
  "VP_SCHOLARSHIP",
  "VP_MEMBERSHIP",
];

const POSITION_OPTIONS = [
  "SISTER_AT_LARGE",
  "SERGEANT_AT_ARMS",
  "STANDARDS_BOARD",
  "WEBMASTER",
  "WEBDEV",
  "PR_DIRECTOR",
  "BEC_REP",
  "FUNDRAISING",
  "MEMORABILIA",
  "SISTERHOOD",
  "FAM_ALUM",
  "BANQUET",
  "POWER_PENGUIN",
  "PHILANTHROPY",
  "STEM_CHAIR",
  "PROFESSIONAL_DEV",
  "MEM_ED",
  "RECRUITMENT_BOARD",
];

const ALL_POSITION_OPTIONS = [
  ...EXEC_OPTIONS,
  ...POSITION_OPTIONS,
];

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

const STATUS_TABS = {
  pending: {
    label: "Pending",
    icon: "◌",
  },
  approved: {
    label: "Approved",
    icon: "✓",
  },
  rejected: {
    label: "Rejected",
    icon: "−",
  },
};

function canAccessAdminUsers(user) {
  if (!user) return false;

  const roles = Array.isArray(user.role)
    ? user.role
    : user.role
      ? [user.role]
      : [];

  const positions = Array.isArray(user.positions)
    ? user.positions
    : [];

  if (roles.includes("webmaster")) {
    return true;
  }

  return positions.some((position) =>
    [
      "PRESIDENT",
      "VP_STANDARDS",
      "VP_FINANCE",
      "WEBMASTER",
    ].includes(position?.key)
  );
}

function canManageScholarship(user) {
  const positions = Array.isArray(user?.positions)
    ? user.positions
    : [];

  return positions.some(
    (position) => position?.key === "VP_FINANCE"
  );
}

function Multi({
  options,
  value,
  onChange,
  size = 5,
  width = "100%",
}) {
  const handle = (e) => {
    const selected = Array.from(
      e.target.selectedOptions
    ).map((o) => o.value);

    onChange(selected);
  };

  return (
    <select
      multiple
      size={size}
      value={value}
      onChange={handle}
      style={styles.multi(width)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}) {
  if (!open) return null;

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard}>
        <h2 style={styles.modalTitle}>{title}</h2>

        {children}

        <div style={styles.modalActions}>
          <button
            onClick={onClose}
            style={styles.secondaryBtn}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const {
    user,
    refreshUser,
  } = useAuth();

  const allowed = canAccessAdminUsers(user);
  const scholarshipAllowed = canManageScholarship(user);

  const userId = user?._id || user?.id;

  const [viewportWidth, setViewportWidth] =
    useState(() =>
      typeof window === "undefined"
        ? 1400
        : window.innerWidth
    );

  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [roleEdit, setRoleEdit] = useState({});
  const [statusEdit, setStatusEdit] = useState({});
  const [scholarshipEdit, setScholarshipEdit] =
    useState({});

  const [addPos, setAddPos] = useState({});
  const [removePos, setRemovePos] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);

  const isMobile = viewportWidth < 1024;

  const headers = useMemo(
    () =>
      userId
        ? {
            Authorization: `Bearer ${userId}`,
            "Content-Type": "application/json",
          }
        : {
            "Content-Type": "application/json",
          },
    [userId]
  );

  const load = useCallback(async () => {
    if (!allowed) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const r = await fetch(
        `/api/admin/users?state=${tab}`,
        {
          headers,
          credentials: "include",
        }
      );

      const data = await r.json();

      if (!r.ok) {
        throw new Error(
          data.message || "Failed to load users"
        );
      }

      const users = Array.isArray(data) ? data : [];

      setRows(users);

      const roles = {};
      const statuses = {};
      const scholarships = {};
      const adds = {};
      const removes = {};

      users.forEach((u) => {
        roles[u._id] = u.role || [];
        statuses[u._id] = u.memberStatus || [];

        scholarships[u._id] = Number(
          u.scholarship ?? 0
        );

        adds[u._id] = [];
        removes[u._id] = [];
      });

      setRoleEdit(roles);
      setStatusEdit(statuses);
      setScholarshipEdit(scholarships);
      setAddPos(adds);
      setRemovePos(removes);
    } catch (e) {
      console.error(e);
      setMsg("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [allowed, headers, tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (allowed) {
      refreshUser();
    }
  }, [allowed, refreshUser]);

  useEffect(() => {
    const handleResize = () =>
      setViewportWidth(window.innerWidth);

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);

  const savePositions = async (id) => {
    const add = addPos[id] || [];
    const remove = removePos[id] || [];

    if (add.length === 0 && remove.length === 0) {
      return null;
    }

    const res = await fetch(
      `/api/admin/users/${id}/positions`,
      {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({
          add,
          remove,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message ||
          "Positions update failed"
      );
    }

    return data;
  };

  const updateScholarship = async (
    id,
    scholarship
  ) => {
    try {
      setScholarshipEdit((prev) => ({
        ...prev,
        [id]: scholarship,
      }));

      const res = await fetch(
        `/api/admin/users/${id}/scholarship`,
        {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({
            scholarship,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Scholarship update failed"
        );
      }

      setMsg(
        `Scholarship updated to ${scholarship}%`
      );

      await load();
    } catch (e) {
      console.error(e);
      setMsg("❌ " + e.message);
    }
  };

  const updateRolesStatus = async (id) => {
    try {
      const hasPositionChanges =
        (addPos[id] || []).length > 0 ||
        (removePos[id] || []).length > 0;

      const res = await fetch(
        `/api/admin/users/${id}/roles-status`,
        {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({
            role: roleEdit[id] || [],
            memberStatus:
              statusEdit[id] || [],
            ...(scholarshipAllowed
              ? {
                  scholarship: Number(
                    scholarshipEdit[id] ?? 0
                  ),
                }
              : {}),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Update failed"
        );
      }

      if (hasPositionChanges) {
        await savePositions(id);
      }

      await refreshUser();
      await load();

      if (
        scholarshipAllowed &&
        hasPositionChanges
      ) {
        setMsg(
          "Roles, status, scholarship, and positions updated"
        );
      } else if (scholarshipAllowed) {
        setMsg(
          "Roles, status, and scholarship updated"
        );
      } else if (hasPositionChanges) {
        setMsg(
          "Roles, status, and positions updated"
        );
      } else {
        setMsg(
          "Roles and status updated"
        );
      }
    } catch (e) {
      console.error(e);
      setMsg("❌ " + e.message);
    }
  };

  const openHistory = (selectedUser) => {
    setModalUser(selectedUser);
    setModalOpen(true);
  };

  if (!allowed) {
    return (
      <div style={styles.unauthorized}>
        You do not have permission to access Admin
        Users.
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.heroCard}>
        <div style={styles.heroContent}>
          <div>
            <div style={styles.kicker}>
              Administrative Member Controls
            </div>

            <h1 style={styles.pageTitle}>
              Users
            </h1>

            <p style={styles.pageSubtitle}>
              Review approval states, update member
              roles and statuses, and manage
              position assignments.
            </p>
          </div>
        </div>

        <div style={styles.tabRow}>
          {[
            "pending",
            "approved",
            "rejected",
          ].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={
                tab === t
                  ? styles.activeTab
                  : styles.tab
              }
            >
              <span style={styles.tabIcon}>
                {STATUS_TABS[t].icon}
              </span>

              {STATUS_TABS[t].label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={styles.message}>
          {msg}
        </div>
      )}

      {loading ? (
        <div style={styles.emptyState}>
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={styles.emptyState}>
          No users in this state.
        </div>
      ) : (
        <div style={styles.tableCard}>
          <div style={styles.tableScroller(isMobile)}>
            <table style={styles.table(isMobile)}>
              <thead>
                <tr style={styles.headerRow}>
                  <th style={styles.nameHeader}>Name</th>
                  <th style={styles.emailHeader}>Emails</th>
                  <th style={styles.multiHeader}>Roles</th>
                  <th style={styles.multiHeader}>Member Status</th>
                  <th style={styles.multiWideHeader}>Add Positions</th>
                  <th style={styles.multiWideHeader}>Remove Positions</th>
                  <th style={styles.positionsHeader}>Current Positions</th>
                  <th style={styles.actionsHeader}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((u) => {
                  const currentPositionKeys =
                    (u.positions || []).map(
                      (p) => p.key
                    );

                  const availableToAdd =
                    ALL_POSITION_OPTIONS.filter(
                      (key) =>
                        !currentPositionKeys.includes(
                          key
                        )
                    );

                  const availableToRemove =
                    currentPositionKeys;

                  return (
                    <tr
                      key={u._id}
                      style={styles.bodyRow}
                    >
                      <td style={styles.nameCell}>
                        <div
                          style={
                            styles.namePrimary
                          }
                        >
                          {u.firstName}{" "}
                          {u.lastName}
                        </div>

                        <div
                          style={
                            styles.nameSecondary
                          }
                        >
                          Approval state:{" "}
                          {u.approvalState ||
                            tab}
                        </div>
                      </td>

                      <td style={styles.emailCell}>
                        <div>
                          {u.personalEmail}
                        </div>

                        <div
                          style={
                            styles.emailSubtext
                          }
                        >
                          {u.ufEmail || "-"}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <Multi
                          options={
                            ROLE_OPTIONS
                          }
                          value={
                            roleEdit[u._id] ||
                            []
                          }
                          onChange={(arr) =>
                            setRoleEdit(
                              (prev) => ({
                                ...prev,
                                [u._id]: arr,
                              })
                            )
                          }
                          size={5}
                          width={140}
                        />
                      </td>

                      <td style={styles.td}>
                        <div
                          style={
                            styles.fieldStack
                          }
                        >
                          <Multi
                            options={
                              MEMBER_STATUS_OPTIONS
                            }
                            value={
                              statusEdit[
                                u._id
                              ] || []
                            }
                            onChange={(arr) =>
                              setStatusEdit(
                                (prev) => ({
                                  ...prev,
                                  [u._id]: arr,
                                })
                              )
                            }
                            size={5}
                            width={140}
                          />

                          {scholarshipAllowed && (
                            <label
                              style={
                                styles.inlineFieldLabel
                              }
                            >
                              <span
                                style={
                                  styles.inlineFieldText
                                }
                              >
                                Scholarship
                              </span>

                              <select
                                value={Number(
                                  scholarshipEdit[
                                    u._id
                                  ] ?? 0
                                )}
                                onChange={(e) =>
                                  updateScholarship(
                                    u._id,
                                    Number(
                                      e.target
                                        .value
                                    )
                                  )
                                }
                                style={
                                  styles.scholarshipSelect
                                }
                              >
                                {SCHOLARSHIP_OPTIONS.map(
                                  (option) => (
                                    <option
                                      key={
                                        option
                                      }
                                      value={
                                        option
                                      }
                                    >
                                      {option}%
                                    </option>
                                  )
                                )}
                              </select>

                              <span
                                style={
                                  styles.inlineFieldHint
                                }
                              >
                                Saves immediately
                              </span>
                            </label>
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <Multi
                          options={
                            availableToAdd
                          }
                          value={
                            addPos[u._id] ||
                            []
                          }
                          onChange={(arr) =>
                            setAddPos(
                              (prev) => ({
                                ...prev,
                                [u._id]: arr,
                              })
                            )
                          }
                          size={7}
                          width={180}
                        />
                      </td>

                      <td style={styles.td}>
                        <Multi
                          options={
                            availableToRemove
                          }
                          value={
                            removePos[u._id] ||
                            []
                          }
                          onChange={(arr) =>
                            setRemovePos(
                              (prev) => ({
                                ...prev,
                                [u._id]: arr,
                              })
                            )
                          }
                          size={7}
                          width={180}
                        />
                      </td>

                      <td
                        style={
                          styles.positionsCell
                        }
                      >
                        {(u.positions || [])
                          .length === 0 ? (
                          <div>-</div>
                        ) : (
                          <ul
                            style={
                              styles.positionList
                            }
                          >
                            {u.positions.map(
                              (p, idx) => (
                                <li
                                  key={idx}
                                  style={
                                    styles.positionItem
                                  }
                                >
                                  {p.title ||
                                    p.key}

                                  {p.startDate
                                    ? ` (${new Date(
                                        p.startDate
                                      ).toLocaleDateString()})`
                                    : ""}
                                </li>
                              )
                            )}
                          </ul>
                        )}
                      </td>

                      <td
                        style={
                          styles.actionsCell
                        }
                      >
                        <div
                          style={
                            styles.actionsStack
                          }
                        >
                          <button
                            onClick={() =>
                              updateRolesStatus(
                                u._id
                              )
                            }
                            style={
                              styles.primaryActionBtn
                            }
                            title="Save roles, member status, scholarship, and positions"
                          >
                            Save
                          </button>

                          <div
                            style={
                              styles.secondaryActionRow
                            }
                          >
                            <button
                              onClick={() =>
                                openHistory(u)
                              }
                              style={
                                styles.ghostActionBtn
                              }
                              title="View role, status, and position history"
                            >
                              History
                            </button>
                          </div>

                          {tab ===
                            "pending" && (
                            <a
                              href="/admin/approvals"
                              style={
                                styles.inlineActionLink
                              }
                            >
                              Open approvals
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          HISTORY MODAL
          ============================================================ */}

      <Modal
        open={modalOpen}
        onClose={() =>
          setModalOpen(false)
        }
        title={
          modalUser
            ? `${modalUser.firstName} ${modalUser.lastName} — History`
            : ""
        }
      >
        {!modalUser ? (
          <p>Loading...</p>
        ) : (
          <>
            <h3
              style={
                styles.historyHeading
              }
            >
              Position History
            </h3>

            {modalUser.positionsHistory
              ?.length ? (
              <ul
                style={
                  styles.historyList
                }
              >
                {[
                  ...modalUser.positionsHistory,
                ]
                  .sort(
                    (a, b) =>
                      new Date(
                        b.endDate ||
                          b.startDate ||
                          0
                      ) -
                      new Date(
                        a.endDate ||
                          a.startDate ||
                          0
                      )
                  )
                  .map((p, idx) => (
                    <li
                      key={idx}
                      style={
                        styles.historyItem
                      }
                    >
                      <strong>
                        {p.title ||
                          p.key}
                      </strong>

                      {p.exec && (
                        <span>
                          {" "}
                          — under{" "}
                          {p.exec}
                        </span>
                      )}

                      <div
                        style={
                          styles.historyMeta
                        }
                      >
                        {p.startDate
                          ? new Date(
                              p.startDate
                            ).toLocaleDateString()
                          : "—"}

                        {" → "}

                        {p.endDate
                          ? new Date(
                              p.endDate
                            ).toLocaleDateString()
                          : "Present"}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p
                style={
                  styles.historyEmpty
                }
              >
                No previous positions.
              </p>
            )}

            <h3
              style={
                styles.historyHeadingSpaced
              }
            >
              Role History
            </h3>

            {modalUser.roleHistory
              ?.length ? (
              <ul
                style={
                  styles.historyList
                }
              >
                {[
                  ...modalUser.roleHistory,
                ]
                  .sort(
                    (a, b) =>
                      new Date(b.at) -
                      new Date(a.at)
                  )
                  .map((h, idx) => (
                    <li
                      key={idx}
                      style={
                        styles.historyItem
                      }
                    >
                      <strong>
                        {(h.values || [])
                          .join(", ") ||
                          "—"}
                      </strong>

                      <div
                        style={
                          styles.historyMeta
                        }
                      >
                        {h.at
                          ? new Date(
                              h.at
                            ).toLocaleString()
                          : ""}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p
                style={
                  styles.historyEmpty
                }
              >
                No role changes recorded.
              </p>
            )}

            <h3
              style={
                styles.historyHeadingSpaced
              }
            >
              Member Status History
            </h3>

            {modalUser
              .memberStatusHistory
              ?.length ? (
              <ul
                style={
                  styles.historyList
                }
              >
                {[
                  ...modalUser.memberStatusHistory,
                ]
                  .sort(
                    (a, b) =>
                      new Date(b.at) -
                      new Date(a.at)
                  )
                  .map((h, idx) => (
                    <li
                      key={idx}
                      style={
                        styles.historyItem
                      }
                    >
                      <strong>
                        {(h.values || [])
                          .join(", ") ||
                          "—"}
                      </strong>

                      <div
                        style={
                          styles.historyMeta
                        }
                      >
                        {h.at
                          ? new Date(
                              h.at
                            ).toLocaleString()
                          : ""}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p
                style={
                  styles.historyEmpty
                }
              >
                No member-status changes
                recorded.
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100%",
    padding: "32px 24px 40px",
    maxWidth: 1380,
    margin: "0 auto",
    color: PALETTE.ink,
    background: "transparent",
  },

  unauthorized: {
    padding: 24,
    maxWidth: 760,
    margin: "0 auto",
  },

  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    padding: "28px 28px 24px",
    marginBottom: 18,
    background: "#ffffff",
    border: `1px solid ${PALETTE.line}`,
    boxShadow: PALETTE.shadow,
  },

  heroContent: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 18,
  },

  kicker: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 12px",
    borderRadius: 999,
    marginBottom: 14,
    color: PALETTE.burgundy,
    background: "#ffffff",
    border: `1px solid ${PALETTE.line}`,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  pageTitle: {
    margin: 0,
    fontSize: "clamp(2rem, 3vw, 3.1rem)",
    lineHeight: 1,
    color: PALETTE.burgundy,
  },

  pageSubtitle: {
    margin: "12px 0 0",
    maxWidth: 760,
    fontSize: 15,
    lineHeight: 1.65,
    color: "rgba(67, 37, 52, 0.82)",
  },

  tabRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },

  tab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    padding: "10px 16px",
    borderRadius: 999,
    border: `1px solid ${PALETTE.line}`,
    background: "#ffffff",
    color: PALETTE.ink,
    fontWeight: 700,
    cursor: "pointer",
  },

  activeTab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    padding: "10px 16px",
    borderRadius: 999,
    border:
      "1px solid rgba(111, 34, 50, 0.18)",
    background: PALETTE.blush,
    color: PALETTE.burgundy,
    fontWeight: 800,
    cursor: "pointer",
  },

  tabIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#ffffff",
    fontSize: 12,
  },

  message: {
    marginBottom: 16,
    padding: "12px 14px",
    borderRadius: 14,
    border:
      "1px solid rgba(111, 34, 50, 0.18)",
    background: PALETTE.blush,
    color: PALETTE.burgundy,
  },

  emptyState: {
    padding: "28px 20px",
    borderRadius: 24,
    background: "#ffffff",
    border: `1px solid ${PALETTE.line}`,
    boxShadow:
      "0 10px 30px rgba(111, 34, 50, 0.06)",
    color: PALETTE.burgundy,
    fontWeight: 600,
  },

  tableCard: {
    position: "relative",
    borderRadius: 24,
    background: "#ffffff",
    border: `1px solid ${PALETTE.line}`,
    boxShadow:
      "0 10px 30px rgba(111, 34, 50, 0.05)",
    overflow: "hidden",
  },

  tableScroller: (isMobile) => ({
    overflowX: isMobile ? "auto" : "visible",
    WebkitOverflowScrolling: "touch",
  }),

  table: (isMobile) => ({
    width: "100%",
    minWidth: isMobile ? 1180 : 0,
    borderCollapse: "separate",
    borderSpacing: 0,
    tableLayout: isMobile ? "auto" : "fixed",
  }),

  headerRow: {
    textAlign: "left",
    background: "#ffffff",
  },

  nameHeader: {
    padding: "16px 12px",
    width: "12%",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
  },

  emailHeader: {
    padding: "16px 12px",
    width: "16%",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
  },

  multiHeader: {
    padding: "16px 12px",
    width: "16%",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
  },

  multiWideHeader: {
    padding: "16px 12px",
    width: "18%",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
  },

  positionsHeader: {
    padding: "16px 12px",
    width: "13%",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
  },

  actionsHeader: {
    padding: "16px 12px",
    width: "11%",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.74)",
    borderBottom: `1px solid ${PALETTE.line}`,
  },

  td: {
    padding: "18px 12px",
    fontSize: 14,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    verticalAlign: "top",
  },

  fieldStack: {
    display: "grid",
    gap: 10,
  },

  inlineFieldLabel: {
    display: "grid",
    gap: 6,
  },

  inlineFieldText: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "rgba(67, 37, 52, 0.68)",
  },

  scholarshipSelect: {
    width: "100%",
    minHeight: 38,
    padding: "8px 10px",
    borderRadius: 12,
    border: `1px solid ${PALETTE.line}`,
    background: "#ffffff",
    color: PALETTE.ink,
    fontSize: 13,
    fontWeight: 600,
  },

  inlineFieldHint: {
    fontSize: 11,
    color: "rgba(67, 37, 52, 0.62)",
  },

  bodyRow: {
    background: "#ffffff",
  },

  nameCell: {
    padding: "18px 12px",
    borderTop: `1px solid ${PALETTE.line}`,
    minWidth: 0,
    verticalAlign: "top",
    overflowWrap: "anywhere",
  },

  emailCell: {
    padding: "18px 12px",
    fontSize: 14,
    color: PALETTE.ink,
    borderTop: `1px solid ${PALETTE.line}`,
    verticalAlign: "top",
    overflowWrap: "anywhere",
  },

  namePrimary: {
    fontWeight: 700,
    color: PALETTE.burgundy,
  },

  nameSecondary: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(67, 37, 52, 0.62)",
  },

  emailSubtext: {
    opacity: 0.7,
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },

  positionsCell: {
    padding: "18px 12px",
    borderTop: `1px solid ${PALETTE.line}`,
    maxWidth: 0,
    verticalAlign: "top",
    overflowWrap: "anywhere",
  },

  positionList: {
    margin: 0,
    paddingLeft: 18,
    fontSize: 13,
  },

  positionItem: {
    marginBottom: 6,
  },

  actionsCell: {
    padding: "18px 12px",
    borderTop: `1px solid ${PALETTE.line}`,
    verticalAlign: "top",
    minWidth: 0,
  },

  actionsStack: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },

  primaryActionBtn: {
    width: "100%",
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: PALETTE.burgundy,
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    boxShadow:
      "0 10px 18px rgba(111, 34, 50, 0.16)",
  },

  secondaryActionRow: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
  },

  ghostActionBtn: {
    width: "100%",
    minHeight: 40,
    padding: "10px 10px",
    borderRadius: 12,
    border:
      "1px dashed rgba(111, 34, 50, 0.22)",
    background: "#ffffff",
    cursor: "pointer",
    color: PALETTE.burgundy,
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    textAlign: "center",
  },

  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${PALETTE.line}`,
    background: "#ffffff",
    cursor: "pointer",
    color: PALETTE.ink,
    fontWeight: 600,
  },

  inlineActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    padding: "0 10px",
    borderRadius: 999,
    background: PALETTE.blush,
    color: PALETTE.burgundy,
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 700,
  },

  multi: (width) => ({
    width,
    maxWidth: "100%",
    padding: 8,
    borderRadius: 14,
    border: `1px solid ${PALETTE.line}`,
    background: "#ffffff",
    color: PALETTE.ink,
    fontSize: 12,
  }),

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(67, 37, 52, 0.28)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 12,
  },

  modalCard: {
    background: "#ffffff",
    borderRadius: 22,
    padding: 20,
    width: "100%",
    maxWidth: 640,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: PALETTE.shadow,
    border: `1px solid ${PALETTE.line}`,
  },

  modalTitle: {
    marginTop: 0,
    marginBottom: 12,
    color: PALETTE.burgundy,
  },

  modalActions: {
    textAlign: "right",
    marginTop: 16,
  },

  historyHeading: {
    margin: "8px 0",
  },

  historyHeadingSpaced: {
    margin: "16px 0 8px",
  },

  historyList: {
    margin: "0",
    paddingLeft: 18,
  },

  historyItem: {
    marginBottom: 6,
  },

  historyMeta: {
    fontSize: 13,
  },

  historyEmpty: {
    opacity: 0.7,
  },
};