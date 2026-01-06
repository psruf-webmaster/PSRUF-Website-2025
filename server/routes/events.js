const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const PointsLedger = require('../models/PointsLedger');

const ROLE_CREATE = ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'];
const POINT_CATEGORIES = ['phi', 'sigma', 'rho', 'tau'];
const ATTENDANCE_STATUSES = ['present', 'absent', 'excused'];
const COHOST_ROLES = ['officer', 'exec', 'webmaster', 'webdev', 'candOfficer'];

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
  if (view === 'week') {
    const end = new Date(todayStart);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return { start: todayStart, end };
  }

  if (view === 'month') {
    const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: todayStart, end };
  }

  if (view === 'nextmonth' || view === 'nextMonth') {
    const start = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1, 0, 0, 0, 0);
    const end = new Date(todayStart.getFullYear(), todayStart.getMonth() + 2, 0, 23, 59, 59, 999);
    return { start, end };
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

function isEligibleCohostUser(doc) {
  const roles = normalizeStrings(doc?.role);
  const hasRole = roles.some(r => COHOST_ROLES.includes(r));
  return !!doc?.isApproved && hasRole;
}

function summarizeRsvps(eventDoc, user) {
  const rsvps = Array.isArray(eventDoc.rsvps) ? eventDoc.rsvps : [];
  let totalGoing = 0, totalMaybe = 0, currentUserRsvp = null;
  rsvps.forEach(r => {
    if (r.status === 'going') totalGoing += 1;
    if (r.status === 'maybe') totalMaybe += 1;
    if (user && String(r.user) === String(user._id || user.id)) {
      currentUserRsvp = r.status;
    }
  });
  return { totalGoing, totalMaybe, currentUserRsvp };
}

// GET /api/events?view=week|month|nextMonth
router.get('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const range = getDateRange(req.query.view);
    if (!range) return res.status(400).json({ message: 'Invalid view. Use week|month|nextMonth.' });

    const events = await Event.find({
      startAt: { $gte: range.start, $lte: range.end },
    }).sort({ startAt: 1 });

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
        startAt: ev.startAt,
        endAt: ev.endAt,
        pointsCategory: ev.points?.category,
        currentUserRsvp: rsvp?.status || null,
        attendance: att ? { status: att.status, pointsAwarded: att.pointsAwarded } : null,
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

  return errors;
}

// POST /api/events
router.post('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });
    if (!canCreate(user)) return res.status(403).json({ message: 'Not allowed to create events' });

    const isCandOfficerCreator = isCandOfficer(user);
    const errors = validateEventPayload(req.body, isCandOfficerCreator);
    if (errors.length) return res.status(400).json({ message: errors.join(', ') });

    const payload = { ...req.body };
    payload.createdBy = user._id;
    payload.points = {
      defaultRatePerHour: 10,
      ...payload.points,
      category: String(payload.points.category).toLowerCase(),
    };
    payload.visibility = {
      rolesAllowed: payload.visibility.rolesAllowed,
      memberStatusesAllowed: payload.visibility.memberStatusesAllowed,
    };

    const event = await Event.create(payload);
    return res.status(201).json(event);
  } catch (err) {
    console.error('Event create error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/events/:id
router.patch('/:id', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ message: 'User required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (!requireCreatorOrOfficer(event, user)) {
      return res.status(403).json({ message: 'Not allowed to edit this event' });
    }

    const isCandOfficerEditor = isCandOfficer(user);
    const merged = {
      title: req.body?.title ?? event.title,
      description: req.body?.description ?? event.description,
      startAt: req.body?.startAt ?? event.startAt,
      endAt: req.body?.endAt ?? event.endAt,
      location: req.body?.location ?? event.location,
      capacityMax: req.body?.capacityMax ?? event.capacityMax,
      isPublished: req.body?.isPublished ?? event.isPublished,
      visibility: {
        rolesAllowed: req.body?.visibility?.rolesAllowed ?? event.visibility?.rolesAllowed,
        memberStatusesAllowed: req.body?.visibility?.memberStatusesAllowed ?? event.visibility?.memberStatusesAllowed,
      },
      points: {
        category: req.body?.points?.category ?? event.points?.category,
        defaultRatePerHour: req.body?.points?.defaultRatePerHour ?? event.points?.defaultRatePerHour,
        overrideTotalPoints: req.body?.points?.overrideTotalPoints ?? event.points?.overrideTotalPoints,
      }
    };

    const errors = validateEventPayload(merged, isCandOfficerEditor);
    if (errors.length) return res.status(400).json({ message: errors.join(', ') });

    merged.points.category = String(merged.points.category).toLowerCase();

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
        startAt: event.startAt,
        endAt: event.endAt,
        location: event.location,
        points: event.points,
        visibility: event.visibility,
        capacityMax: event.capacityMax,
        createdBy: event.createdBy,
        coHosts: coHosts,
      },
      rsvps,
      attendance,
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

    const { status } = req.body || {};
    if (!['going', 'maybe', 'notGoing'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!eventVisibleToUser(event, user)) return res.status(403).json({ message: 'Not allowed to RSVP' });

    // capacity check for "going"
    if (status === 'going' && event.capacityMax) {
      const goingCount = (event.rsvps || []).filter(r => r.status === 'going' && String(r.user) !== String(user._id)).length;
      if (goingCount + 1 > event.capacityMax) {
        return res.status(400).json({ message: 'Event is at capacity' });
      }
    }

    let updated = false;
    event.rsvps = (event.rsvps || []).map(r => {
      if (String(r.user) === String(user._id)) {
        updated = true;
        return { ...r.toObject?.() || r, status, createdAt: new Date() };
      }
      return r;
    });

    if (!updated) {
      event.rsvps.push({ user: user._id, status, createdAt: new Date() });
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

module.exports = router;
