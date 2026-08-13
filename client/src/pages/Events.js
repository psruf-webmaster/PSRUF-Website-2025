import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  Clock3,
  Filter,
  ImagePlus,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import "./Events.css";
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

const EVENT_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f6d7d2" />
        <stop offset="50%" stop-color="#f4efe6" />
        <stop offset="100%" stop-color="#c86b5e" />
      </linearGradient>
    </defs>
    <rect width="1200" height="720" fill="url(#grad)" />
    <circle cx="940" cy="160" r="180" fill="rgba(255,255,255,0.22)" />
    <circle cx="260" cy="620" r="210" fill="rgba(124,41,41,0.16)" />
    <rect x="80" y="88" width="420" height="84" rx="42" fill="rgba(124,41,41,0.14)" />
    <text x="110" y="143" font-family="Georgia, serif" font-size="42" fill="#6f2b2a">Chapter Event</text>
    <text x="110" y="222" font-family="Arial, sans-serif" font-size="28" fill="#7a3e3a">Upload a custom cover to personalize this card.</text>
  </svg>
`)}`;

const VIEW_OPTIONS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "nextMonth", label: "Next Month" },
  { key: "mine", label: "My Events" },
];

const MINE_FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "thisMonth", label: "This Month" },
];

const EVENT_FILTERS = [
  { key: "all", label: "All Events" },
  { key: "mandatory", label: "Mandatory" },
  { key: "optional", label: "Optional" },
  { key: "phi", label: "Phi" },
  { key: "sigma", label: "Sigma" },
  { key: "rho", label: "Rho" },
  { key: "tau", label: "Tau" },
];

