import React, { useEffect, useState } from "react";

const ROLE_OPTIONS = [
  "pending","pnm","candidate","candOfficer","member",
  "alumni","officer","exec","webmaster","webdev",
];
const MEMBER_STATUS_OPTIONS = [
  "active","inactive","probation","seniorStatus",
  "scholarship","co-op","dropped",
];
const EXEC_OPTIONS = [
  "PRESIDENT","VP_STANDARDS","VP_COMMUNICATIONS","VP_FINANCE",
  "VP_SOCIAL","VP_SERVICE","VP_SCHOLARSHIP","VP_MEMBERSHIP",
];
const POSITION_OPTIONS = [
  "SISTER_AT_LARGE",
  "SERGEANT_AT_ARMS","STANDARDS_BOARD",
  "WEBMASTER","WEBDEV","PR_DIRECTOR","BEC_REP",
  "FUNDRAISING","MEMORABILIA",
  "SISTERHOOD","FAM_ALUM","BANQUET","POWER_PENGUIN",
  "PHILANTHROPY","STEM_CHAIR",
  "PROFESSIONAL_DEV",
  "MEM_ED","RECRUITMENT_BOARD",
  "PRESIDENT","VP_STANDARDS","VP_COMMUNICATIONS","VP_FINANCE",
  "VP_SOCIAL","VP_SERVICE","VP_SCHOLARSHIP","VP_MEMBERSHIP",
];

