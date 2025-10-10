// client/src/pages/AdminApprovals.js
import React, { useEffect, useState } from "react";

// Constants should match your backend enums
const ROLE_OPTIONS = [
  "pending", "pnm", "candidate", "candOfficer", "member",
  "alumni", "officer", "exec", "webmaster", "webdev",
];

const MEMBER_STATUS_OPTIONS = [
  "active", "inactive", "probation", "seniorStatus",
  "scholarship", "co-op", "dropped",
];

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
  // optionally allow execs as positions
  "PRESIDENT", "VP_STANDARDS", "VP_COMMUNICATIONS", "VP_FINANCE",
  "VP_SOCIAL", "VP_SERVICE", "VP_SCHOLARSHIP", "VP_MEMBERSHIP",
];

export default function AdminApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [roleSel, setRoleSel] = useState({});
  const [statusSel, setStatusSel] = useState({});
  const [posSel, setPosSel] = useState({});

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/pending");
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
      const initRoles = {}, initStatus = {}, initPos = {};
      (Array.isArray(data) ? data : []).forEach(u => {
        initRoles[u._id] = [];
        initStatus[u._id] = [];
        initPos[u._id] = [];
      });
      setRoleSel(initRoles);
      setStatusSel(initStatus);
      setPosSel(initPos);
    } catch (e) {
      console.error(e);
      setMsg("Failed to load pending users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    setMsg("");
    try {
      const body = {};
      if (roleSel[id]?.length) body.role = roleSel[id];
      if (statusSel[id]?.length) body.memberStatus = statusSel[id];
      if (posSel[id]?.length) body.positions = posSel[id];

      const r = await fetch(`/api/admin/approve/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Approve failed");
      }
      await load();
      setMsg("✅ Approved!");
    } catch (e) {
      console.error(e);
      setMsg("❌ " + e.message);
    }
  };

  const reject = async (id) => {
    setMsg("");
    try {
      const r = await fetch(`/api/admin/reject/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Reject failed");
      }
      await load();
      setMsg("🗑️ Rejected.");
    } catch (e) {
      console.error(e);
      setMsg("❌ " + e.message);
    }
  };

  const handleMultiChange = (e, setter, id) => {
    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
    setter(prev => ({ ...prev, [id]: selected }));
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
        Pending Approvals
      </h1>
      {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div>No pending users 🎉</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                <td style={{ padding: 8 }}>{u.firstName} {u.lastName}</td>
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
                    style={{ width: 160, padding: 6 }}
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>

                {/* Member status multi-select */}
                <td style={{ padding: 8 }}>
                  <select
                    multiple
                    size={4}
                    value={statusSel[u._id] || []}
                    onChange={(e) => handleMultiChange(e, setStatusSel, u._id)}
                    style={{ width: 160, padding: 6 }}
                  >
                    {MEMBER_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>

                {/* Positions multi-select */}
                <td style={{ padding: 8 }}>
                  <select
                    multiple
                    size={6}
                    value={posSel[u._id] || []}
                    onChange={(e) => handleMultiChange(e, setPosSel, u._id)}
                    style={{ width: 280, padding: 6 }}
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

                <td style={{ padding: 8 }}>
                  <button
                    onClick={() => approve(u._id)}
                    style={{ padding: "6px 10px", marginRight: 8 }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(u._id)}
                    style={{ padding: "6px 10px", background: "#eee" }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
