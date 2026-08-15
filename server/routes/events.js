const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const PointsLedger = require('../models/PointsLedger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ROLE_CREATE = ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'];
const POINT_CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];
const ATTENDANCE_STATUSES = ['present', 'absent', 'excused'];
const COHOST_ROLES = ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'];
const RECURRENCE_FREQUENCIES = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || 'event-image').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const eventUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'attachments', maxCount: 10 },
]);

// Helpers
async function getUser(req) {
  if (req.user) return req.user;
  const auth = req.header('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const id = auth.slice(7).trim();
    if (mongoose.Types.ObjectId.isValid(id)) {
      const u = await User.findById(id);
      if (u) return u;
    }
  }
  const id = req.header('x-user-id'); // fallback for dev/manual testing
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findById(id);
}

function normalizeStrings(values) {
  if (!values) return [];
  if (Array.isArray(values)) return values.map(v => String(v));
  return [String(values)];
}

function parseMaybeJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return fallback;
  }
}

function parseOptionalNumber(value) {
  if (value == null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function getUploadedFiles(req) {
  const image = req.files?.image?.[0] || req.file || null;
  const attachments = Array.isArray(req.files?.attachments) ? req.files.attachments : [];
  return { image, attachments };
}

function normalizeAttachments(files = []) {
  return files.map(file => ({
    name: String(file.originalname || file.filename || 'attachment'),
    url: `/uploads/${file.filename}`,
    mimeType: String(file.mimetype || ''),
    size: Number(file.size || 0),
  }));
}

function normalizeShifts(value) {
  const raw = parseMaybeJson(value, value || []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((shift, index) => ({
      shiftId: String(shift?.shiftId || new mongoose.Types.ObjectId()),
      label: String(shift?.label || `Shift ${index + 1}`).trim(),
      startAt: shift?.startAt ? new Date(shift.startAt) : null,
      endAt: shift?.endAt ? new Date(shift.endAt) : null,
      capacityMax: parseOptionalNumber(shift?.capacityMax),
    }))
    .filter((shift) => shift.label && shift.startAt instanceof Date && !Number.isNaN(shift.startAt.getTime()) && shift.endAt instanceof Date && !Number.isNaN(shift.endAt.getTime()));
}

function normalizeRecurrence(value) {
  const raw = parseMaybeJson(value, value || {});
  const frequency = String(raw?.frequency || 'none').toLowerCase();
  return {
    frequency: RECURRENCE_FREQUENCIES.includes(frequency) ? frequency : 'none',
    endDate: raw?.endDate ? new Date(raw.endDate) : undefined,
    seriesId: raw?.seriesId ? String(raw.seriesId) : undefined,
  };
}

function addRecurrenceStep(date, frequency) {
  const next = new Date(date);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'biweekly') next.setDate(next.getDate() + 14);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

function buildRecurringInstances(payload) {
  const frequency = payload?.recurrence?.frequency || 'none';
  const recurrenceEnd = payload?.recurrence?.endDate instanceof Date && !Number.isNaN(payload.recurrence.endDate.getTime())
    ? payload.recurrence.endDate
    : null;
  if (frequency === 'none' || !recurrenceEnd) return [];

  const instances = [];
  const baseStart = new Date(payload.startAt);
  const baseEnd = new Date(payload.endAt);

  let nextStart = addRecurrenceStep(baseStart, frequency);
  let nextEnd = addRecurrenceStep(baseEnd, frequency);

  while (nextStart <= recurrenceEnd) {
    instances.push({
      ...payload,
      startAt: new Date(nextStart),
      endAt: new Date(nextEnd),
      recurrence: {
        ...payload.recurrence,
      },
      rsvps: [],
      attendance: [],
    });
    nextStart = addRecurrenceStep(nextStart, frequency);
    nextEnd = addRecurrenceStep(nextEnd, frequency);
  }

  return instances;
}

function normalizeEventPayload(body = {}, uploaded = {}) {
  const visibility = parseMaybeJson(body.visibility, body.visibility || {});
  const points = parseMaybeJson(body.points, body.points || {});
  const recurrence = normalizeRecurrence(body.recurrence);
  const shifts = normalizeShifts(body.shifts);
  const attachmentsInput = parseMaybeJson(body.attachments, body.attachments || []);
  const existingAttachments = Array.isArray(attachmentsInput)
    ? attachmentsInput.filter((attachment) => attachment?.url && attachment?.name).map((attachment) => ({
        name: String(attachment.name),
        url: String(attachment.url),
        mimeType: String(attachment.mimeType || ''),
        size: Number(attachment.size || 0),
      }))
    : [];
  const uploadedAttachments = normalizeAttachments(uploaded.attachments || []);

  return {
    title: body.title,
    description: body.description,
    startAt: body.startAt,
    endAt: body.endAt,
    location: body.location,
    imageUrl: uploaded.image ? `/uploads/${uploaded.image.filename}` : (body.imageUrl || ''),
    attachments: [...existingAttachments, ...uploadedAttachments],
    isMandatory: parseBoolean(body.isMandatory, false),
    shiftBasedRegistration: parseBoolean(body.shiftBasedRegistration, false),
    shifts,
    recurrence,
    capacityMax: parseOptionalNumber(body.capacityMax),
    isPublished: parseBoolean(body.isPublished, true),
    visibility: {
      rolesAllowed: normalizeStrings(visibility?.rolesAllowed),
      memberStatusesAllowed: normalizeStrings(visibility?.memberStatusesAllowed),
    },
    points: {
      category: points?.category,
      defaultRatePerHour: parseOptionalNumber(points?.defaultRatePerHour),
      overrideTotalPoints: parseOptionalNumber(points?.overrideTotalPoints),
    },
  };
}

function isOfficerLevel(user) {
  const roles = normalizeStrings(user?.role);
  return roles.some(r => ['officer', 'exec', 'webmaster', 'webdev'].includes(r));
}

function isCandOfficer(user) {
  const roles = normalizeStrings(user?.role);
  return roles.includes('candOfficer');
}

function userHasRole(user, role) {
  const roles = normalizeStrings(user?.role);
  return roles.includes(String(role));
}

function memberStatusMatches(event, user) {
  const allowed = normalizeStrings(event.visibility?.memberStatusesAllowed);
  if (!allowed.length) return true;
  const userStatuses = normalizeStrings(user?.memberStatus);
  return userStatuses.some(s => allowed.includes(s));
}

function eventVisibleToUser(event, user) {
  if (!user) return false;
  if (isOfficerLevel(user)) return true;

  const rolesAllowed = normalizeStrings(event.visibility?.rolesAllowed);

  // candOfficer: can see candidate-visible events or events they created
  if (isCandOfficer(user)) {
    const created = String(event.createdBy || '') === String(user._id || '');
    const candidateVisible = rolesAllowed.includes('candidate');
    return created || candidateVisible;
  }

  // candidates/members/alumni/pnm require explicit role allow + optional memberStatus allow
  const roleHits = ['candidate', 'member', 'alumni', 'pnm'].some(role => (
    userHasRole(user, role) && rolesAllowed.includes(role)
  ));
  if (!roleHits) return false;

  return memberStatusMatches(event, user);
}

function getDateRange(viewParam) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const view = String(viewParam || 'week').toLowerCase();
  if (view === 'allupcoming') {
    return { start: todayStart, end: null, mode: 'future' };
  }

  if (view === 'past') {
    return { start: null, end: now, mode: 'past' };
  }

  if (view === 'week') {
    const end = new Date(todayStart);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start: todayStart, end, mode: 'between' };
  }

  if (view === 'month') {
    const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: todayStart, end, mode: 'between' };
  }

  if (view === 'nextmonth' || view === 'nextMonth') {
    const start = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1, 0, 0, 0, 0);
    const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 2, 0, 23, 59, 59, 999);
    return { start, end, mode: 'between' };
  }

  return null;
}

