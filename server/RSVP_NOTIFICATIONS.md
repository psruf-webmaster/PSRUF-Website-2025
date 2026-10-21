# RSVP email notifications

The member `POST /api/events/:id/rsvp` endpoint sends a member confirmation after a successfully persisted new RSVP, status change, shift change, or explicit `status: "none"` removal. Going, Maybe, and Not Going are distinct statuses; removal says the member “cancelled their RSVP” and retains the former shift in the email. Repeating an identical selection or removing an absent RSVP is a no-op. The web client already sends `none` when the member deselects their response.

Only the member who changed their RSVP receives an email, using their current account `personalEmail` fetched after the save. Confirmations use personal wording (“You’re going to…”, “You might be able to make it to…”, “You marked yourself as not going to…”, or “You cancelled your RSVP for…”). Event creators and co-hosts receive no organizer notifications. A creator who RSVPs to their own event gets the same single member confirmation as anyone else. A missing member account/email skips delivery with a sanitized diagnostic.

Each event document represents one occurrence. Emails use that document's title, start/end dates and ID, plus the resulting selected shift's label and times (the previous shift for cancellation). Times use America/New_York with readable EST/EDT labels; same-day ranges show the date once. Subjects and opening sentences address the member directly. Recurring events include a short reminder that the RSVP applies to this date only. The direct `/#/events/:id` link opens the existing occurrence detail view, using `FRONTEND_URL` or the public website default. Emails contain only the member's display name and RSVP information, with escaped HTML and a plain-text alternative.

Officer bulk `mass-rsvp` and administrative `manage-members` operations send no RSVP notification emails. They do not invoke the member notification path, regardless of batch size. This avoids an unbounded per-member blast. Their results remain available in event management.

The RSVP write compares the previously read RSVP array atomically before replacing it. A concurrent conflicting write returns 409 and sends no email; a retry reads the updated selection and suppresses duplicate changes. Invalid, unauthorized, unchanged, or failed writes never invoke delivery. Other event properties are not overwritten by the RSVP write.

Delivery uses the existing shared email module and Resend HTTPS transport. The request attempts delivery after saving and catches delivery and recipient-lookup errors, preserving a successful RSVP response. Failed mail is logged with event ID and allowlisted error code/numeric status only, never recipient addresses, provider response text, or message content. No automatic retry occurs: an ambiguous provider timeout must not cause duplicate mail. This is best-effort sending, not a durable outbox; process failure between commit and delivery may lose a notification, and a provider failure does not resend on an unchanged RSVP retry. Resend acceptance is not proof of inbox delivery; inspect its delivery dashboard for downstream status.

Run `node --test tests/rsvpNotifications.test.js tests/eventPermissions.test.js tests/emailDelivery.test.js` from `server`. HTTP tests use real Mongoose event documents with mocked database persistence and email delivery; they do not send live emails or prove MongoDB integration.

## Event reminders

Members currently marked Going receive reminders 72 hours and 3 hours before their selected shift starts, or before the occurrence starts for events without shifts. Maybe, Not Going, removed RSVPs, missing/unapproved accounts, deleted events, and unpublished events are excluded. These are member reminders, not organizer alerts. Bulk-added Going members follow the same reminder schedule. The current personal email is read at send time.

The server checks every five minutes and once on startup. MongoDB's `EventReminder` collection stores a deterministic claim per occurrence/member/start time/reminder offset, preventing duplicate sends across instances and restarts. A changed start time creates a new reminder schedule. A removed or changed selection is checked again before delivery. Delivery failure is recorded as `failed` with sanitized logs; ambiguous failures and claims left by a crash are not automatically retried. Record states are `claimed`, `sent`, `failed`, and `skipped`; records expire 90 days after the scheduled event start.

A reminder is eligible during the hour after its due time. RSVPs created after that due time do not get a late catch-up reminder, but remain eligible for the later reminder. Downtime beyond that window misses the reminder rather than sending stale messages. Each scan attempts at most 100 deliveries. This is best-effort email; provider acceptance does not guarantee inbox delivery.

### Required setup for reliable timing on Render Free

A sleeping web service cannot run its own timer. Configure an external HTTP scheduler to call the following endpoint **every five minutes**:

- Method: `POST`
- URL: `https://YOUR-BACKEND-HOST/api/internal/event-reminders` (use the same backend service that handles the RSVP API)
- Header: `Authorization: Bearer YOUR_REMINDER_CRON_SECRET`

Generate a strong random `REMINDER_CRON_SECRET` and save the same value in the backend's Render environment and in the scheduler's protected header setting. Do not commit it or put it in a URL. The endpoint rejects missing/wrong credentials, returns scan counts for successful calls, and returns 503 while the database is unavailable. An always-on service can instead rely on the built-in timer. No external scheduler or paid service is provisioned by this code change.

Run `node tests/eventReminders.test.js` from `server` for reminder coverage. The tests mock storage and delivery and do not verify an external scheduler or live inbox delivery.