function Multi({ options, value, onChange, size = 5, width = 220 }) {
  const handle = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
    onChange(selected);
  };
  return (
    <select multiple size={size} value={value} onChange={handle} style={{ width, padding: 6 }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// Simple modal component
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100%", height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 600,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h2>
        {children}
        <div style={{ textAlign: "right", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "6px 12px" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // editors
  const [roleEdit, setRoleEdit] = useState({});
  const [statusEdit, setStatusEdit] = useState({});
  const [addPos, setAddPos] = useState({});
  const [removePos, setRemovePos] = useState({});

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`/api/admin/users?state=${tab}`);
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
      const re = {}, se = {}, add = {}, rem = {};
      (Array.isArray(data) ? data : []).forEach(u => {
        re[u._id] = u.role || [];
        se[u._id] = u.memberStatus || [];
        add[u._id] = [];
        rem[u._id] = [];
      });
      setRoleEdit(re); setStatusEdit(se); setAddPos(add); setRemovePos(rem);
    } catch (e) {
      console.error(e);
      setMsg("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const updateRolesStatus = async (id) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/roles-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleEdit[id],
          memberStatus: statusEdit[id],
        })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Update failed');
      setMsg('✅ Roles/Status updated');
      await load();
    } catch (e) {
      console.error(e); setMsg('❌ ' + e.message);
    }
  };

  const updatePositions = async (id) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/positions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          add: addPos[id],
          remove: removePos[id],
        })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Positions update failed');
      setMsg('✅ Positions updated (history saved)');
      await load();
    } catch (e) {
      console.error(e); setMsg('❌ ' + e.message);
    }
  };

  const openHistory = (user) => {
    setModalUser(user);
    setModalOpen(true);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Admin → Users</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['pending','approved','rejected'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 12px',
              borderBottom: tab === t ? '3px solid black' : '3px solid transparent'
            }}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {msg && <div style={{ marginBottom: 12 }}>{msg}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div>No users in this state.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', background: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Emails</th>
              <th style={{ padding: 8 }}>Roles</th>
              <th style={{ padding: 8 }}>Member Status</th>
              <th style={{ padding: 8 }}>Add Positions</th>
              <th style={{ padding: 8 }}>Remove Positions</th>
              <th style={{ padding: 8 }}>Current Positions</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8 }}>{u.firstName} {u.lastName}</td>
                <td style={{ padding: 8 }}>
                  <div>{u.personalEmail}</div>
                  <div style={{ opacity: .7, fontSize: 12 }}>{u.ufEmail || '-'}</div>
                </td>
                <td style={{ padding: 8 }}>
                  <Multi
                    options={ROLE_OPTIONS}
                    value={roleEdit[u._id] || []}
                    onChange={(arr) => setRoleEdit(prev => ({ ...prev, [u._id]: arr }))}
                    size={5}
                    width={180}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <Multi
                    options={MEMBER_STATUS_OPTIONS}
                    value={statusEdit[u._id] || []}
                    onChange={(arr) => setStatusEdit(prev => ({ ...prev, [u._id]: arr }))}
                    size={5}
                    width={180}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <Multi
                    options={[...EXEC_OPTIONS, ...POSITION_OPTIONS]}
                    value={addPos[u._id] || []}
                    onChange={(arr) => setAddPos(prev => ({ ...prev, [u._id]: arr }))}
                    size={7}
                    width={220}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <Multi
                    options={[...EXEC_OPTIONS, ...POSITION_OPTIONS]}
                    value={removePos[u._id] || []}
                    onChange={(arr) => setRemovePos(prev => ({ ...prev, [u._id]: arr }))}
                    size={7}
                    width={220}
                  />
                </td>
                <td style={{ padding: 8, maxWidth: 240 }}>
                  {(u.positions || []).length === 0 ? (
                    <div>-</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {u.positions.map((p, idx) => (
                        <li key={idx}>
                          {p.title || p.key}
                          {p.startDate ? ` (${new Date(p.startDate).toLocaleDateString()})` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={() => updateRolesStatus(u._id)} style={{ padding: '6px 10px' }}>
                      Save Roles/Status
                    </button>
                    <button onClick={() => updatePositions(u._id)} style={{ padding: '6px 10px' }}>
                      Save Positions (+History)
                    </button>
                    <button onClick={() => openHistory(u)} style={{ padding: '6px 10px' }}>
                      View History
                    </button>
                    {tab === 'pending' && (
                      <a href="/admin/approvals" style={{ fontSize: 12, marginTop: 4 }}>
                        Go to Approvals
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for Position History */}
<Modal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  title={modalUser ? `${modalUser.firstName} ${modalUser.lastName} — History` : ""}
>
  {!modalUser ? (
    <p>Loading...</p>
  ) : (
    <>
      {/* Positions History */}
      <h3 style={{ margin: '8px 0' }}>Position History</h3>
      {modalUser.positionsHistory?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {modalUser.positionsHistory.map((p, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>
              <strong>{p.title || p.key}</strong>
              {p.exec && <span> — under {p.exec}</span>}
              <div style={{ fontSize: 13 }}>
                {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'} &nbsp;→&nbsp;
                {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Present'}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ opacity: .7 }}>No previous positions.</p>
      )}

      {/* Role History */}
      <h3 style={{ margin: '16px 0 8px' }}>Role History</h3>
      {modalUser.roleHistory?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {[...modalUser.roleHistory].sort((a,b)=>new Date(b.at)-new Date(a.at)).map((h, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>
              <strong>{(h.values || []).join(', ') || '—'}</strong>
              <div style={{ fontSize: 13 }}>
                {h.at ? new Date(h.at).toLocaleString() : ''}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ opacity: .7 }}>No role changes recorded.</p>
      )}

      {/* Member Status History */}
      <h3 style={{ margin: '16px 0 8px' }}>Member Status History</h3>
      {modalUser.memberStatusHistory?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {[...modalUser.memberStatusHistory].sort((a,b)=>new Date(b.at)-new Date(a.at)).map((h, idx) => (
            <li key={idx} style={{ marginBottom: 6 }}>
              <strong>{(h.values || []).join(', ') || '—'}</strong>
              <div style={{ fontSize: 13 }}>
                {h.at ? new Date(h.at).toLocaleString() : ''}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ opacity: .7 }}>No member-status changes recorded.</p>
      )}
    </>
  )}
</Modal>

    </div>
  );
}