function canManageEvent(event, user) {
  if (!user || !event) return false;
  if (isOfficerLevel(user)) return true;
  if (isCandOfficer(user) && String(event.createdBy || '') === String(user._id || user.id)) return true;
  const coHosts = (event.coHosts || []).map(id => String(id));
  if (coHosts.includes(String(user._id || user.id))) return true;
  return false;
}

function computePoints(eventDoc) {
  const override = eventDoc?.points?.overrideTotalPoints;
  if (override != null) return override;
  const defaultRate = eventDoc?.points?.defaultRatePerHour || 0;
  const durationMs = Math.max(0, new Date(eventDoc.endAt).getTime() - new Date(eventDoc.startAt).getTime());
  const hours = durationMs / (1000 * 60 * 60);
  return Math.ceil(hours * defaultRate);
}

function userMatchesTargeting(userDoc, filters = {}) {
  const roles = normalizeStrings(userDoc?.role);
  const memberStatuses = normalizeStrings(userDoc?.memberStatus);
  const targetRoles = normalizeStrings(filters.roles);
  const targetStatuses = normalizeStrings(filters.memberStatuses);

  const roleMatch = targetRoles.length === 0 || roles.some((role) => targetRoles.includes(role));
  const statusMatch = targetStatuses.length === 0 || memberStatuses.some((status) => targetStatuses.includes(status));
  return roleMatch && statusMatch;
}

