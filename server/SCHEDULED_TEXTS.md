# Scheduled text blasts

Approved Webmaster (role or position) and VP Communications & Records (`VP_COMMUNICATIONS` position) accounts can choose **Also send as text blast → Text delivery → Schedule for later** in the feed composer. Scheduling uses a signed JWT; users with stale sessions need to sign in again. Web Dev, other execs, and officers do not inherit scheduling permission. Immediate SMS permissions remain as before.

The feed post publishes immediately. Only SMS delivery is delayed. The selected browser-local time is shown with its timezone and converted to an ISO timestamp with UTC offset before saving. Times must be between one minute and 90 days ahead. The text message and audience selection are saved with the post. Editing the feed post does not change the queued text: cancel it and create a new scheduled blast to change the message/time. Deleting the post before it is claimed removes the queued blast as well.

Webmaster and C&R can view the most recent 100 scheduled blasts and cancel pending blasts from **Scheduled text blasts** in the composer. This is a shared queue, so either authorized account can cancel the other's pending blast. Cancellation atomically competes with the worker; once sending has begun, cancellation returns 409 and cannot recall sent texts. Deleting a post after sending starts also cannot recall delivery.

The worker runs on startup and every minute while the server is awake, processing up to 10 jobs per scan. MongoDB atomically changes a due blast from pending to sending, preventing concurrent workers/restarts from replaying it. It rechecks the creator's current approval/scheduling permission, feed access/posting rights and archived state before resolving current audience members and phone numbers through the existing resolver. Revoked permissions, archived feeds, and blasts over 24 hours late are cancelled. Audience membership is evaluated at send time, not frozen when scheduled.

The shared SMS service sends the saved message. Counts are persisted with status sent, partial, or failed. Provider details, phone numbers, and message contents are not written to worker logs. A partially delivered blast is never automatically retried; neither is a job left sending by a process crash. Inspect its state and provider dashboard before taking further action to avoid duplicate texts. The provider can accept a message without guaranteeing handset delivery.

## Render Free setup

A sleeping Render service cannot run its timer. The existing authenticated `POST /api/internal/event-reminders` scheduler endpoint now also runs the scheduled SMS worker and returns a `texts.processed` count. Configure an external scheduler to call that backend endpoint every 1–5 minutes with `Authorization: Bearer YOUR_REMINDER_CRON_SECRET`, using the same `REMINDER_CRON_SECRET` saved in Render. Scheduling accuracy depends on that invocation cadence and service wake-up time. This change does not provision an external scheduler or change your SMS provider credentials.

Tests: from `server`, run `node --test tests/scheduledSms.test.js`. From `client`, run `CI=true npm test -- --watchAll=false --runInBand --testPathPattern=ScheduledTexts.test.js`. Tests mock SMS delivery and do not send real texts.
