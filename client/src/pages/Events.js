import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

const ROLE_OPTIONS = [
  "pending", "pnm", "candidate", "candOfficer", "member",
  "alumni", "officer", "exec", "webmaster", "webdev",
];
const MEMBER_STATUS_OPTIONS = [
  "active", "inactive", "probation", "seniorStatus",
  "scholarship", "co-op", "dropped",
];
const POINT_OPTIONS = ["phi", "sigma", "rho", "tau"];

function hasRole(user, role) {
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  return roles.map(r => String(r).toLowerCase()).includes(String(role).toLowerCase());
}

function isCreatorRole(user) {
  return ["officer", "exec", "webmaster", "webdev", "candofficer"].some(r => hasRole(user, r));
}

function isOfficerManager(user) {
  return ["officer", "exec", "webmaster", "webdev"].some(r => hasRole(user, r));
}

function canRsvp(user) {
  return !!user;
}

function isManager(user, event) {
  if (!user || !event) return false;
  if (isOfficerManager(user)) return true;
  const uid = user._id || user.id;
  if (uid && (event.createdBy === uid || String(event.createdBy) === String(uid))) return true;
  if (Array.isArray(event.coHosts) && uid) {
    return event.coHosts.some(h => String(h) === String(uid) || String(h?._id) === String(uid));
  }
  return false;
}

function fmtRange(startAt, endAt) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const sameDay = start.toDateString() === end.toDateString();
  const datePart = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return sameDay ? `${datePart} - ${startTime} to ${endTime}` : `${datePart} ${startTime} -> ${end.toLocaleString()}`;
}

