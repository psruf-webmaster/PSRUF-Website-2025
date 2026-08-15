import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Download,
  Filter,
  ImagePlus,
  MapPin,
  Paperclip,
  Plus,
  Search,
  ShieldAlert,
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
  "co-op", "dropped",
];

const POINT_OPTIONS = ["phi", "sigma", "rho", "tau"];

const RECURRENCE_OPTIONS = [
  { key: "none", label: "Does not repeat" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Bi-weekly" },
  { key: "monthly", label: "Monthly" },
];

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
    <rect x="80" y="96" width="360" height="72" rx="36" fill="rgba(124,41,41,0.12)" />
    <rect x="80" y="198" width="520" height="28" rx="14" fill="rgba(124,41,41,0.12)" />
    <rect x="80" y="246" width="420" height="28" rx="14" fill="rgba(124,41,41,0.1)" />
    <rect x="80" y="294" width="300" height="28" rx="14" fill="rgba(124,41,41,0.08)" />
  </svg>
`)}`;

const VIEW_OPTIONS = [
  { key: "week", label: "This Week" },
  { key: "allUpcoming", label: "All Upcoming" },
  { key: "month", label: "This Month" },
  { key: "nextMonth", label: "Next Month" },
  { key: "past", label: "Past Events" },
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

function formatFileSize(size) {
  const numeric = Number(size || 0);
  if (!numeric) return "File";
  if (numeric >= 1024 * 1024) return `${(numeric / (1024 * 1024)).toFixed(1)} MB`;
  if (numeric >= 1024) return `${Math.round(numeric / 1024)} KB`;
  return `${numeric} B`;
}

function createShiftDraft(index = 0) {
  return {
    shiftId: `draft-${Date.now()}-${index}`,
    label: `Shift ${index + 1}`,
    startAt: "",
    endAt: "",
    capacityMax: "",
  };
}

function countShiftGoing(event, shiftId) {
  return (event?.rsvps || []).filter((entry) => entry.status === "going" && String(entry.shiftId || "") === String(shiftId || "")).length;
}

function describeShift(shift) {
  if (!shift) return "";
  return `${shift.label}: ${formatDateDetail(shift.startAt)} - ${new Date(shift.endAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function AttachmentLinks({ attachments, editable = false, onRemove }) {
  if (!attachments?.length) return null;

  return (
    <div className="events-attachment-list">
      {attachments.map((attachment) => (
        <div key={`${attachment.url}-${attachment.name}`} className="events-attachment-item">
          <a href={attachment.url} target="_blank" rel="noreferrer" className="events-attachment-link">
            <Paperclip size={14} />
            <span>{attachment.name}</span>
            <small>{formatFileSize(attachment.size)}</small>
            <Download size={14} />
          </a>
          {editable ? (
            <button type="button" className="events-icon-button" onClick={() => onRemove?.(attachment)} aria-label={`Remove ${attachment.name}`}>
              <X size={14} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ShiftEditor({ shifts, setShifts }) {
  const updateShift = (shiftId, key, value) => {
    setShifts((prev) => prev.map((shift) => (shift.shiftId === shiftId ? { ...shift, [key]: value } : shift)));
  };

  const addShift = () => {
    setShifts((prev) => [...prev, createShiftDraft(prev.length)]);
  };

  const removeShift = (shiftId) => {
    setShifts((prev) => prev.filter((shift) => shift.shiftId !== shiftId));
  };

  return (
    <div className="events-stack-panel">
      <div className="events-stack-panel-head">
        <div>
          <h3>Registration shifts</h3>
          <p>Members RSVP for one defined time block instead of a blanket event response.</p>
        </div>
        <button type="button" className="events-secondary-button" onClick={addShift}>
          <Plus size={14} /> Add Shift
        </button>
      </div>

      {shifts.length === 0 ? <div className="events-empty-note">No shifts added yet.</div> : null}

      {shifts.map((shift, index) => (
        <div key={shift.shiftId} className="events-inline-card">
          <div className="events-form-grid events-form-grid-featured">
            <label className="events-field events-field-wide">
              <span>Shift label</span>
              <input value={shift.label} onChange={(e) => updateShift(shift.shiftId, "label", e.target.value)} placeholder={`Shift ${index + 1}`} />
            </label>

            <label className="events-field">
              <span>Capacity</span>
              <input type="number" min="1" value={shift.capacityMax} onChange={(e) => updateShift(shift.shiftId, "capacityMax", e.target.value)} placeholder="Optional" />
            </label>
          </div>

          <div className="events-form-grid">
            <label className="events-field">
              <span>Shift start</span>
              <input type="datetime-local" value={shift.startAt} onChange={(e) => updateShift(shift.shiftId, "startAt", e.target.value)} />
            </label>
            <label className="events-field">
              <span>Shift end</span>
              <input type="datetime-local" value={shift.endAt} onChange={(e) => updateShift(shift.shiftId, "endAt", e.target.value)} />
            </label>
          </div>

          <div className="events-inline-actions">
            <button type="button" className="events-secondary-button" onClick={() => removeShift(shift.shiftId)}>
              Remove Shift
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ event, user, userId, view, onRsvp, onManage }) {
  const [imageSrc, setImageSrc] = useState(getEventImage(event));
  const [selectedShiftId, setSelectedShiftId] = useState(event.currentUserShiftId || event.shifts?.[0]?.shiftId || "");

  useEffect(() => {
    setImageSrc(getEventImage(event));
    setSelectedShiftId(event.currentUserShiftId || event.shifts?.[0]?.shiftId || "");
  }, [event]);

  const currentRsvp = event.currentUserRsvp || event.rsvps?.find((rsvp) => String(rsvp.user) === String(userId))?.status;
  const currentShiftId = event.currentUserShiftId || event.rsvps?.find((rsvp) => String(rsvp.user) === String(userId))?.shiftId;
  const hasActiveRsvp = currentRsvp === "going" || currentRsvp === "maybe";
  const totalGoing = event.totalGoing ?? (event.rsvps?.filter((rsvp) => rsvp.status === "going").length || 0);
  const totalMaybe = event.totalMaybe ?? (event.rsvps?.filter((rsvp) => rsvp.status === "maybe").length || 0);
  const estimatedPoints = computePoints(event);
  const selectedShift = event.shifts?.find((shift) => String(shift.shiftId) === String(selectedShiftId));

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
            {event.description ? <p>{event.description}</p> : null}
          </div>
          <div className="events-card-points">{estimatedPoints} pts</div>
        </div>

        <div className="events-card-meta">
          <span><CalendarDays size={15} /> {formatDateDetail(event.startAt)}</span>
          <span><MapPin size={15} /> {event.location || "Location announced soon"}</span>
          <span><Users size={15} /> {totalGoing} going{event.capacityMax ? ` / ${event.capacityMax} max` : ""}</span>
          <span><Clock3 size={15} /> {formatDurationHours(event.startAt, event.endAt)}</span>
        </div>

        {event.recurrence?.frequency && event.recurrence.frequency !== "none" ? (
          <div className="events-role-pills">
            <span className="events-role-pill">Repeats {toTitleCase(event.recurrence.frequency)}</span>
          </div>
        ) : null}

        {event.visibility?.rolesAllowed?.length ? (
          <div className="events-role-pills">
            {event.visibility.rolesAllowed.slice(0, 4).map((role) => (
              <span key={role} className="events-role-pill">{role}</span>
            ))}
          </div>
        ) : null}

        {event.shiftBasedRegistration ? (
          <div className="events-inline-card">
            <div className="events-stack-panel-head">
              <div>
                <h3>Choose a shift</h3>
                <p>Select the time block you plan to attend.</p>
              </div>
            </div>

            <label className="events-field">
              <span>Available shifts</span>
              <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)}>
                {(event.shifts || []).map((shift) => (
                  <option key={shift.shiftId} value={shift.shiftId}>
                    {shift.label} ({countShiftGoing(event, shift.shiftId)} going{shift.capacityMax ? ` / ${shift.capacityMax}` : ""})
                  </option>
                ))}
              </select>
            </label>

            {selectedShift ? <div className="events-empty-note">{describeShift(selectedShift)}</div> : null}
            {currentShiftId ? <div className="events-empty-note">Current shift: {(event.shifts || []).find((shift) => String(shift.shiftId) === String(currentShiftId))?.label || "Saved"}</div> : null}
          </div>
        ) : null}

        <AttachmentLinks attachments={event.attachments} />

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
                  onClick={() => onRsvp(event, option.key, event.shiftBasedRegistration ? selectedShiftId : undefined)}
                  disabled={event.shiftBasedRegistration && !selectedShiftId}
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
              {currentShiftId ? <span className="events-role-pill">Shift: {(event.shifts || []).find((shift) => String(shift.shiftId) === String(currentShiftId))?.label || "Saved"}</span> : null}
              {event.attendance?.status ? <span className="events-role-pill">Attendance: {event.attendance.status}</span> : null}
              {event.attendance?.pointsAwarded != null ? <span className="events-role-pill">Points: {event.attendance.pointsAwarded}</span> : null}
            </div>
          </div>
        )}

        {view !== "mine" && isManager(user, event) ? (
          <div className="events-manage-row">
            <Link to={`/events/${event._id}`} className="events-secondary-button events-link-button">View Details</Link>
            <button type="button" className="events-secondary-button" onClick={() => onManage(event._id)}>Manage Event</button>
          </div>
        ) : (
          <div className="events-manage-row">
            <Link to={`/events/${event._id}`} className="events-secondary-button events-link-button">View Details</Link>
          </div>
        )}
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
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [shiftBasedRegistration, setShiftBasedRegistration] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
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
    setAttachmentFiles([]);
    setShiftBasedRegistration(false);
    setShifts([]);
    setRecurrenceFrequency("none");
    setRecurrenceEndDate("");
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
      formData.append("shiftBasedRegistration", String(shiftBasedRegistration));
      formData.append("visibility", JSON.stringify({ rolesAllowed, memberStatusesAllowed }));
      formData.append("points", JSON.stringify({
        category: pointsCategory,
        defaultRatePerHour: defaultRate,
        overrideTotalPoints: overridePoints,
      }));
      formData.append("shifts", JSON.stringify(shifts.map((shift) => ({
        ...shift,
        startAt: shift.startAt ? new Date(shift.startAt).toISOString() : "",
        endAt: shift.endAt ? new Date(shift.endAt).toISOString() : "",
      }))));
      formData.append("recurrence", JSON.stringify({
        frequency: recurrenceFrequency,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : "",
      }));
      if (imageFile) {
        formData.append("image", imageFile);
      }
      attachmentFiles.forEach((file) => formData.append("attachments", file));

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
                <p>Set visibility, add attachments, define shifts, and optionally generate recurring instances.</p>
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

              <div className="events-toggle-panel">
                <div>
                  <h3>Registration mode</h3>
                  <p>Turn this on when members must RSVP to a specific time slot.</p>
                </div>
                <div className="events-segmented-control">
                  <button type="button" className={shiftBasedRegistration ? "events-segment" : "events-segment active"} onClick={() => setShiftBasedRegistration(false)}>Standard RSVP</button>
                  <button type="button" className={shiftBasedRegistration ? "events-segment active" : "events-segment"} onClick={() => setShiftBasedRegistration(true)}>Shift-Based</button>
                </div>
              </div>

              {shiftBasedRegistration ? <ShiftEditor shifts={shifts} setShifts={setShifts} /> : null}

              <div className="events-toggle-panel">
                <div>
                  <h3>Recurring event</h3>
                  <p>Create daily, weekly, bi-weekly, or monthly follow-up instances through a chosen end date.</p>
                </div>
                <div className="events-form-grid">
                  <label className="events-field">
                    <span>Frequency</span>
                    <select value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value)}>
                      {RECURRENCE_OPTIONS.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="events-field">
                    <span>Repeat through</span>
                    <input type="datetime-local" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} disabled={recurrenceFrequency === "none"} />
                  </label>
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

              <div className="events-upload-panel">
                <div className="events-upload-copy">
                  <h3>Attachments</h3>
                  <p>Attach PDFs, docs, slides, or flyers. Members can download them from the event card.</p>
                </div>
                <label className="events-upload-box events-upload-box-files">
                  <input type="file" multiple onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))} />
                  <div className="events-file-picker">
                    <Paperclip size={18} />
                    <span>{attachmentFiles.length ? `${attachmentFiles.length} file(s) selected` : "Choose files"}</span>
                  </div>
                </label>
              </div>

              {attachmentFiles.length ? (
                <div className="events-attachment-list">
                  {attachmentFiles.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="events-attachment-item">
                      <div className="events-attachment-link">
                        <Paperclip size={14} />
                        <span>{file.name}</span>
                        <small>{formatFileSize(file.size)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

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
  massRsvpMembers,
  addingMember,
  addManagedMember,
  deleteEvent,
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
  const [attachments, setAttachments] = useState([]);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [rolesAllowed, setRolesAllowed] = useState([]);
  const [memberStatusesAllowed, setMemberStatusesAllowed] = useState([]);
  const [shiftBasedRegistration, setShiftBasedRegistration] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [bulkRoles, setBulkRoles] = useState([]);
  const [bulkStatuses, setBulkStatuses] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("going");
  const [bulkShiftId, setBulkShiftId] = useState("");
  const [memberToAdd, setMemberToAdd] = useState("");
  const [manualRsvpStatus, setManualRsvpStatus] = useState("going");
  const [manualAttendanceStatus, setManualAttendanceStatus] = useState("present");
  const [manualShiftId, setManualShiftId] = useState("");
  const [manualPoints, setManualPoints] = useState("");
  const [applyToSeries, setApplyToSeries] = useState(false);

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
    setAttachments(Array.isArray(event.attachments) ? event.attachments : []);
    setAttachmentFiles([]);
    setIsMandatory(!!event.isMandatory);
    setIsPublished(event.isPublished !== false);
    setRolesAllowed(Array.isArray(event.visibility?.rolesAllowed) ? event.visibility.rolesAllowed : []);
    setMemberStatusesAllowed(Array.isArray(event.visibility?.memberStatusesAllowed) ? event.visibility.memberStatusesAllowed : []);
    setShiftBasedRegistration(!!event.shiftBasedRegistration);
    setShifts((event.shifts || []).map((shift) => ({
      ...shift,
      startAt: toDateTimeLocalValue(shift.startAt),
      endAt: toDateTimeLocalValue(shift.endAt),
      capacityMax: shift.capacityMax ?? "",
    })));
    setRecurrenceFrequency(event.recurrence?.frequency || "none");
    setRecurrenceEndDate(toDateTimeLocalValue(event.recurrence?.endDate));
    setBulkRoles([]);
    setBulkStatuses([]);
    setBulkStatus("going");
    setBulkShiftId(event.shifts?.[0]?.shiftId || "");
    setMemberToAdd("");
    setManualRsvpStatus("going");
    setManualAttendanceStatus("present");
    setManualShiftId(event.shifts?.[0]?.shiftId || "");
    setManualPoints("");
    setApplyToSeries(false);
  }, [manageData]);

  const toggleRole = (role) => {
    setRolesAllowed((prev) => (prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]));
  };

  const toggleMemberStatus = (status) => {
    setMemberStatusesAllowed((prev) => (prev.includes(status) ? prev.filter((entry) => entry !== status) : [...prev, status]));
  };

  const toggleBulkRole = (role) => {
    setBulkRoles((prev) => (prev.includes(role) ? prev.filter((entry) => entry !== role) : [...prev, role]));
  };

  const toggleBulkStatus = (status) => {
    setBulkStatuses((prev) => (prev.includes(status) ? prev.filter((entry) => entry !== status) : [...prev, status]));
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
      shiftBasedRegistration,
      shifts: shifts.map((shift) => ({
        ...shift,
        startAt: shift.startAt ? new Date(shift.startAt).toISOString() : "",
        endAt: shift.endAt ? new Date(shift.endAt).toISOString() : "",
      })),
      recurrence: {
        frequency: recurrenceFrequency,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : "",
      },
      applyToSeries,
      visibility: {
        rolesAllowed,
        memberStatusesAllowed,
      },
      points: {
        category: pointsCategory,
        defaultRatePerHour: Number(defaultRate),
        ...(overridePoints === "" ? {} : { overrideTotalPoints: Number(overridePoints) }),
      },
      attachments,
    };
    if (capacityMax !== "") {
      payload.capacityMax = Number(capacityMax);
    }
    await saveDetails(payload, imageFile, attachmentFiles);
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

                    <div className="events-upload-panel">
                      <div className="events-upload-copy">
                        <h3>Attachments</h3>
                        <p>Keep agendas, waivers, and deck files attached to this event.</p>
                      </div>
                      <label className="events-upload-box events-upload-box-files">
                        <input type="file" multiple onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))} />
                        <div className="events-file-picker">
                          <Paperclip size={18} />
                          <span>{attachmentFiles.length ? `${attachmentFiles.length} new file(s)` : "Add attachments"}</span>
                        </div>
                      </label>
                    </div>

                    <AttachmentLinks attachments={attachments} editable onRemove={(attachment) => setAttachments((prev) => prev.filter((entry) => entry.url !== attachment.url))} />

                    {attachmentFiles.length ? (
                      <div className="events-attachment-list">
                        {attachmentFiles.map((file) => (
                          <div key={`${file.name}-${file.size}`} className="events-attachment-item">
                            <div className="events-attachment-link">
                              <Paperclip size={14} />
                              <span>{file.name}</span>
                              <small>{formatFileSize(file.size)}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

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
                        <h3>Registration mode</h3>
                        <p>Switch between standard event RSVP and shift-based registration.</p>
                      </div>
                      <div className="events-segmented-control">
                        <button type="button" className={shiftBasedRegistration ? "events-segment" : "events-segment active"} onClick={() => setShiftBasedRegistration(false)}>Standard RSVP</button>
                        <button type="button" className={shiftBasedRegistration ? "events-segment active" : "events-segment"} onClick={() => setShiftBasedRegistration(true)}>Shift-Based</button>
                      </div>
                    </div>

                    {shiftBasedRegistration ? <ShiftEditor shifts={shifts} setShifts={setShifts} /> : null}

                    <div className="events-toggle-panel">
                      <div>
                        <h3>Recurring event</h3>
                        <p>Adjust the recurrence metadata stored with this event series.</p>
                      </div>
                      <div className="events-form-grid">
                        <label className="events-field">
                          <span>Frequency</span>
                          <select value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value)}>
                            {RECURRENCE_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="events-field">
                          <span>Repeat through</span>
                          <input type="datetime-local" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} disabled={recurrenceFrequency === "none"} />
                        </label>
                      </div>
                    </div>

                    {manageData.event?.recurrence?.seriesId ? (
                      <div className="events-toggle-panel">
                        <div>
                          <h3>Series-wide changes</h3>
                          <p>Apply shared settings to all events in this recurring series while preserving each occurrence date.</p>
                        </div>
                        <div className="events-segmented-control">
                          <button type="button" className={applyToSeries ? "events-segment active" : "events-segment"} onClick={() => setApplyToSeries(true)}>Apply To Series</button>
                          <button type="button" className={applyToSeries ? "events-segment" : "events-segment active"} onClick={() => setApplyToSeries(false)}>Only This Event</button>
                        </div>
                      </div>
                    ) : null}

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
                      {manageData.event?.recurrence?.seriesId ? (
                        <button type="button" className="events-secondary-button" onClick={() => deleteEvent("series")}>
                          Delete Series
                        </button>
                      ) : null}
                      <button type="button" className="events-secondary-button" onClick={() => deleteEvent("single")}>
                        Delete Event
                      </button>
                      <button type="submit" className="events-primary-button" disabled={savingDetails}>
                        {savingDetails ? "Saving..." : "Save Details"}
                      </button>
                    </div>
                  </form>
                ) : manageTab === "rsvps" ? (
                  <div className="events-stack-panel">
                    {manageData.event?.isMandatory ? (
                      <div className="events-inline-card">
                        <div className="events-stack-panel-head">
                          <div>
                            <h3>Mass RSVP</h3>
                            <p>Auto-add members by roster role or member status for mandatory events.</p>
                          </div>
                          <button
                            type="button"
                            className="events-primary-button"
                            onClick={() => massRsvpMembers({ roles: bulkRoles, memberStatuses: bulkStatuses, status: bulkStatus, shiftId: bulkShiftId })}
                          >
                            Auto RSVP Members
                          </button>
                        </div>

                        <div className="events-form-grid">
                          <label className="events-field">
                            <span>RSVP state</span>
                            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                              <option value="going">Going</option>
                              <option value="maybe">Maybe</option>
                              <option value="notGoing">Pass</option>
                            </select>
                          </label>
                          {manageData.event?.shiftBasedRegistration ? (
                            <label className="events-field">
                              <span>Shift</span>
                              <select value={bulkShiftId} onChange={(e) => setBulkShiftId(e.target.value)}>
                                {(manageData.event?.shifts || []).map((shift) => (
                                  <option key={shift.shiftId} value={shift.shiftId}>{shift.label}</option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>

                        <div className="events-visibility-panel">
                          <div>
                            <h3>Target roles</h3>
                            <p>Leave blank to include every visible approved member.</p>
                          </div>
                          <div className="events-chip-row">
                            {ROLE_OPTIONS.map((role) => (
                              <button type="button" key={role} className={bulkRoles.includes(role) ? "events-chip active" : "events-chip"} onClick={() => toggleBulkRole(role)}>
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="events-visibility-panel">
                          <div>
                            <h3>Target member statuses</h3>
                            <p>Combine with roles when you need a narrower roster segment.</p>
                          </div>
                          <div className="events-chip-row">
                            {MEMBER_STATUS_OPTIONS.map((status) => (
                              <button type="button" key={status} className={bulkStatuses.includes(status) ? "events-chip active" : "events-chip"} onClick={() => toggleBulkStatus(status)}>
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="events-rsvp-columns">
                      {["going", "maybe", "notGoing"].map((status) => (
                        <div key={status} className="events-rsvp-column">
                          <h4>{status}</h4>
                          {(manageData.rsvps || []).filter((entry) => entry.status === status).length ? (
                            (manageData.rsvps || [])
                              .filter((entry) => entry.status === status)
                              .map((entry) => {
                                const shiftLabel = (manageData.event?.shifts || []).find((shift) => String(shift.shiftId) === String(entry.shiftId || ""))?.label;
                                return (
                                  <div key={String(entry.user)} className="events-rsvp-entry">
                                    <div>{entry.userInfo ? `${entry.userInfo.firstName || ""} ${entry.userInfo.lastName || ""}` : entry.user}</div>
                                    {shiftLabel ? <div className="events-empty-note">{shiftLabel}</div> : null}
                                  </div>
                                );
                              })
                          ) : (
                            <div className="events-empty-note">No RSVPs</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="events-stack-panel">
                    <div className="events-inline-card">
                      <div className="events-stack-panel-head">
                        <div>
                          <h3>Manage Event / Add Member</h3>
                          <p>Retroactively add a member who missed sign-up so attendance and points stay accurate.</p>
                        </div>
                        <button
                          type="button"
                          className="events-primary-button"
                          onClick={() => addManagedMember({
                            userId: memberToAdd,
                            rsvpStatus: manualRsvpStatus,
                            attendanceStatus: manualAttendanceStatus,
                            shiftId: manualShiftId,
                            pointsAwarded: manualPoints === "" ? undefined : Number(manualPoints),
                          })}
                          disabled={!memberToAdd || addingMember}
                        >
                          {addingMember ? "Adding..." : "Add Member"}
                        </button>
                      </div>

                      <div className="events-form-grid">
                        <label className="events-field">
                          <span>Member</span>
                          <select value={memberToAdd} onChange={(e) => setMemberToAdd(e.target.value)}>
                            <option value="">Select a member</option>
                            {(manageData.eligibleMembers || []).map((member) => (
                              <option key={member._id} value={member._id}>
                                {member.firstName} {member.lastName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="events-field">
                          <span>RSVP status</span>
                          <select value={manualRsvpStatus} onChange={(e) => setManualRsvpStatus(e.target.value)}>
                            <option value="going">Going</option>
                            <option value="maybe">Maybe</option>
                            <option value="notGoing">Pass</option>
                          </select>
                        </label>
                      </div>

                      <div className="events-form-grid">
                        <label className="events-field">
                          <span>Attendance status</span>
                          <select value={manualAttendanceStatus} onChange={(e) => setManualAttendanceStatus(e.target.value)}>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="excused">Excused</option>
                          </select>
                        </label>
                        <label className="events-field">
                          <span>Points override</span>
                          <input type="number" min="0" value={manualPoints} onChange={(e) => setManualPoints(e.target.value)} placeholder="Leave blank for auto" />
                        </label>
                      </div>

                      {manageData.event?.shiftBasedRegistration ? (
                        <label className="events-field">
                          <span>Shift</span>
                          <select value={manualShiftId} onChange={(e) => setManualShiftId(e.target.value)}>
                            {(manageData.event?.shifts || []).map((shift) => (
                              <option key={shift.shiftId} value={shift.shiftId}>{shift.label}</option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>

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
                                <th>Shift</th>
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
                                const shiftLabel = (manageData.event?.shifts || []).find((shift) => String(shift.shiftId) === String(rsvp?.shiftId || ""))?.label;
                                return (
                                  <tr key={row.uid}>
                                    <td>{name}</td>
                                    <td>{rsvp?.status || "-"}</td>
                                    <td>{shiftLabel || "-"}</td>
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
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
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
  const [addingMember, setAddingMember] = useState(false);
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
  }, [loadEvents]);

  useEffect(() => {
    setMobileControlsOpen(false);
  }, [view, manageId, modalOpen]);

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

  const handleRsvp = async (event, status, shiftId) => {
    if (!userId) return;

    const currentEvent = events.find((entry) => entry._id === event._id) || event;
    const currentRsvp = currentEvent.currentUserRsvp || currentEvent.rsvps?.find((entry) => String(entry.user) === String(userId))?.status || null;
    const currentShiftId = currentEvent.currentUserShiftId || currentEvent.rsvps?.find((entry) => String(entry.user) === String(userId))?.shiftId || null;
    const sameSelection = currentRsvp === status && String(currentShiftId || "") === String(shiftId || "");
    const nextStatus = sameSelection ? "none" : status;

    setEvents((prev) => prev.map((entry) => {
      if (entry._id !== event._id) return entry;
      let rsvps = Array.isArray(entry.rsvps) ? [...entry.rsvps] : [];
      const index = rsvps.findIndex((entry) => String(entry.user) === String(userId));
      if (nextStatus === "none") {
        rsvps = rsvps.filter((entry) => String(entry.user) !== String(userId));
      } else if (index >= 0) rsvps[index] = { ...rsvps[index], status: nextStatus, shiftId };
      else rsvps.push({ user: userId, status: nextStatus, shiftId });
      return {
        ...entry,
        rsvps,
        totalGoing: rsvps.filter((entry) => entry.status === "going").length,
        totalMaybe: rsvps.filter((entry) => entry.status === "maybe").length,
        currentUserRsvp: nextStatus === "none" ? null : nextStatus,
        currentUserShiftId: nextStatus === "none" ? null : shiftId || null,
      };
    }));

    try {
      const response = await fetch(`/api/events/${event._id}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus, shiftId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "RSVP failed");
      setEvents((prev) => prev.map((entry) => (entry._id === event._id ? data : entry)));
      if (manageId === event._id) openManage(event._id);
    } catch (err) {
      setError(err.message);
      loadEvents();
    }
  };

  const openManage = useCallback(async (id) => {
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
  }, [userId]);

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
  }, [manageId, loadCohostOptions]);

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
      await openManage(manageId);
      await loadEvents();
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

  const saveDetails = async (payload, imageFile, attachmentFiles = []) => {
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
      formData.append("shiftBasedRegistration", String(payload.shiftBasedRegistration));
      if (payload.capacityMax != null) formData.append("capacityMax", String(payload.capacityMax));
      formData.append("visibility", JSON.stringify(payload.visibility));
      formData.append("points", JSON.stringify(payload.points));
      formData.append("shifts", JSON.stringify(payload.shifts || []));
      formData.append("recurrence", JSON.stringify(payload.recurrence || { frequency: "none" }));
      formData.append("attachments", JSON.stringify(payload.attachments || []));
      formData.append("applyToSeries", String(!!payload.applyToSeries));
      if (imageFile) formData.append("image", imageFile);
      attachmentFiles.forEach((file) => formData.append("attachments", file));

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

  const massRsvpMembers = async ({ roles, memberStatuses, status, shiftId }) => {
    if (!manageId) return null;
    setError("");
    try {
      const response = await fetch(`/api/events/${manageId}/mass-rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ roles, memberStatuses, status, shiftId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to mass RSVP members");
      await loadEvents();
      await openManage(manageId);
      setManageTab("rsvps");
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const addManagedMember = async ({ userId: selectedUserId, rsvpStatus, attendanceStatus, shiftId, pointsAwarded }) => {
    if (!manageId || !selectedUserId) return null;
    setAddingMember(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${manageId}/manage-members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { Authorization: `Bearer ${userId}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          userId: selectedUserId,
          rsvpStatus,
          attendanceStatus,
          shiftId,
          pointsAwarded,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to add member");
      await loadEvents();
      await openManage(manageId);
      setManageTab("attendance");
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setAddingMember(false);
    }
  };

  const deleteEvent = async (scope) => {
    if (!manageId) return null;
    const confirmed = window.confirm(scope === "series" ? "Delete every event in this recurring series?" : "Delete this event?");
    if (!confirmed) return null;
    setError("");
    try {
      const response = await fetch(`/api/events/${manageId}?scope=${scope}`, {
        method: "DELETE",
        headers: userId ? { Authorization: `Bearer ${userId}` } : undefined,
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to delete event");
      setManageId(null);
      setManageData(null);
      await loadEvents();
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  return (
    <motion.div className="events-page-shell" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: "easeOut" }}>
      <motion.section className="events-hero" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.46, ease: "easeOut" }}>
        <div className="events-hero-copy">
          <h1>Events</h1>
          <p>Discover, organize, and manage chapter events with a cleaner RSVP and attendance workflow.</p>
        </div>
        {canCreate && view !== "mine" ? (
          <motion.button type="button" className="events-primary-button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Create Event
          </motion.button>
        ) : null}
      </motion.section>

      <section className="events-mobile-bar">
        <button type="button" className="events-secondary-button" onClick={() => setMobileControlsOpen(true)}>
          <Filter size={16} /> Filters & Views
        </button>
        {canCreate && view !== "mine" ? (
          <button type="button" className="events-primary-button" onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Create
          </button>
        ) : null}
      </section>

      <motion.section className="events-toolbar" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.48, delay: 0.06, ease: "easeOut" }}>
        <div className="events-tab-row">
          {VIEW_OPTIONS.map((option) => (
            <button key={option.key} type="button" className={view === option.key ? "events-tab active" : "events-tab"} onClick={() => setView(view === "week" && option.key === "week" ? "allUpcoming" : option.key)}>
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

      <AnimatePresence>
        {mobileControlsOpen ? (
          <motion.div className="events-mobile-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="events-mobile-drawer" initial={{ y: 32, opacity: 0.92 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0.96 }} transition={{ duration: 0.22, ease: "easeOut" }}>
              <div className="events-mobile-drawer-head">
                <div>
                  <h3>Browse Events</h3>
                  <p>Switch views, refine results, and jump between upcoming and past events.</p>
                </div>
                <button type="button" className="events-icon-button" onClick={() => setMobileControlsOpen(false)} aria-label="Close event filters">
                  <X size={18} />
                </button>
              </div>

              <div className="events-mobile-drawer-body">
                <div className="events-mobile-block">
                  <span className="events-mobile-block-label">View</span>
                  <div className="events-tab-row">
                    {VIEW_OPTIONS.map((option) => (
                      <button key={option.key} type="button" className={view === option.key ? "events-tab active" : "events-tab"} onClick={() => setView(view === "week" && option.key === "week" ? "allUpcoming" : option.key)}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

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

                {view === "mine" ? (
                  <div className="events-mobile-block">
                    <span className="events-mobile-block-label">My event filter</span>
                    <div className="events-tab-row">
                      {MINE_FILTERS.map((option) => (
                        <button key={option.key} type="button" className={myFilter === option.key ? "events-tab active" : "events-tab"} onClick={() => setMyFilter(option.key)}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="events-mobile-drawer-actions">
                  <button type="button" className="events-secondary-button" onClick={() => setMobileControlsOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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
        massRsvpMembers={massRsvpMembers}
        addingMember={addingMember}
        addManagedMember={addManagedMember}
        deleteEvent={deleteEvent}
      />
    </motion.div>
  );
}