function upsertRsvpEntry(event, { userId, status, shiftId }) {
  const existingIndex = (event.rsvps || []).findIndex((entry) => String(entry.user) === String(userId));
  if (existingIndex >= 0) {
    event.rsvps[existingIndex] = {
      ...event.rsvps[existingIndex].toObject?.() || event.rsvps[existingIndex],
      user: userId,
      status,
      shiftId: shiftId || undefined,
      createdAt: new Date(),
    };
    return;
  }

  event.rsvps.push({
    user: userId,
    status,
    shiftId: shiftId || undefined,
    createdAt: new Date(),
  });
}

function isEligibleCohostUser(doc) {
  const roles = normalizeStrings(doc?.role);
  const hasRole = roles.some(r => COHOST_ROLES.includes(r));
  return !!doc?.isApproved && hasRole;
}

function summarizeRsvps(eventDoc, user) {
  const rsvps = Array.isArray(eventDoc.rsvps) ? eventDoc.rsvps : [];
  let totalGoing = 0, totalMaybe = 0, currentUserRsvp = null, currentUserShiftId = null;
  rsvps.forEach(r => {
    if (r.status === 'going') totalGoing += 1;
    if (r.status === 'maybe') totalMaybe += 1;
    if (user && String(r.user) === String(user._id || user.id)) {
      currentUserRsvp = r.status;
      currentUserShiftId = r.shiftId || null;
    }
  });
  return { totalGoing, totalMaybe, currentUserRsvp, currentUserShiftId };
}

function cloneDateWithTemplateTime(baseDate, templateDate) {
  const base = new Date(baseDate);
  const template = new Date(templateDate);
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    template.getHours(),
    template.getMinutes(),
    template.getSeconds(),
    template.getMilliseconds(),
  );
}

function mapShiftsForSeries(templateShifts = [], templateStartAt, targetStartAt) {
  const templateStart = new Date(templateStartAt);
  const targetStart = new Date(targetStartAt);
  return templateShifts.map((shift) => {
    const shiftStart = new Date(shift.startAt);
    const shiftEnd = new Date(shift.endAt);
    const startOffsetMs = shiftStart.getTime() - templateStart.getTime();
    const endOffsetMs = shiftEnd.getTime() - templateStart.getTime();
    return {
      shiftId: shift.shiftId,
      label: shift.label,
      startAt: new Date(targetStart.getTime() + startOffsetMs),
      endAt: new Date(targetStart.getTime() + endOffsetMs),
      capacityMax: shift.capacityMax,
    };
  });
}

function applySeriesTemplate(targetEvent, templatePayload, sourceEventId) {
  const templateStart = new Date(templatePayload.startAt);
  const templateEnd = new Date(templatePayload.endAt);
  const durationMs = templateEnd.getTime() - templateStart.getTime();
  const targetStart = String(targetEvent._id) === String(sourceEventId)
    ? new Date(templatePayload.startAt)
    : cloneDateWithTemplateTime(targetEvent.startAt, templateStart);
  const targetEnd = new Date(targetStart.getTime() + durationMs);

  return {
    title: templatePayload.title,
    description: templatePayload.description,
    location: templatePayload.location,
    imageUrl: templatePayload.imageUrl,
    attachments: templatePayload.attachments,
    isMandatory: templatePayload.isMandatory,
    shiftBasedRegistration: templatePayload.shiftBasedRegistration,
    shifts: templatePayload.shiftBasedRegistration ? mapShiftsForSeries(templatePayload.shifts || [], templatePayload.startAt, targetStart) : [],
    startAt: targetStart,
    endAt: targetEnd,
    capacityMax: templatePayload.capacityMax,
    isPublished: templatePayload.isPublished,
    visibility: templatePayload.visibility,
    points: templatePayload.points,
    recurrence: {
      ...(targetEvent.recurrence?.toObject?.() || targetEvent.recurrence || {}),
      ...(templatePayload.recurrence || {}),
    },
  };
}

