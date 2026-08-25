import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const ROLE_OPTIONS = [
  "pending", "pnm", "candidate", "candOfficer", "member",
  "alumni", "officer", "exec", "webmaster", "webdev",
];

const MEMBER_STATUS_OPTIONS = [
  "active", "inactive", "probation", "seniorStatus",
  "co-op", "dropped",
];
const SCHOLARSHIP_OPTIONS = [0, 25, 50, 75, 100];

const EXEC_OPTIONS = [
  "PRESIDENT", "VP_STANDARDS", "VP_COMMUNICATIONS", "VP_FINANCE",
  "VP_SOCIAL", "VP_SERVICE", "VP_SCHOLARSHIP", "VP_MEMBERSHIP",
];

const POSITION_OPTIONS = [
  "SISTER_AT_LARGE",
  "SERGEANT_AT_ARMS", "STANDARDS_BOARD",
  "WEBMASTER", "WEBDEV", "PR_DIRECTOR", "BEC_REP",
  "FUNDRAISING", "MEMORABILIA",
  "SISTERHOOD", "FAM_ALUM", "BANQUET", "POWER_PENGUIN",
  "PHILANTHROPY", "STEM_CHAIR",
  "PROFESSIONAL_DEV",
  "MEM_ED", "RECRUITMENT_BOARD",
  "SPONSORSHIP_CHAIR",
];

function canAccessAdminUsers(user) {
  if (!user) return false;
  const roles = Array.isArray(user.role) ? user.role : (user.role ? [user.role] : []);
  const positions = Array.isArray(user.positions) ? user.positions : [];
  if (roles.some((role) => ["webmaster", "webdev"].includes(String(role).toLowerCase()))) return true;
  return positions.some(position => ["WEBMASTER", "WEBDEV"].includes(position?.key));
}

function canManageScholarship(user) {
  const positions = Array.isArray(user?.positions) ? user.positions : [];
  return positions.some(position => position?.key === "VP_FINANCE");
}

export default function AdminApprovals() {
  const { user } = useAuth();
  const allowed = canAccessAdminUsers(user);
  const [scholarshipAccessFromApi, setScholarshipAccessFromApi] = useState(false);
  const scholarshipAllowed = canManageScholarship(user) || scholarshipAccessFromApi;
  const userId = user?._id || user?.id;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [roleSel, setRoleSel] = useState({});
  const [statusSel, setStatusSel] = useState({});
  const [scholarshipSel, setScholarshipSel] = useState({});
  const [posSel, setPosSel] = useState({});

  const headers = useMemo(() => (
    userId
      ? { Authorization: `Bearer ${userId}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" }
  ), [userId]);

  const load = useCallback(async () => {
    if (!allowed) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/pending", { headers, credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || "Failed to load pending users");
      setRows(Array.isArray(data) ? data : []);
      setScholarshipAccessFromApi(
        Array.isArray(data) && data.some(u => Object.prototype.hasOwnProperty.call(u, "scholarship"))
      );
      const initRoles = {}, initStatus = {}, initScholarship = {}, initPos = {};
      (Array.isArray(data) ? data : []).forEach(u => {
        initRoles[u._id] = [];
        initStatus[u._id] = [];
        initScholarship[u._id] = Number(u.scholarship ?? 0);
        initPos[u._id] = [];
      });
      setRoleSel(initRoles);
      setStatusSel(initStatus);
      setScholarshipSel(initScholarship);
      setPosSel(initPos);
    } catch (e) {
      console.error(e);
      setScholarshipAccessFromApi(false);
      setMsg("Failed to load pending users.");
    } finally {
      setLoading(false);
    }
  }, [allowed, headers]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setMsg("");
    try {
      const body = {};
      if (roleSel[id]?.length) body.role = roleSel[id];
      if (statusSel[id]?.length) body.memberStatus = statusSel[id];
      if (scholarshipAllowed) body.scholarship = Number(scholarshipSel[id] ?? 0);
      if (posSel[id]?.length) body.positions = posSel[id];

      const r = await fetch(`/api/admin/approve/${id}`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Approve failed");
      }
      await load();
      setMsg("Approved!");
    } catch (e) {
      console.error(e);
      setMsg("❌ " + e.message);
    }
  };

  const reject = async (id) => {
    setMsg("");
    try {
      const r = await fetch(`/api/admin/reject/${id}`, { method: "DELETE", headers, credentials: "include" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Reject failed");
      }
      await load();
      setMsg("Rejected.");
    } catch (e) {
      console.error(e);
      setMsg("❌ " + e.message);
    }
  };

  const handleMultiChange = (e, setter, id) => {
    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
    setter(prev => ({ ...prev, [id]: selected }));
  };

  if (!allowed) {
    return <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>You do not have permission to access pending approvals.</div>;
  }

  return (
    <div style={{ padding: "16px 12px", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        Pending Approvals
      </h1>
      {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div>No pending users.</div>
      ) : (
        <div style={{ width: "100%", overflowX: "-webkit-paged-x", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f3f4f6" }}>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Emails</th>
                <th style={{ padding: 8 }}>Roles</th>
                <th style={{ padding: 8 }}>Member Status</th>
                <th style={{ padding: 8 }}>Positions</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u._id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>{u.firstName} {u.lastName}</td>
                  <td style={{ padding: 8 }}>
                    <div>{u.personalEmail}</div>
                    <div style={{ opacity: 0.8, fontSize: 12 }}>{u.ufEmail || "-"}</div>
                  </td>

                  {/* Roles multi-select */}
                  <td style={{ padding: 8 }}>
                    <select
                      multiple
                      size={4}
                      value={roleSel[u._id] || []}
                      onChange={(e) => handleMultiChange(e, setRoleSel, u._id)}
                      style={{ width: "100%", minWidth: 140, padding: 6 }}
                    >
                      {ROLE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>

                  {/* Member status multi-select */}
                  <td style={{ padding: 8 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <select
                        multiple
                        size={4}
                        value={statusSel[u._id] || []}
                        onChange={(e) => handleMultiChange(e, setStatusSel, u._id)}
                        style={{ width: "100%", minWidth: 140, padding: 6 }}
                      >
                        {MEMBER_STATUS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {scholarshipAllowed && (
                        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "#432534", fontWeight: 600 }}>
                          Scholarship
                          <select
                            value={Number(scholarshipSel[u._id] ?? 0)}
                            onChange={(e) => setScholarshipSel(prev => ({ ...prev, [u._id]: Number(e.target.value) }))}
                            style={{ width: "100%", minWidth: 140, padding: 6 }}
                          >
                            {SCHOLARSHIP_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}%</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </td>

                  {/* Positions multi-select */}
                  <td style={{ padding: 8 }}>
                    <select
                      multiple
                      size={6}
                      value={posSel[u._id] || []}
                      onChange={(e) => handleMultiChange(e, setPosSel, u._id)}
                      style={{ width: "100%", minWidth: 200, padding: 6 }}
                    >
                      <optgroup label="Exec Seats">
                        {EXEC_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Boards / Officers">
                        {POSITION_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                    </select>
                  </td>

                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => approve(u._id)}
                        style={{ padding: "6px 10px" }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(u._id)}
                        style={{ padding: "6px 10px", background: "#eee" }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}