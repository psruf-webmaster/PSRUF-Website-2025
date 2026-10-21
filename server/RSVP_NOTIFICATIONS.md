# RSVP email notifications

The member `POST /api/events/:id/rsvp` endpoint sends one email after a successfully persisted new RSVP, status change, shift change, or explicit `status: "none"` removal. Going, Maybe, and Not Going are distinct statuses; removal is labelled “Cancelled (RSVP removed)” and retains the former shift in the email. Repeating an identical selection or removing an absent RSVP is a no-op. The web client already sends `none` when the member deselects their response.

Only the event creator receives mail, using their current account `personalEmail` fetched after the save. Co-hosts receive no notifications, including when the creator also appears in `coHosts`; this yields one recipient and avoids sharing member responses with additional accounts. A missing creator/account email skips delivery with a sanitized diagnostic.

Each event document represents one occurrence. Emails use that document's title, start/end dates and ID, plus the resulting selected shift's label and times (the previous shift for cancellation). Times explicitly use America/New_York. The direct `/#/events/:id` link opens the existing occurrence detail view, using `FRONTEND_URL` or the public website default. Emails contain only the member's display name and RSVP information, with escaped HTML and a plain-text alternative.

Officer bulk `mass-rsvp` and administrative `manage-members` operations send no RSVP notification emails. They do not invoke the member notification path, regardless of batch size. This avoids an unbounded per-member blast. Their results remain available in event management.

The RSVP write compares the previously read RSVP array atomically before replacing it. A concurrent conflicting write returns 409 and sends no email; a retry reads the updated selection and suppresses duplicate changes. Invalid, unauthorized, unchanged, or failed writes never invoke delivery. Other event properties are not overwritten by the RSVP write.

Delivery uses the existing shared email module and Resend HTTPS transport. The request attempts delivery after saving and catches delivery and recipient-lookup errors, preserving a successful RSVP response. Failed mail is logged with event ID and allowlisted error code/numeric status only, never recipient addresses, provider response text, or message content. No automatic retry occurs: an ambiguous provider timeout must not cause duplicate mail. This is best-effort sending, not a durable outbox; process failure between commit and delivery may lose a notification, and a provider failure does not resend on an unchanged RSVP retry. Resend acceptance is not proof of inbox delivery; inspect its delivery dashboard for downstream status.

Run `node --test tests/rsvpNotifications.test.js tests/eventPermissions.test.js tests/emailDelivery.test.js` from `server`. HTTP tests use real Mongoose event documents with mocked database persistence and email delivery; they do not send live emails or prove MongoDB integration.