function toTitleCase(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function hasRole(user, role) {
  const roles = Array.isArray(user?.role) ? user.role : (user?.role ? [user.role] : []);
  return roles.map((entry) => String(entry).toLowerCase()).includes(String(role).toLowerCase());
}

function isCreatorRole(user) {
  return ["officer", "exec", "webmaster", "webdev", "candofficer"].some((role) => hasRole(user, role));
}

function isOfficerManager(user) {
  return ["officer", "exec", "webmaster", "webdev"].some((role) => hasRole(user, role));
}

function canRsvp(user) {
  return !!user;
}

function isManager(user, event) {
  if (!user || !event) return false;
  if (isOfficerManager(user)) return true;
  const userId = user._id || user.id;
  if (userId && (event.createdBy === userId || String(event.createdBy) === String(userId))) return true;
  if (Array.isArray(event.coHosts) && userId) {
    return event.coHosts.some((host) => String(host) === String(userId) || String(host?._id) === String(userId));
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
  return sameDay ? `${datePart} at ${startTime} - ${endTime}` : `${datePart} ${startTime} -> ${end.toLocaleString()}`;
}

function formatDurationHours(startAt, endAt) {
  const durationMs = Math.max(0, new Date(endAt).getTime() - new Date(startAt).getTime());
  const hours = durationMs / (1000 * 60 * 60);
  const roundedHours = Math.round(hours * 10) / 10;
  if (roundedHours === 1) return "1 hour";
  return `${roundedHours} hours`;
}

function formatDateDetail(dateValue) {
  return new Date(dateValue).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value) => String(value).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function computePoints(event) {
  const override = event?.points?.overrideTotalPoints;
  if (override != null) return override;
  const defaultRate = event?.points?.defaultRatePerHour || 0;
  const durationMs = Math.max(0, new Date(event?.endAt).getTime() - new Date(event?.startAt).getTime());
  const hours = durationMs / (1000 * 60 * 60);
  return Math.ceil(hours * defaultRate);
}

function getEventImage(event) {
  return event?.imageUrl || EVENT_PLACEHOLDER;
}

function EventCard({ event, user, userId, view, onRsvp, onManage }) {
  const [imageSrc, setImageSrc] = useState(getEventImage(event));

  useEffect(() => {
    setImageSrc(getEventImage(event));
  }, [event]);

  const currentRsvp = event.currentUserRsvp || event.rsvps?.find((rsvp) => String(rsvp.user) === String(userId))?.status;
  const hasActiveRsvp = currentRsvp === "going" || currentRsvp === "maybe";
  const totalGoing = event.totalGoing ?? (event.rsvps?.filter((rsvp) => rsvp.status === "going").length || 0);
  const totalMaybe = event.totalMaybe ?? (event.rsvps?.filter((rsvp) => rsvp.status === "maybe").length || 0);
  const estimatedPoints = computePoints(event);

  return (
    <motion.article
      className="events-card"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      whileHover={{ y: -6 }}
    >
      <div className="events-card-media">
        <img
          src={imageSrc}
          alt={event.title}
          className="events-card-image"
          onError={() => setImageSrc(EVENT_PLACEHOLDER)}
        />
        <div className="events-card-overlay" />
        <div className="events-card-badges">
          {hasActiveRsvp ? (
            <span className="events-badge events-badge-rsvpd">RSVP'D</span>
          ) : event.isMandatory ? (
            <span className="events-badge events-badge-mandatory">
              <ShieldAlert size={13} /> Mandatory
            </span>
          ) : (
            <span className="events-badge events-badge-soft">Optional</span>
          )}
          {event.points?.category && <span className="events-badge">{toTitleCase(event.points.category)}</span>}
        </div>
      </div>

      <div className="events-card-body">
        <div className="events-card-heading">
          <div>
            <h3>{event.title}</h3>
            <p>{event.description || "Chapter programming with RSVP, attendance, and points tracking in one place."}</p>
          </div>
          <div className="events-card-points">{estimatedPoints} pts</div>
        </div>

        <div className="events-card-meta">
          <span><CalendarDays size={15} /> {formatDateDetail(event.startAt)}</span>
          <span><MapPin size={15} /> {event.location || "Location announced soon"}</span>
          <span><Users size={15} /> {totalGoing} going{event.capacityMax ? ` / ${event.capacityMax} max` : ""}</span>
          <span><Clock3 size={15} /> {formatDurationHours(event.startAt, event.endAt)}</span>
        </div>

        {event.visibility?.rolesAllowed?.length ? (
          <div className="events-role-pills">
            {event.visibility.rolesAllowed.slice(0, 4).map((role) => (
              <span key={role} className="events-role-pill">{role}</span>
            ))}
          </div>
        ) : null}

        {view !== "mine" && canRsvp(user) ? (
          <div className="events-card-footer">
            <div className="events-attendance-copy">{totalMaybe} maybe attending</div>
            <div className="events-rsvp-actions">
              {[
                { key: "going", label: "RSVP Now" },
                { key: "maybe", label: "Maybe" },
                { key: "notGoing", label: "Pass" },
              ].map((option) => (
                <motion.button
                  key={option.key}
                  type="button"
                  className={currentRsvp === option.key ? "events-rsvp-button active" : "events-rsvp-button"}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onRsvp(event._id, option.key)}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="events-card-footer events-card-footer-mine">
            <div className="events-mine-statuses">
              {hasActiveRsvp ? <span className="events-role-pill">{currentRsvp.toUpperCase()}</span> : null}
              {event.attendance?.status ? <span className="events-role-pill">Attendance: {event.attendance.status}</span> : null}
              {event.attendance?.pointsAwarded != null ? <span className="events-role-pill">Points: {event.attendance.pointsAwarded}</span> : null}
            </div>
          </div>
        )}

        {view !== "mine" && isManager(user, event) ? (
          <div className="events-manage-row">
            <button type="button" className="events-secondary-button" onClick={() => onManage(event._id)}>Manage Event</button>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}

function CreateEventModal({ open, onClose, onCreated, user }) {
  const initialRoles = useMemo(() => (hasRole(user, "candOfficer") ? ["candidate"] : []), [user]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [pointsCategory, setPointsCategory] = useState("phi");
  const [defaultRate, setDefaultRate] = useState(10);
  const [overridePoints, setOverridePoints] = useState("");
  const [rolesAllowed, setRolesAllowed] = useState(initialRoles);
  const [memberStatusesAllowed, setMemberStatusesAllowed] = useState([]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!open) return;
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
    setIsMandatory(false);
    setImageFile(null);
    setImagePreview("");
    setError("");
  }, [open, user]);

  const toggleRole = (role) => {
    setRolesAllowed((prev) => (prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]));
  };

  const toggleMemberStatus = (status) => {
    setMemberStatusesAllowed((prev) => (prev.includes(status) ? prev.filter((entry) => entry !== status) : [...prev, status]));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("startAt", startAt ? new Date(startAt).toISOString() : "");
      formData.append("endAt", endAt ? new Date(endAt).toISOString() : "");
      formData.append("location", location);
      formData.append("capacityMax", capacityMax);
      formData.append("isMandatory", String(isMandatory));
      formData.append("visibility", JSON.stringify({ rolesAllowed, memberStatusesAllowed }));
      formData.append("points", JSON.stringify({
        category: pointsCategory,
        defaultRatePerHour: defaultRate,
        overrideTotalPoints: overridePoints,
      }));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const userId = user?._id || user?.id;
      const response = await fetch("/api/events", {
        method: "POST",
        headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
        credentials: "include",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create event");
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="events-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="events-modal-card"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="events-modal-header">
              <div>
                <h3>Create an Event</h3>
                <p>Set visibility, attach a cover image, and decide whether attendance is mandatory.</p>
                <p className="events-required-note"><span aria-hidden="true">*</span> Required fields</p>
              </div>
              <button type="button" className="events-icon-button" onClick={onClose} aria-label="Close create event modal">
                <X size={18} />
              </button>
            </div>

            <form className="events-form" onSubmit={handleSubmit}>
              <div className="events-form-grid events-form-grid-featured">
                <label className="events-field events-field-wide">
                  <span>Event title <strong className="events-required-asterisk" aria-hidden="true">*</strong></span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Spring Recruitment Info Session" />
                </label>

                <label className="events-field">
                  <span>Points category</span>
                  <select value={pointsCategory} onChange={(e) => setPointsCategory(e.target.value)}>
                    {POINT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{toTitleCase(option)}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="events-field">
                <span>Description</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Add a short event summary, RSVP expectations, and any notes attendees should know." />
              </label>

              <div className="events-form-grid">
                <label className="events-field">
                  <span>Start <strong className="events-required-asterisk" aria-hidden="true">*</strong></span>
                  <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
                </label>
                <label className="events-field">
                  <span>End <strong className="events-required-asterisk" aria-hidden="true">*</strong></span>
                  <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
                </label>
              </div>

              <div className="events-form-grid">
                <label className="events-field">
                  <span>Location</span>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Engineering Building, Room 205" />
                </label>
                <label className="events-field">
                  <span>Capacity</span>
                  <input type="number" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value)} placeholder="50" />
                </label>
              </div>

              <div className="events-form-grid">
                <label className="events-field">
                  <span>Default rate per hour</span>
                  <input type="number" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} min="0" />
                </label>
                <label className="events-field">
                  <span>Override total points</span>
                  <input type="number" value={overridePoints} onChange={(e) => setOverridePoints(e.target.value)} min="0" placeholder="Optional" />
                </label>
              </div>

              <div className="events-toggle-panel">
                <div>
                  <h3>Attendance requirement</h3>
                  <p>Use the mandatory option for events where absence should stand out to members.</p>
                </div>
                <div className="events-segmented-control">
                  <button type="button" className={isMandatory ? "events-segment" : "events-segment active"} onClick={() => setIsMandatory(false)}>Optional</button>
                  <button type="button" className={isMandatory ? "events-segment active" : "events-segment"} onClick={() => setIsMandatory(true)}>Mandatory</button>
                </div>
              </div>

              <div className="events-upload-panel">
                <div className="events-upload-copy">
                  <h3>Cover image</h3>
                  <p>Upload a photo for the event card. If you skip this, the page falls back to a branded placeholder.</p>
                </div>
                <label className="events-upload-box">
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  <div className="events-upload-preview">
                    <img src={imagePreview || EVENT_PLACEHOLDER} alt="Event cover preview" />
                    <div className="events-upload-overlay">
                      <ImagePlus size={18} />
                      <span>{imageFile ? imageFile.name : "Choose image"}</span>
                    </div>
                  </div>
                </label>
              </div>

              <div className="events-visibility-panel">
                <div>
                  <h3>Visibility roles</h3>
                  <p>Choose which member groups should see this event.</p>
                </div>
                <div className="events-chip-row">
                  {ROLE_OPTIONS.map((role) => (
                    <button type="button" key={role} className={rolesAllowed.includes(role) ? "events-chip active" : "events-chip"} onClick={() => toggleRole(role)}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="events-visibility-panel">
                <div>
                  <h3>Member statuses</h3>
                  <p>Optional restriction for specific membership states.</p>
                </div>
                <div className="events-chip-row">
                  {MEMBER_STATUS_OPTIONS.map((status) => (
                    <button type="button" key={status} className={memberStatusesAllowed.includes(status) ? "events-chip active" : "events-chip"} onClick={() => toggleMemberStatus(status)}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {error ? <div className="events-form-error">{error}</div> : null}

              <div className="events-modal-actions">
                <button type="button" className="events-secondary-button" onClick={onClose}>Cancel</button>
                <motion.button type="submit" className="events-primary-button" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} disabled={saving}>
                  {saving ? "Creating..." : "Create Event"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ManageEventModal({
  manageId,
  manageData,
  manageTab,
  setManageTab,
  setManageId,
  setManageData,
  cohostOptions,
  cohostSelection,
  setCohostSelection,
  saveCohosts,
  savingCohosts,
  attendanceEdits,
  updateAttendanceRow,
  saveAttendance,
  savingAttendance,
  saveDetails,
  savingDetails,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacityMax, setCapacityMax] = useState("");
  const [pointsCategory, setPointsCategory] = useState("phi");
  const [defaultRate, setDefaultRate] = useState(10);
  const [overridePoints, setOverridePoints] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [rolesAllowed, setRolesAllowed] = useState([]);
  const [memberStatusesAllowed, setMemberStatusesAllowed] = useState([]);

  useEffect(() => {
    if (!imageFile) return undefined;
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    const event = manageData?.event;
    if (!event) return;
    setTitle(event.title || "");
    setDescription(event.description || "");
    setStartAt(toDateTimeLocalValue(event.startAt));
    setEndAt(toDateTimeLocalValue(event.endAt));
    setLocation(event.location || "");
    setCapacityMax(event.capacityMax ?? "");
    setPointsCategory(event.points?.category || "phi");
    setDefaultRate(event.points?.defaultRatePerHour ?? 10);
    setOverridePoints(event.points?.overrideTotalPoints ?? "");
    setImageFile(null);
    setImagePreview(event.imageUrl || "");
    setIsMandatory(!!event.isMandatory);
    setIsPublished(event.isPublished !== false);
    setRolesAllowed(Array.isArray(event.visibility?.rolesAllowed) ? event.visibility.rolesAllowed : []);
    setMemberStatusesAllowed(Array.isArray(event.visibility?.memberStatusesAllowed) ? event.visibility.memberStatusesAllowed : []);
  }, [manageData]);

  const toggleRole = (role) => {
    setRolesAllowed((prev) => (prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]));
  };

  const toggleMemberStatus = (status) => {
    setMemberStatusesAllowed((prev) => (prev.includes(status) ? prev.filter((entry) => entry !== status) : [...prev, status]));
  };

  const handleDetailsSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      title,
      description,
      startAt: startAt ? new Date(startAt).toISOString() : "",
      endAt: endAt ? new Date(endAt).toISOString() : "",
      location,
      isMandatory,
      isPublished,
      visibility: {
        rolesAllowed,
        memberStatusesAllowed,
      },
      points: {
        category: pointsCategory,
        defaultRatePerHour: Number(defaultRate),
        ...(overridePoints === "" ? {} : { overrideTotalPoints: Number(overridePoints) }),
      },
    };
    if (capacityMax !== "") {
      payload.capacityMax = Number(capacityMax);
    }
    await saveDetails(payload, imageFile);
  };

  return (
    <AnimatePresence>
      {manageId && manageData ? (
        <motion.div className="events-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="events-modal-card events-manage-modal"
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="events-modal-header">
              <div>
                <div className="events-kicker">Manage event</div>
                <h2>{manageData.event?.title}</h2>
                <p>{fmtRange(manageData.event?.startAt, manageData.event?.endAt)}</p>
              </div>
              <button
                type="button"
                className="events-icon-button"
                onClick={() => {
                  setManageId(null);
                  setManageData(null);
                }}
                aria-label="Close manage event modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="events-manage-split">
              <section className="events-manage-panel">
                <div className="events-manage-panel-head">
                  <h3>Co-hosts</h3>
                  <p>Choose up to seven additional managers for this event.</p>
                </div>
                <select
                  multiple
                  value={cohostSelection}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions).map((option) => option.value);
                    if (values.length <= 7) setCohostSelection(values);
                  }}
                  className="events-multi-select"
                >
                  {cohostOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.firstName} {option.lastName} {option.role?.join ? `(${option.role.join(",")})` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" className="events-secondary-button" onClick={saveCohosts} disabled={savingCohosts}>
                  {savingCohosts ? "Saving..." : "Save Co-hosts"}
                </button>
              </section>

              <section className="events-manage-panel events-manage-panel-wide">
                <div className="events-manage-tabs">
                  <button type="button" className={manageTab === "details" ? "events-tab active" : "events-tab"} onClick={() => setManageTab("details")}>Details</button>
                  <button type="button" className={manageTab === "rsvps" ? "events-tab active" : "events-tab"} onClick={() => setManageTab("rsvps")}>RSVPs</button>
                  <button type="button" className={manageTab === "attendance" ? "events-tab active" : "events-tab"} onClick={() => setManageTab("attendance")}>Attendance</button>
                </div>

                {manageTab === "details" ? (
                  <form className="events-form" onSubmit={handleDetailsSubmit}>
                    <div className="events-form-grid events-form-grid-featured">
                      <label className="events-field events-field-wide">
                        <span>Event title <strong className="events-required-asterisk" aria-hidden="true">*</strong></span>
                        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
                      </label>

                      <label className="events-field">
                        <span>Points category</span>
                        <select value={pointsCategory} onChange={(e) => setPointsCategory(e.target.value)}>
                          {POINT_OPTIONS.map((option) => (
                            <option key={option} value={option}>{toTitleCase(option)}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="events-field">
                      <span>Description</span>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                    </label>

                    <div className="events-form-grid">
                      <label className="events-field">
                        <span>Start <strong className="events-required-asterisk" aria-hidden="true">*</strong></span>
                        <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
                      </label>
                      <label className="events-field">
                        <span>End <strong className="events-required-asterisk" aria-hidden="true">*</strong></span>
                        <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
                      </label>
                    </div>

                    <div className="events-form-grid">
                      <label className="events-field">
                        <span>Location</span>
                        <input value={location} onChange={(e) => setLocation(e.target.value)} />
                      </label>
                      <label className="events-field">
                        <span>Capacity</span>
                        <input type="number" min="1" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value)} placeholder="Leave blank to keep current" />
                      </label>
                    </div>

                    <div className="events-form-grid">
                      <label className="events-field">
                        <span>Default rate per hour</span>
                        <input type="number" min="0" value={defaultRate} onChange={(e) => setDefaultRate(e.target.value)} />
                      </label>
                      <label className="events-field">
                        <span>Override total points</span>
                        <input type="number" min="0" value={overridePoints} onChange={(e) => setOverridePoints(e.target.value)} placeholder="Optional" />
                      </label>
                    </div>

                    <div className="events-upload-panel">
                      <div className="events-upload-copy">
                        <h3>Cover image</h3>
                        <p>Upload a new image to replace the current event cover.</p>
                      </div>
                      <label className="events-upload-box">
                        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                        <div className="events-upload-preview">
                          <img src={imagePreview || EVENT_PLACEHOLDER} alt="Event cover preview" />
                          <div className="events-upload-overlay">
                            <ImagePlus size={18} />
                            <span>{imageFile ? imageFile.name : "Choose image"}</span>
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="events-toggle-panel">
                      <div>
                        <h3>Attendance requirement</h3>
                        <p>Choose whether this event is mandatory for eligible members.</p>
                      </div>
                      <div className="events-segmented-control">
                        <button type="button" className={isMandatory ? "events-segment" : "events-segment active"} onClick={() => setIsMandatory(false)}>Optional</button>
                        <button type="button" className={isMandatory ? "events-segment active" : "events-segment"} onClick={() => setIsMandatory(true)}>Mandatory</button>
                      </div>
                    </div>

                    <div className="events-toggle-panel">
                      <div>
                        <h3>Publish status</h3>
                        <p>Published events are visible to allowed members.</p>
                      </div>
                      <div className="events-segmented-control">
                        <button type="button" className={isPublished ? "events-segment active" : "events-segment"} onClick={() => setIsPublished(true)}>Published</button>
                        <button type="button" className={isPublished ? "events-segment" : "events-segment active"} onClick={() => setIsPublished(false)}>Hidden</button>
                      </div>
                    </div>

                    <div className="events-visibility-panel">
                      <div>
                        <h3>Visibility roles</h3>
                        <p>Pick which groups can see this event.</p>
                      </div>
                      <div className="events-chip-row">
                        {ROLE_OPTIONS.map((role) => (
                          <button type="button" key={role} className={rolesAllowed.includes(role) ? "events-chip active" : "events-chip"} onClick={() => toggleRole(role)}>
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="events-visibility-panel">
                      <div>
                        <h3>Member statuses</h3>
                        <p>Optional status filter for visibility.</p>
                      </div>
                      <div className="events-chip-row">
                        {MEMBER_STATUS_OPTIONS.map((status) => (
                          <button type="button" key={status} className={memberStatusesAllowed.includes(status) ? "events-chip active" : "events-chip"} onClick={() => toggleMemberStatus(status)}>
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="events-modal-actions">
                      <button type="submit" className="events-primary-button" disabled={savingDetails}>
                        {savingDetails ? "Saving..." : "Save Details"}
                      </button>
                    </div>
                  </form>
                ) : manageTab === "rsvps" ? (
                  <div className="events-rsvp-columns">
                    {["going", "maybe", "notGoing"].map((status) => (
                      <div key={status} className="events-rsvp-column">
                        <h4>{status}</h4>
                        {(manageData.rsvps || []).filter((entry) => entry.status === status).length ? (
                          (manageData.rsvps || [])
                            .filter((entry) => entry.status === status)
                            .map((entry) => (
                              <div key={String(entry.user)} className="events-rsvp-entry">
                                {entry.userInfo ? `${entry.userInfo.firstName || ""} ${entry.userInfo.lastName || ""}` : entry.user}
                              </div>
                            ))
                        ) : (
                          <div className="events-empty-note">No RSVPs</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="events-attendance-table-wrap">
                    {(() => {
                      const byId = new Map();
                      (manageData.rsvps || []).forEach((rsvp) => {
                        byId.set(String(rsvp.user), { rsvp });
                      });
                      (manageData.attendance || []).forEach((attendance) => {
                        const existing = byId.get(String(attendance.user)) || {};
                        byId.set(String(attendance.user), { ...existing, attendance });
                      });
                      const rows = Array.from(byId.entries()).map(([uid, value]) => ({ uid, ...value }));

                      return (
                        <table className="events-attendance-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>RSVP</th>
                              <th>Attendance</th>
                              <th>Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => {
                              const edit = attendanceEdits[row.uid] || {};
                              const rsvp = row.rsvp;
                              const attendance = row.attendance;
                              const name = rsvp?.userInfo
                                ? `${rsvp.userInfo.firstName || ""} ${rsvp.userInfo.lastName || ""}`
                                : attendance?.userInfo
                                  ? `${attendance.userInfo.firstName || ""} ${attendance.userInfo.lastName || ""}`
                                  : row.uid;
                              return (
                                <tr key={row.uid}>
                                  <td>{name}</td>
                                  <td>{rsvp?.status || "-"}</td>
                                  <td>
                                    <select value={edit.status || attendance?.status || ""} onChange={(e) => updateAttendanceRow(row.uid, "status", e.target.value)}>
                                      <option value="">Select</option>
                                      <option value="present">Present</option>
                                      <option value="absent">Absent</option>
                                      <option value="excused">Excused</option>
                                    </select>
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      value={edit.pointsAwarded ?? attendance?.pointsAwarded ?? ""}
                                      onChange={(e) => updateAttendanceRow(row.uid, "pointsAwarded", e.target.value === "" ? undefined : Number(e.target.value))}
                                      placeholder="auto"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                    <div className="events-table-actions">
                      <button type="button" className="events-primary-button" onClick={saveAttendance} disabled={savingAttendance}>
                        {savingAttendance ? "Saving..." : "Save Attendance"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [manageId, setManageId] = useState(null);
  const [manageData, setManageData] = useState(null);
  const [manageTab, setManageTab] = useState("rsvps");
  const [cohostOptions, setCohostOptions] = useState([]);
  const [cohostSelection, setCohostSelection] = useState([]);
  const [attendanceEdits, setAttendanceEdits] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingCohosts, setSavingCohosts] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const userId = user?._id || user?.id;

  const canCreate = isCreatorRole(user);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = view === "mine" ? "/api/events/mine" : `/api/events?view=${view}`;
      const response = await fetch(url, {
        credentials: "include",
        headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [userId, view]);

  useEffect(() => {
    loadEvents();
  }, [view, userId]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((event) => {
        if (view !== "mine") return true;
        const start = new Date(event.startAt);
        if (myFilter === "upcoming") return start >= now;
        if (myFilter === "past") return start < now;
        if (myFilter === "thisMonth") {
          return start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
        }
        return true;
      })
      .filter((event) => {
        const haystack = [event.title, event.description, event.location].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(searchQuery.trim().toLowerCase());
      })
      .filter((event) => {
        if (eventFilter === "all") return true;
        if (eventFilter === "mandatory") return !!event.isMandatory;
        if (eventFilter === "optional") return !event.isMandatory;
        return String(event.points?.category || event.pointsCategory || "").toLowerCase() === eventFilter;
      });
  }, [events, eventFilter, myFilter, searchQuery, view]);

  const handleRsvp = async (eventId, status) => {
    if (!userId) return;

    setEvents((prev) => prev.map((event) => {
      if (event._id !== eventId) return event;
      const rsvps = Array.isArray(event.rsvps) ? [...event.rsvps] : [];
      const index = rsvps.findIndex((entry) => String(entry.user) === String(userId));
      if (index >= 0) rsvps[index] = { ...rsvps[index], status };
      else rsvps.push({ user: userId, status });
      return {
        ...event,
        rsvps,
        totalGoing: rsvps.filter((entry) => entry.status === "going").length,
        totalMaybe: rsvps.filter((entry) => entry.status === "maybe").length,
        currentUserRsvp: status,
      };
    }));

    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "RSVP failed");
      setEvents((prev) => prev.map((event) => (event._id === eventId ? data : event)));
    } catch (err) {
      setError(err.message);
      loadEvents();
    }
  };

  const openManage = async (id) => {
    setManageId(id);
    setManageData(null);
    setManageTab("rsvps");
    setError("");
    try {
      const response = await fetch(`/api/events/${id}/manage`, {
        headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load event");
      setManageData(data);
      setCohostSelection((data.event?.coHosts || []).map((entry) => entry?._id || entry).filter(Boolean));
      const nextAttendance = {};
      (data.attendance || []).forEach((entry) => {
        nextAttendance[String(entry.user)] = { status: entry.status, pointsAwarded: entry.pointsAwarded };
      });
      setAttendanceEdits(nextAttendance);
    } catch (err) {
      setError(err.message);
      setManageId(null);
    }
  };

  const loadCohostOptions = useCallback(async () => {
    try {
      const response = await fetch("/api/users/cohosts", {
        headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
        credentials: "include",
      });
      const data = await response.json();
      if (Array.isArray(data)) setCohostOptions(data);
    } catch (_err) {
      // ignore co-host load failures in the UI
    }
  }, [userId]);

  useEffect(() => {
    if (manageId) loadCohostOptions();
  }, [manageId]);

  const updateAttendanceRow = (uid, key, value) => {
    setAttendanceEdits((prev) => ({
      ...prev,
      [uid]: { ...(prev[uid] || {}), [key]: value },
    }));
  };

  const saveAttendance = async () => {
    if (!manageId) return;
    setSavingAttendance(true);
    setError("");
    try {
      const entries = Object.entries(attendanceEdits)
        .map(([entryUserId, value]) => ({
          userId: entryUserId,
          status: value.status,
          pointsAwarded: value.pointsAwarded,
        }))
        .filter((entry) => entry.status);
      const response = await fetch(`/api/events/${manageId}/attendance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ entries }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save attendance");
      openManage(manageId);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSavingAttendance(false);
    }
  };

  const saveCohosts = async () => {
    if (!manageId) return;
    setSavingCohosts(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${manageId}/cohosts`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ coHostIds: cohostSelection }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save co-hosts");
      openManage(manageId);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSavingCohosts(false);
    }
  };

  const saveDetails = async (payload, imageFile) => {
    if (!manageId) return null;
    setSavingDetails(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("description", payload.description || "");
      formData.append("startAt", payload.startAt);
      formData.append("endAt", payload.endAt);
      formData.append("location", payload.location || "");
      formData.append("isMandatory", String(payload.isMandatory));
      formData.append("isPublished", String(payload.isPublished));
      if (payload.capacityMax != null) formData.append("capacityMax", String(payload.capacityMax));
      formData.append("visibility", JSON.stringify(payload.visibility));
      formData.append("points", JSON.stringify(payload.points));
      if (imageFile) formData.append("image", imageFile);

      const response = await fetch(`/api/events/${manageId}`, {
        method: "PATCH",
        headers: {
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save event details");
      await loadEvents();
      await openManage(manageId);
      setManageTab("details");
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <motion.div className="events-page-shell" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: "easeOut" }}>
      <motion.section className="events-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: "easeOut" }}>
        <div className="events-hero-copy">
          <h1>Events</h1>
          <p>Discover and RSVP to upcoming chapter events!</p>
        </div>
        {canCreate && view !== "mine" ? (
          <motion.button type="button" className="events-primary-button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Create Event
          </motion.button>
        ) : null}
      </motion.section>

      <motion.section className="events-toolbar" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, delay: 0.06, ease: "easeOut" }}>
        <div className="events-tab-row">
          {VIEW_OPTIONS.map((option) => (
            <button key={option.key} type="button" className={view === option.key ? "events-tab active" : "events-tab"} onClick={() => setView(option.key)}>
              {option.label}
            </button>
          ))}
        </div>

        <div className="events-controls-row">
          <label className="events-search-box">
            <Search size={16} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search events, locations, or descriptions" />
          </label>

          <label className="events-filter-select">
            <Filter size={16} />
            <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
              {EVENT_FILTERS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {view === "mine" ? (
          <div className="events-tab-row events-tab-row-secondary">
            {MINE_FILTERS.map((option) => (
              <button key={option.key} type="button" className={myFilter === option.key ? "events-tab active" : "events-tab"} onClick={() => setMyFilter(option.key)}>
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </motion.section>

      {error ? <div className="events-inline-error">{error}</div> : null}

      {loading ? (
        <div className="events-empty-state">Loading events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="events-empty-state">No events matched this view. Adjust the filter or create a new event.</div>
      ) : (
        <motion.section className="events-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}>
          {filteredEvents.map((event, index) => (
            <motion.div key={event._id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, delay: index * 0.04, ease: "easeOut" }}>
              <EventCard event={event} user={user} userId={userId} view={view} onRsvp={handleRsvp} onManage={openManage} />
            </motion.div>
          ))}
        </motion.section>
      )}

      <CreateEventModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={loadEvents} user={user} />

      <ManageEventModal
        manageId={manageId}
        manageData={manageData}
        manageTab={manageTab}
        setManageTab={setManageTab}
        setManageId={setManageId}
        setManageData={setManageData}
        cohostOptions={cohostOptions}
        cohostSelection={cohostSelection}
        setCohostSelection={setCohostSelection}
        saveCohosts={saveCohosts}
        savingCohosts={savingCohosts}
        attendanceEdits={attendanceEdits}
        updateAttendanceRow={updateAttendanceRow}
        saveAttendance={saveAttendance}
        savingAttendance={savingAttendance}
        saveDetails={saveDetails}
        savingDetails={savingDetails}
      />
    </motion.div>
  );
}