// GET /api/events?view=week|month|nextMonth|allUpcoming|past
router.get('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const range = getDateRange(req.query.view);
    if (!range) return res.status(400).json({ message: 'Invalid view. Use week|month|nextMonth|allUpcoming|past.' });

    const query = {};
    if (range.mode === 'future') {
      query.endAt = { $gte: range.start };
    } else if (range.mode === 'past') {
      query.endAt = { $lt: range.end };
    } else {
      query.startAt = { $gte: range.start, $lte: range.end };
    }

    const sortDirection = range.mode === 'past' ? -1 : 1;
    const events = await Event.find(query).sort({ startAt: sortDirection });

    const visible = events.filter(e => eventVisibleToUser(e, user));
    const enriched = visible.map(e => ({
      ...e.toObject(),
      ...summarizeRsvps(e, user),
    }));
    return res.json(enriched);
  } catch (err) {
    console.error('Events list error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/events/mine
router.get('/mine', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const events = await Event.find({
      $or: [
        { 'rsvps.user': user._id },
        { 'attendance.user': user._id },
      ]
    }).sort({ startAt: 1 });

    const data = events.map(ev => {
      const rsvp = (ev.rsvps || []).find(r => String(r.user) === String(user._id));
      const att = (ev.attendance || []).find(a => String(a.user) === String(user._id));
      return {
        _id: ev._id,
        title: ev.title,
        description: ev.description,
        startAt: ev.startAt,
        endAt: ev.endAt,
        location: ev.location,
        imageUrl: ev.imageUrl || '',
        attachments: ev.attachments || [],
        isMandatory: !!ev.isMandatory,
        shiftBasedRegistration: !!ev.shiftBasedRegistration,
        shifts: ev.shifts || [],
        recurrence: ev.recurrence,
        capacityMax: ev.capacityMax,
        visibility: ev.visibility,
        pointsCategory: ev.points?.category,
        points: ev.points,
        currentUserRsvp: rsvp?.status || null,
        currentUserShiftId: rsvp?.shiftId || null,
        rsvpAt: rsvp?.createdAt || null,
        attendance: att
          ? {
              status: att.status,
              pointsAwarded: att.pointsAwarded,
              updatedAt: att.updatedAt || null,
            }
          : null,
      };
    });

    return res.json(data);
  } catch (err) {
    console.error('Events mine error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

function canCreate(user) {
  const roles = normalizeStrings(user?.role);
  return roles.some(r => ROLE_CREATE.includes(r));
}

function requireCreatorOrOfficer(eventDoc, user) {
  if (isOfficerLevel(user)) return true;
  if (isCandOfficer(user)) {
    return String(eventDoc.createdBy || '') === String(user?._id || '');
  }
  return false;
}

function validateEventPayload(body, isCandOfficerCreator) {
  const errors = [];
  if (!body?.title) errors.push('title required');
  if (!body?.startAt) errors.push('startAt required');
  if (!body?.endAt) errors.push('endAt required');
  if (!body?.points?.category) errors.push('points.category required');
  if (!Array.isArray(body?.visibility?.rolesAllowed) || body.visibility.rolesAllowed.length === 0) {
    errors.push('visibility.rolesAllowed required');
  }

  const category = String(body?.points?.category || '').toLowerCase();
  if (category && !POINT_CATEGORIES.includes(category)) {
    errors.push('points.category invalid');
  }

  const rolesAllowed = normalizeStrings(body?.visibility?.rolesAllowed);
  if (isCandOfficerCreator && !rolesAllowed.includes('candidate')) {
    errors.push('candOfficer events must allow candidate visibility');
  }

  const startAt = new Date(body?.startAt);
  const endAt = new Date(body?.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    errors.push('startAt and endAt must be valid dates');
  } else if (endAt <= startAt) {
    errors.push('endAt must be after startAt');
  }

  const shiftBasedRegistration = !!body?.shiftBasedRegistration;
  const shifts = Array.isArray(body?.shifts) ? body.shifts : [];
  if (shiftBasedRegistration && shifts.length === 0) {
    errors.push('at least one shift is required when shift registration is enabled');
  }
  shifts.forEach((shift, index) => {
    const shiftStart = new Date(shift?.startAt);
    const shiftEnd = new Date(shift?.endAt);
    if (!shift?.label) errors.push(`shift ${index + 1} label required`);
    if (Number.isNaN(shiftStart.getTime()) || Number.isNaN(shiftEnd.getTime())) {
      errors.push(`shift ${index + 1} must have valid dates`);
      return;
    }
    if (shiftEnd <= shiftStart) errors.push(`shift ${index + 1} end must be after start`);
  });

  const recurrence = body?.recurrence || { frequency: 'none' };
  if (!RECURRENCE_FREQUENCIES.includes(String(recurrence.frequency || 'none').toLowerCase())) {
    errors.push('recurrence.frequency invalid');
  }
  if (recurrence.frequency && recurrence.frequency !== 'none') {
    const recurrenceEnd = new Date(recurrence.endDate);
    if (Number.isNaN(recurrenceEnd.getTime())) {
      errors.push('recurrence.endDate required for recurring events');
    } else if (recurrenceEnd < startAt) {
      errors.push('recurrence.endDate must be on or after event start');
    }
  }

  return errors;
}

// POST /api/events
router.post('/', eventUpload, async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });
    if (!canCreate(user)) return res.status(403).json({ message: 'Not allowed to create events' });

    const isCandOfficerCreator = isCandOfficer(user);
    const payload = normalizeEventPayload(req.body, getUploadedFiles(req));
    const errors = validateEventPayload(payload, isCandOfficerCreator);
    if (errors.length) return res.status(400).json({ message: errors.join(', ') });

    const seriesId = payload.recurrence?.frequency !== 'none' ? String(new mongoose.Types.ObjectId()) : undefined;
    payload.createdBy = user._id;
    payload.points = {
      defaultRatePerHour: 10,
      ...payload.points,
      category: String(payload.points.category).toLowerCase(),
    };
    payload.visibility = {
      rolesAllowed: payload.visibility.rolesAllowed,
      memberStatusesAllowed: payload.visibility.memberStatusesAllowed?.length ? payload.visibility.memberStatusesAllowed : undefined,
    };
    payload.recurrence = {
      frequency: payload.recurrence?.frequency || 'none',
      ...(payload.recurrence?.endDate ? { endDate: payload.recurrence.endDate } : {}),
      ...(seriesId ? { seriesId } : {}),
    };

    const createdEvents = await Event.create([
      payload,
      ...buildRecurringInstances({ ...payload, recurrence: payload.recurrence }),
    ]);

    if (createdEvents.length > 1) {
      const rootId = createdEvents[0]._id;
      await Promise.all(createdEvents.slice(1).map((eventDoc) => Event.findByIdAndUpdate(eventDoc._id, {
        $set: {
          'recurrence.generatedFromEventId': rootId,
        }
      })));
      createdEvents[0].recurrence.generatedFromEventId = rootId;
      await createdEvents[0].save();
    }

    return res.status(201).json(createdEvents[0]);
  } catch (err) {
    console.error('Event create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/events/:id
router.patch('/:id', eventUpload, async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (!requireCreatorOrOfficer(event, user)) {
      return res.status(403).json({ message: 'Not allowed to edit this event' });
    }

    const uploaded = getUploadedFiles(req);
  const applyToSeries = parseBoolean(req.body?.applyToSeries, false);
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body || {}, key);
    const visibilityInput = parseMaybeJson(req.body?.visibility, req.body?.visibility || {});
    const pointsInput = parseMaybeJson(req.body?.points, req.body?.points || {});
    const recurrenceInput = normalizeRecurrence(req.body?.recurrence);
    const shiftsInput = normalizeShifts(req.body?.shifts);
    const attachmentsInput = parseMaybeJson(req.body?.attachments, req.body?.attachments || []);
    const preservedAttachments = Array.isArray(attachmentsInput)
      ? attachmentsInput.filter((attachment) => attachment?.url && attachment?.name).map((attachment) => ({
          name: String(attachment.name),
          url: String(attachment.url),
          mimeType: String(attachment.mimeType || ''),
          size: Number(attachment.size || 0),
        }))
      : event.attachments || [];

    const isCandOfficerEditor = isCandOfficer(user);
    const merged = {
      title: has('title') ? req.body?.title : event.title,
      description: has('description') ? req.body?.description : event.description,
      startAt: has('startAt') ? req.body?.startAt : event.startAt,
      endAt: has('endAt') ? req.body?.endAt : event.endAt,
      location: has('location') ? req.body?.location : event.location,
      imageUrl: uploaded.image ? `/uploads/${uploaded.image.filename}` : (has('imageUrl') ? req.body?.imageUrl : event.imageUrl),
      attachments: has('attachments') || uploaded.attachments.length
        ? [...preservedAttachments, ...normalizeAttachments(uploaded.attachments)]
        : (event.attachments || []),
      isMandatory: has('isMandatory') ? parseBoolean(req.body?.isMandatory, false) : event.isMandatory,
      shiftBasedRegistration: has('shiftBasedRegistration') ? parseBoolean(req.body?.shiftBasedRegistration, false) : event.shiftBasedRegistration,
      shifts: has('shifts') ? shiftsInput : (event.shifts || []),
      recurrence: has('recurrence')
        ? {
            frequency: recurrenceInput.frequency,
            ...(recurrenceInput.endDate ? { endDate: recurrenceInput.endDate } : {}),
            ...(event.recurrence?.seriesId ? { seriesId: event.recurrence.seriesId } : {}),
            ...(event.recurrence?.generatedFromEventId ? { generatedFromEventId: event.recurrence.generatedFromEventId } : {}),
          }
        : event.recurrence,
      capacityMax: has('capacityMax') ? parseOptionalNumber(req.body?.capacityMax) : event.capacityMax,
      isPublished: has('isPublished') ? parseBoolean(req.body?.isPublished, true) : event.isPublished,
      visibility: {
        rolesAllowed: has('visibility') ? normalizeStrings(visibilityInput?.rolesAllowed) : event.visibility?.rolesAllowed,
        memberStatusesAllowed: has('visibility') ? normalizeStrings(visibilityInput?.memberStatusesAllowed) : event.visibility?.memberStatusesAllowed,
      },
      points: {
        category: has('points') ? pointsInput?.category : event.points?.category,
        defaultRatePerHour: has('points') ? parseOptionalNumber(pointsInput?.defaultRatePerHour) : event.points?.defaultRatePerHour,
        overrideTotalPoints: has('points') ? parseOptionalNumber(pointsInput?.overrideTotalPoints) : event.points?.overrideTotalPoints,
      }
    };

    const errors = validateEventPayload(merged, isCandOfficerEditor);
    if (errors.length) return res.status(400).json({ message: errors.join(', ') });

    merged.points.category = String(merged.points.category).toLowerCase();

    if (applyToSeries && event.recurrence?.seriesId) {
      const seriesEvents = await Event.find({ 'recurrence.seriesId': event.recurrence.seriesId }).sort({ startAt: 1 });
      for (const seriesEvent of seriesEvents) {
        const seriesUpdate = applySeriesTemplate(seriesEvent, merged, event._id);
        Object.assign(seriesEvent, seriesUpdate);
        await seriesEvent.save();
      }

      const refreshed = await Event.findById(req.params.id);
      return res.json(refreshed);
    }

    Object.assign(event, merged);
    await event.save();
    return res.json(event);
  } catch (err) {
    console.error('Event update error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!eventVisibleToUser(event, user)) return res.status(403).json({ message: 'Not allowed' });

    const summary = summarizeRsvps(event, user);
    return res.json({ ...event.toObject(), ...summary });
  } catch (err) {
    console.error('Event detail error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/events/:id/manage
router.get('/:id/manage', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManageEvent(event, user)) return res.status(403).json({ message: 'Not allowed' });

    const ids = new Set();
    (event.rsvps || []).forEach(r => ids.add(String(r.user)));
    (event.attendance || []).forEach(a => ids.add(String(a.user)));
    (event.coHosts || []).forEach(h => ids.add(String(h)));

    const users = await User.find({ _id: { $in: Array.from(ids) } })
      .select('firstName lastName role memberStatus');
    const userMap = new Map(users.map(u => [String(u._id), u]));

    const eligibleMembers = await User.find({
      isApproved: true,
    })
      .select('firstName lastName role memberStatus');

    const rsvps = (event.rsvps || []).map(r => ({
      ...r.toObject?.() || r,
      userInfo: userMap.get(String(r.user)) || null,
    }));
    const attendance = (event.attendance || []).map(a => ({
      ...a.toObject?.() || a,
      userInfo: userMap.get(String(a.user)) || null,
    }));
    const coHosts = (event.coHosts || []).map(id => userMap.get(String(id))).filter(Boolean);

    const counts = { goingCount: 0, maybeCount: 0, notGoingCount: 0 };
    (event.rsvps || []).forEach(r => {
      if (r.status === 'going') counts.goingCount += 1;
      else if (r.status === 'maybe') counts.maybeCount += 1;
      else if (r.status === 'notGoing') counts.notGoingCount += 1;
    });

    return res.json({
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        startAt: event.startAt,
        endAt: event.endAt,
        location: event.location,
        imageUrl: event.imageUrl || '',
        attachments: event.attachments || [],
        isMandatory: !!event.isMandatory,
        shiftBasedRegistration: !!event.shiftBasedRegistration,
        shifts: event.shifts || [],
        recurrence: event.recurrence,
        isPublished: event.isPublished !== false,
        points: event.points,
        visibility: event.visibility,
        capacityMax: event.capacityMax,
        createdBy: event.createdBy,
        coHosts: coHosts,
      },
      rsvps,
      attendance,
      eligibleMembers: eligibleMembers
        .filter((member) => eventVisibleToUser(event, member) || canManageEvent(event, member))
        .map((member) => ({
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          memberStatus: member.memberStatus,
        })),
      goingCount: counts.goingCount,
      maybeCount: counts.maybeCount,
      notGoingCount: counts.notGoingCount,
      capacityMax: event.capacityMax,
    });
  } catch (err) {
    console.error('Event manage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/events/:id/rsvp
router.post('/:id/rsvp', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const { status, shiftId } = req.body || {};
    if (status != null && status !== 'none' && !['going', 'maybe', 'notGoing'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!eventVisibleToUser(event, user)) return res.status(403).json({ message: 'Not allowed to RSVP' });

    if (event.shiftBasedRegistration) {
      const shifts = Array.isArray(event.shifts) ? event.shifts : [];
      if (!shiftId) return res.status(400).json({ message: 'A shift is required for this event' });
      const shift = shifts.find((entry) => String(entry.shiftId) === String(shiftId));
      if (!shift) return res.status(400).json({ message: 'Invalid shift' });

      if (status === 'going' && shift.capacityMax) {
        const shiftGoingCount = (event.rsvps || []).filter((entry) => entry.status === 'going' && String(entry.shiftId) === String(shiftId) && String(entry.user) !== String(user._id)).length;
        if (shiftGoingCount + 1 > shift.capacityMax) {
          return res.status(400).json({ message: 'Selected shift is at capacity' });
        }
      }
    }

    // capacity check for "going"
    if (status === 'going' && event.capacityMax) {
      const goingCount = (event.rsvps || []).filter(r => r.status === 'going' && String(r.user) !== String(user._id)).length;
      if (goingCount + 1 > event.capacityMax) {
        return res.status(400).json({ message: 'Event is at capacity' });
      }
    }

    const existing = (event.rsvps || []).find((entry) => String(entry.user) === String(user._id));
    const sameSelection = existing && existing.status === status && String(existing.shiftId || '') === String(shiftId || '');

    if (status === 'none' || sameSelection) {
      event.rsvps = (event.rsvps || []).filter((entry) => String(entry.user) !== String(user._id));
    } else {
      upsertRsvpEntry(event, { userId: user._id, status, shiftId });
    }

    await event.save();
    const summary = summarizeRsvps(event, user);
    return res.json({ ...event.toObject(), ...summary });
  } catch (err) {
    console.error('Event RSVP error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/events/:id/cohosts
router.patch('/:id/cohosts', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManageEvent(event, user)) return res.status(403).json({ message: 'Not allowed' });

    const coHostIds = Array.isArray(req.body?.coHostIds) ? req.body.coHostIds : [];
    if (coHostIds.length > 7) return res.status(400).json({ message: 'Max 7 co-hosts' });

    const uniqueIds = [...new Set(coHostIds.filter(id => mongoose.Types.ObjectId.isValid(id)))];
    if (uniqueIds.length !== coHostIds.length) return res.status(400).json({ message: 'Invalid user id in cohosts' });

    const users = await User.find({ _id: { $in: uniqueIds } }).select('_id role isApproved firstName lastName');
    if (users.length !== uniqueIds.length) return res.status(400).json({ message: 'Unknown user in cohosts' });
    if (users.some(u => !isEligibleCohostUser(u))) {
      return res.status(400).json({ message: 'All co-hosts must be approved and officer/exec/webmaster/webdev/candOfficer' });
    }

    event.coHosts = uniqueIds;
    await event.save();

    const coHosts = await User.find({ _id: { $in: uniqueIds } }).select('_id firstName lastName role memberStatus');
    return res.json({ coHosts });
  } catch (err) {
    console.error('Event cohosts error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/events/:id/attendance
router.put('/:id/attendance', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManageEvent(event, user)) return res.status(403).json({ message: 'Not allowed' });

    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const pointsDefault = computePoints(event);

    const map = new Map((event.attendance || []).map(a => [String(a.user), a]));

    for (const entry of entries) {
      const uid = entry?.userId || entry?.user;
      const status = entry?.status;
      if (!uid || !mongoose.Types.ObjectId.isValid(uid)) continue;
      if (!ATTENDANCE_STATUSES.includes(status)) continue;

      let points = 0;
      if (status === 'present') {
        points = entry.pointsAwarded != null ? Number(entry.pointsAwarded) : pointsDefault;
      } else {
        points = entry.pointsAwarded != null ? Number(entry.pointsAwarded) : 0;
      }
      if (points < 0) {
        return res.status(400).json({ message: 'Attendance points cannot be negative' });
      }

      const existing = map.get(String(uid));
      if (existing) {
        existing.status = status;
        existing.pointsAwarded = points;
        existing.updatedAt = new Date();
      } else {
        map.set(String(uid), {
          user: uid,
          status,
          pointsAwarded: points,
          updatedAt: new Date(),
        });
      }
    }

    event.attendance = Array.from(map.values());
    await event.save();

    // upsert ledger entries for attendance
    const ops = [];
    if (!POINT_CATEGORIES.includes(event.points?.category)) {
      console.warn('Skipping ledger upsert: invalid category', event.points?.category);
    }
    for (const att of event.attendance) {
      if (!POINT_CATEGORIES.includes(event.points?.category)) continue;
      ops.push(PointsLedger.findOneAndUpdate(
        { user: att.user, event: event._id, source: 'attendance' },
        {
          $set: {
            user: att.user,
            event: event._id,
            source: 'attendance',
            category: event.points?.category,
            status: att.status,
            points: att.pointsAwarded,
            note: `Attendance: ${att.status}`,
            createdBy: user._id,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      ));
    }
    if (ops.length) await Promise.all(ops);

    return res.json({ attendance: event.attendance });
  } catch (err) {
    console.error('Event attendance error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/events/:id/mass-rsvp
router.post('/:id/mass-rsvp', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManageEvent(event, user)) return res.status(403).json({ message: 'Not allowed' });

    const { status = 'going', roles = [], memberStatuses = [], shiftId } = req.body || {};
    if (!['going', 'maybe', 'notGoing'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (event.shiftBasedRegistration && shiftId) {
      const shift = (event.shifts || []).find((entry) => String(entry.shiftId) === String(shiftId));
      if (!shift) return res.status(400).json({ message: 'Invalid shift' });
    }

    const matchedUsers = await User.find({ isApproved: true }).select('_id role memberStatus');
    const recipients = matchedUsers.filter((member) => userMatchesTargeting(member, { roles, memberStatuses }) && eventVisibleToUser(event, member));

    recipients.forEach((member) => {
      upsertRsvpEntry(event, { userId: member._id, status, shiftId });
    });

    await event.save();
    return res.json({ count: recipients.length, event: { ...event.toObject(), ...summarizeRsvps(event, user) } });
  } catch (err) {
    console.error('Event mass RSVP error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/events/:id/manage-members
router.post('/:id/manage-members', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!canManageEvent(event, user)) return res.status(403).json({ message: 'Not allowed' });

    const { userId, rsvpStatus = 'going', attendanceStatus = 'present', shiftId, pointsAwarded } = req.body || {};
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Valid userId required' });
    }
    if (!['going', 'maybe', 'notGoing'].includes(rsvpStatus)) {
      return res.status(400).json({ message: 'Invalid rsvpStatus' });
    }
    if (!ATTENDANCE_STATUSES.includes(attendanceStatus)) {
      return res.status(400).json({ message: 'Invalid attendanceStatus' });
    }

    const member = await User.findById(userId).select('_id firstName lastName role memberStatus isApproved');
    if (!member || !member.isApproved) return res.status(404).json({ message: 'Member not found' });
    if (!eventVisibleToUser(event, member) && !canManageEvent(event, member)) {
      return res.status(400).json({ message: 'Member is not eligible for this event' });
    }

    if (event.shiftBasedRegistration) {
      const shift = (event.shifts || []).find((entry) => String(entry.shiftId) === String(shiftId));
      if (!shift) return res.status(400).json({ message: 'Valid shiftId required for shift-based events' });
    }

    upsertRsvpEntry(event, { userId, status: rsvpStatus, shiftId });

    const attendanceMap = new Map((event.attendance || []).map((entry) => [String(entry.user), entry]));
    const computedPoints = attendanceStatus === 'present'
      ? (pointsAwarded != null ? Number(pointsAwarded) : computePoints(event))
      : (pointsAwarded != null ? Number(pointsAwarded) : 0);

    attendanceMap.set(String(userId), {
      user: userId,
      status: attendanceStatus,
      pointsAwarded: computedPoints,
      updatedAt: new Date(),
    });

    event.attendance = Array.from(attendanceMap.values());
    await event.save();

    if (POINT_CATEGORIES.includes(event.points?.category)) {
      await PointsLedger.findOneAndUpdate(
        { user: userId, event: event._id, source: 'attendance' },
        {
          $set: {
            user: userId,
            event: event._id,
            source: 'attendance',
            category: event.points.category,
            status: attendanceStatus,
            points: computedPoints,
            note: `Attendance: ${attendanceStatus}`,
            createdBy: user._id,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    return res.json({ event: { ...event.toObject(), ...summarizeRsvps(event, user) } });
  } catch (err) {
    console.error('Event manual add error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/events/:id?scope=single|series
router.delete('/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (!requireCreatorOrOfficer(event, user)) {
      return res.status(403).json({ message: 'Not allowed to delete this event' });
    }

    const scope = String(req.query.scope || 'single').toLowerCase();
    const deleteSeries = scope === 'series' && !!event.recurrence?.seriesId;
    const targetEvents = deleteSeries
      ? await Event.find({ 'recurrence.seriesId': event.recurrence.seriesId }).select('_id')
      : [{ _id: event._id }];
    const targetIds = targetEvents.map((entry) => entry._id);

    await PointsLedger.deleteMany({ event: { $in: targetIds } });
    const result = await Event.deleteMany({ _id: { $in: targetIds } });

    return res.json({
      deletedCount: result.deletedCount || 0,
      scope: deleteSeries ? 'series' : 'single',
    });
  } catch (err) {
    console.error('Event delete error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