function CreateEventModal({ open, onClose, onCreated, user }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [pointsCategory, setPointsCategory] = useState("phi");
  const [defaultRate, setDefaultRate] = useState(10);
  const [overridePoints, setOverridePoints] = useState("");
  const initialRoles = useMemo(() => (
    hasRole(user, "candOfficer") ? ["candidate"] : []
  ), [user]);
  const [rolesAllowed, setRolesAllowed] = useState(initialRoles);
  const [memberStatusesAllowed, setMemberStatusesAllowed] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setStartAt("");
      setEndAt("");
      setLocation("");
      setCapacityMax("");
      setPointsCategory("phi");
      setDefaultRate(10);
      setOverridePoints("");
      setRolesAllowed(hasRole(user, "candOfficer") ? ["candidate"] : []);
      setMemberStatusesAllowed([]);
      setError("");
    }
  }, [open, user]);

  const toggleRole = (role) => {
    setRolesAllowed(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const toggleMemberStatus = (status) => {
    setMemberStatusesAllowed(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title,
        description,
        startAt: startAt ? new Date(startAt).toISOString() : null,
        endAt: endAt ? new Date(endAt).toISOString() : null,
        location,
        capacityMax: capacityMax ? Number(capacityMax) : undefined,
        visibility: {
          rolesAllowed,
          memberStatusesAllowed: memberStatusesAllowed.length ? memberStatusesAllowed : undefined,
        },
        points: {
          category: pointsCategory,
          defaultRatePerHour: defaultRate ? Number(defaultRate) : undefined,
          overrideTotalPoints: overridePoints ? Number(overridePoints) : undefined,
        },
      };

      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?._id || user?.id ? { Authorization: `Bearer ${user._id || user.id}` } : {}),
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create event");
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Create Event</h2>
          <button onClick={onClose} style={styles.secondaryBtn}>Close</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required style={styles.input} />
          </div>
          <div style={styles.field}>
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={styles.textarea} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={styles.field}>
              <label>Start *</label>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} required style={styles.input} />
            </div>
            <div style={styles.field}>
              <label>End *</label>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} required style={styles.input} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={styles.field}>
              <label>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label>Capacity (optional)</label>
              <input type="number" value={capacityMax} onChange={e => setCapacityMax(e.target.value)} style={styles.input} />
            </div>
          </div>
          <div style={styles.field}>
            <label>Points Category *</label>
            <select value={pointsCategory} onChange={e => setPointsCategory(e.target.value)} required style={styles.input}>
              {POINT_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={styles.field}>
              <label>Default rate per hour</label>
              <input type="number" value={defaultRate} onChange={e => setDefaultRate(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label>Override total points</label>
              <input type="number" value={overridePoints} onChange={e => setOverridePoints(e.target.value)} style={styles.input} />
            </div>
          </div>
          <div style={styles.field}>
            <label>Visibility Roles *</label>
            <div style={styles.chipRow}>
              {ROLE_OPTIONS.map(r => (
                <button
                  type="button"
                  key={r}
                  onClick={() => toggleRole(r)}
                  style={rolesAllowed.includes(r) ? styles.chipActive : styles.chip}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.field}>
            <label>Visibility Member Statuses (optional)</label>
            <div style={styles.chipRow}>
              {MEMBER_STATUS_OPTIONS.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleMemberStatus(s)}
                  style={memberStatusesAllowed.includes(s) ? styles.chipActive : styles.chip}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}

          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.primaryBtn}>
              {saving ? "Saving..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Events() {
  const { user } = useAuth();
  const [view, setView] = useState("week");
  const [myFilter, setMyFilter] = useState("upcoming");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const userId = user?._id || user?.id;
  const [manageId, setManageId] = useState(null);
  const [manageData, setManageData] = useState(null);
  const [manageTab, setManageTab] = useState("rsvps");
  const [cohostOptions, setCohostOptions] = useState([]);
  const [cohostSelection, setCohostSelection] = useState([]);
  const [attendanceEdits, setAttendanceEdits] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingCohosts, setSavingCohosts] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const url = view === 'mine' ? '/api/events/mine' : `/api/events?view=${view}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const canCreate = isCreatorRole(user);

  const handleRsvp = async (eventId, status) => {
    if (!userId) return;
    // optimistic update
    setEvents(prev => prev.map(ev => {
      if (ev._id !== eventId) return ev;
      const rsvps = Array.isArray(ev.rsvps) ? [...ev.rsvps] : [];
      const idx = rsvps.findIndex(r => String(r.user) === String(userId));
      if (idx >= 0) rsvps[idx] = { ...rsvps[idx], status };
      else rsvps.push({ user: userId, status });
      const totalGoing = rsvps.filter(r => r.status === "going").length;
      const totalMaybe = rsvps.filter(r => r.status === "maybe").length;
      return { ...ev, rsvps, totalGoing, totalMaybe, currentUserRsvp: status };
    }));

    try {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "RSVP failed");
      setEvents(prev => prev.map(ev => ev._id === eventId ? data : ev));
    } catch (err) {
      setError(err.message);
      // reload to sync
      loadEvents();
    }
  };

  const openManage = async (id) => {
    setManageId(id);
    setManageData(null);
    setManageTab("rsvps");
    setError("");
    try {
      const res = await fetch(`/api/events/${id}/manage`, {
        headers: {
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load event");
      setManageData(data);
      setCohostSelection((data.event?.coHosts || []).map(u => u?._id || u).filter(Boolean));
      const att = {};
      (data.attendance || []).forEach(a => {
        att[String(a.user)] = { status: a.status, pointsAwarded: a.pointsAwarded };
      });
      setAttendanceEdits(att);
    } catch (err) {
      setError(err.message);
      setManageId(null);
    }
  };

  const loadCohostOptions = async () => {
    try {
      const res = await fetch('/api/users/cohosts', {
        headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
        credentials: "include",
      });
      const data = await res.json();
      if (Array.isArray(data)) setCohostOptions(data);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (manageId) {
      loadCohostOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageId]);

  const updateAttendanceRow = (uid, key, value) => {
    setAttendanceEdits(prev => ({
      ...prev,
      [uid]: { ...(prev[uid] || {}), [key]: value },
    }));
  };

  const saveAttendance = async () => {
    if (!manageId) return;
    setSavingAttendance(true);
    setError("");
    try {
      const entries = Object.entries(attendanceEdits).map(([userId, val]) => ({
        userId,
        status: val.status,
        pointsAwarded: val.pointsAwarded,
      })).filter(e => e.status);
      const res = await fetch(`/api/events/${manageId}/attendance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save attendance");
      // refresh manage data
      openManage(manageId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAttendance(false);
    }
  };

  const saveCohosts = async () => {
    if (!manageId) return;
    setSavingCohosts(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${manageId}/cohosts`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ coHostIds: cohostSelection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save co-hosts");
      openManage(manageId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCohosts(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Events</h1>
        {canCreate && view !== 'mine' && (
          <button onClick={() => setModalOpen(true)} style={styles.primaryBtn}>+ Create Event</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["week", "month", "nextMonth", "mine"].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={view === v ? styles.tabActive : styles.tab}
          >
            {v === "week" ? "This Week" : v === "month" ? "This Month" : v === "nextMonth" ? "Next Month" : "My Events"}
          </button>
        ))}
      </div>

      {view === 'mine' && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'past', label: 'Past' },
            { key: 'thisMonth', label: 'This Month' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setMyFilter(f.key)}
              style={myFilter === f.key ? styles.tabActive : styles.tab}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ marginBottom: 12, color: "red" }}>{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : events.length === 0 ? (
        <div>No events found for this range.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {(() => {
            const now = new Date();
            const filtered = view === 'mine'
              ? events.filter(ev => {
                  const start = new Date(ev.startAt);
                  if (myFilter === 'upcoming') return start >= now;
                  if (myFilter === 'past') return start < now;
                  if (myFilter === 'thisMonth') {
                    return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
                  }
                  return true;
                })
              : events;
            return filtered.map(ev => (
            <div key={ev._id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{ev.title}</div>
                  <div style={{ color: "#4b5563", fontSize: 14 }}>{fmtRange(ev.startAt, ev.endAt)}</div>
                  {ev.location && <div style={{ color: "#4b5563", fontSize: 14 }}>{ev.location}</div>}
                </div>
                <div style={{ textTransform: "uppercase", fontWeight: 700, color: "#5b3ca5" }}>
                  {ev.points?.category || ev.pointsCategory || ""}
                </div>
              </div>
              {ev.description && <p style={{ marginTop: 8, color: "#374151" }}>{ev.description}</p>}
              {ev.visibility?.rolesAllowed && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {(ev.visibility?.rolesAllowed || []).map(r => (
                    <span key={r} style={styles.rolePill}>{r}</span>
                  ))}
                </div>
              )}
              {view !== 'mine' && canRsvp(user) && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Going: {ev.totalGoing ?? (ev.rsvps?.filter(r => r.status === "going").length || 0)}
                    {" • "}Maybe: {ev.totalMaybe ?? (ev.rsvps?.filter(r => r.status === "maybe").length || 0)}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["going", "maybe", "notGoing"].map(s => (
                      <button
                        key={s}
                        onClick={() => handleRsvp(ev._id, s)}
                        style={(ev.currentUserRsvp || ev.rsvps?.find(r => String(r.user) === String(userId))?.status) === s ? styles.rsvpBtnActive : styles.rsvpBtn}
                      >
                        {s === "going" ? "Going" : s === "maybe" ? "Maybe" : "Not Going"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {view === 'mine' && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ev.currentUserRsvp && (
                    <span style={styles.rolePill}>{ev.currentUserRsvp.toUpperCase()}</span>
                  )}
                  {ev.attendance?.status && (
                    <span style={styles.rolePill}>Attendance: {ev.attendance.status}</span>
                  )}
                  {ev.attendance?.pointsAwarded != null && (
                    <span style={styles.rolePill}>Points: {ev.attendance.pointsAwarded}</span>
                  )}
                </div>
              )}
              {view !== 'mine' && isManager(user, ev) && (
                <div style={{ marginTop: 10 }}>
                  <button style={styles.secondaryBtn} onClick={() => openManage(ev._id)}>Manage</button>
                </div>
              )}
            </div>
            ));
          })()}
        </div>
      )}

      <CreateEventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadEvents}
        user={user}
      />

      {manageId && manageData && (
        <div style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 800 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{manageData.event?.title}</div>
                <div style={{ color: "#6b7280", fontSize: 13 }}>{fmtRange(manageData.event?.startAt, manageData.event?.endAt)}</div>
              </div>
              <button style={styles.secondaryBtn} onClick={() => { setManageId(null); setManageData(null); }}>Close</button>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={() => setManageTab("rsvps")} style={manageTab === "rsvps" ? styles.tabActive : styles.tab}>RSVPs</button>
              <button onClick={() => setManageTab("attendance")} style={manageTab === "attendance" ? styles.tabActive : styles.tab}>Attendance</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 12, background: "#f9fafb", padding: 10, borderRadius: 8 }}>
                <div style={{ fontWeight: 600 }}>Co-hosts</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  <select
                    multiple
                    value={cohostSelection}
                    onChange={(e) => {
                      const vals = Array.from(e.target.selectedOptions).map(o => o.value);
                      if (vals.length <= 7) setCohostSelection(vals);
                    }}
                    style={{ minWidth: 220, padding: 6, borderRadius: 8, border: "1px solid #d1d5db" }}
                  >
                    {cohostOptions.map(u => (
                      <option key={u._id} value={u._id}>{u.firstName} {u.lastName} {u.role?.join ? `(${u.role.join(',')})` : ''}</option>
                    ))}
                  </select>
                  <button style={styles.secondaryBtn} onClick={saveCohosts} disabled={savingCohosts}>
                    {savingCohosts ? "Saving..." : "Save Co-hosts"}
                  </button>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Max 7</div>
                </div>
              </div>

              {manageTab === "rsvps" && (
                <div>
                  <h3 style={{ marginTop: 0 }}>RSVPs</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {["going", "maybe", "notGoing"].map(status => (
                      <div key={status} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontWeight: 600, textTransform: "capitalize" }}>{status}</div>
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                          {(manageData.rsvps || []).filter(r => r.status === status).map(r => (
                            <div key={String(r.user)} style={{ fontSize: 14 }}>
                              {r.userInfo ? `${r.userInfo.firstName || ''} ${r.userInfo.lastName || ''}` : r.user}
                              {r.userInfo?.role?.length ? ` — ${Array.isArray(r.userInfo.role) ? r.userInfo.role.join(', ') : r.userInfo.role}` : ""}
                            </div>
                          ))}
                          {(manageData.rsvps || []).filter(r => r.status === status).length === 0 && (
                            <div style={{ color: "#6b7280", fontSize: 13 }}>No RSVPs</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {manageTab === "attendance" && (
                <div>
                  <h3 style={{ marginTop: 0 }}>Attendance</h3>
                  {(() => {
                    const byId = new Map();
                    (manageData.rsvps || []).forEach(r => {
                      byId.set(String(r.user), { rsvp: r });
                    });
                    (manageData.attendance || []).forEach(a => {
                      const existing = byId.get(String(a.user)) || {};
                      byId.set(String(a.user), { ...existing, attendance: a });
                    });
                    const rows = Array.from(byId.entries()).map(([uid, val]) => ({ uid, ...val }));
                    return (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                            <th style={styles.th}>Name</th>
                          <th style={styles.th}>RSVP</th>
                          <th style={styles.th}>Attendance</th>
                          <th style={styles.th}>Points Awarded</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map(row => {
                          const uid = row.uid;
                          const edit = attendanceEdits[uid] || {};
                          const rsvp = row.rsvp;
                          const att = row.attendance;
                          const name = rsvp?.userInfo
                            ? `${rsvp.userInfo.firstName || ''} ${rsvp.userInfo.lastName || ''}`
                            : att?.userInfo
                              ? `${att.userInfo.firstName || ''} ${att.userInfo.lastName || ''}`
                              : uid;
                          const rsvpStatus = rsvp?.status || '—';
                          return (
                            <tr key={uid} style={{ borderTop: "1px solid #e5e7eb" }}>
                              <td style={styles.td}>{name}</td>
                              <td style={styles.td}>{rsvpStatus}</td>
                              <td style={styles.td}>
                                <select
                                  value={edit.status || att?.status || ""}
                                  onChange={e => updateAttendanceRow(uid, "status", e.target.value)}
                                  style={styles.input}
                                >
                                  <option value="">Select</option>
                                  <option value="present">Present</option>
                                  <option value="absent">Absent</option>
                                  <option value="excused">Excused</option>
                                </select>
                              </td>
                              <td style={styles.td}>
                                <input
                                  type="number"
                                  value={edit.pointsAwarded ?? att?.pointsAwarded ?? ""}
                                  onChange={e => {
                                    const val = e.target.value;
                                    updateAttendanceRow(uid, "pointsAwarded", val === "" ? undefined : Number(val));
                                  }}
                                  style={{ ...styles.input, maxWidth: 120 }}
                                  placeholder="auto"
                                />
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>
                    );
                  })()}
                  <div style={{ marginTop: 12, textAlign: "right" }}>
                    <button style={styles.primaryBtn} onClick={saveAttendance} disabled={savingAttendance}>
                      {savingAttendance ? "Saving..." : "Save Attendance"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "#5b3ca5",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
  },
  tab: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
  },
  tabActive: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #5b3ca5",
    background: "#ede9fe",
    color: "#4c1d95",
    cursor: "pointer",
    fontWeight: 600,
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "white",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  },
  rolePill: {
    padding: "4px 8px",
    borderRadius: 999,
    background: "#f3f4f6",
    fontSize: 12,
    color: "#374151"
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 12,
  },
  modalCard: {
    background: "white",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxWidth: 640,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
  },
  field: { marginBottom: 12, display: "flex", flexDirection: "column", gap: 4 },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    resize: "vertical",
  },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: {
    padding: "6px 10px",
    borderRadius: 16,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer"
  },
  chipActive: {
    padding: "6px 10px",
    borderRadius: 16,
    border: "1px solid #5b3ca5",
    background: "#ede9fe",
    color: "#4c1d95",
    cursor: "pointer"
  },
  rsvpBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    cursor: "pointer",
    fontSize: 13,
  },
  rsvpBtnActive: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #5b3ca5",
    background: "#ede9fe",
    color: "#4c1d95",
    cursor: "pointer",
    fontSize: 13,
  },
  th: { padding: 8, fontSize: 13 },
  td: { padding: 8, fontSize: 13 }
};
