# Password management configuration

The Render deployment file sets `FRONTEND_URL=https://phisigmarhouf.com`. Set this on the **backend Render service** as well if it is managed separately. When unset, links default to that public website; `RENDER_EXTERNAL_URL` is deliberately ignored because it may be an API-only host. Links use `/#/reset-password?token=...` to open the existing HashRouter directly, without requiring a server route. Request a new email after deploying or changing this setting. For local development, set `FRONTEND_URL=http://localhost:3000`. Recovery links never use request host or origin headers.

Set `JWT_SECRET` to a strong random secret before deploying. Login issues an HS256 JWT valid for one day; the web client stores it as `psr_token` and removes it on logout. Existing sessions must log out and log in again to change passwords.

Set `FRONTEND_URL` to the public frontend base URL (for example `https://example.com`, without a hash route). Configure email delivery as described below. Reset emails link directly to `/#/reset-password?token=...`. The client also translates older `/reset-password` links when the host serves the SPA at that path.

Reset tokens are random 32-byte values; only their SHA-256 digest is stored. They expire after one hour, are replaced by new requests, and are atomically cleared on successful reset. Password changes also clear outstanding reset tokens. Both public endpoints allow ten requests per IP per fifteen minutes using the existing express-rate-limit dependency. Mail failures are logged server-side without changing the generic account-existence response.

This feature requires JWT authentication on password changes and profile updates (including the recovery email). Password changes and resets increment `passwordVersion`, invalidating previously issued JWTs on these endpoints. A signed-in password change returns a replacement JWT for the current client. Existing tokens without a version require a fresh login. Other endpoints still use legacy user-ID authentication and need a separate application-wide migration; this does not provide global session revocation.

Run backend coverage with `node tests/passwordManagement.test.js` from `server` and focused frontend tests with `npm test -- --watchAll=false --runInBand --testPathPattern=PasswordReset.test.js` from `client`. Backend tests exercise HTTP routes with an in-memory model stub and mocked email delivery; verify delivery against configured SMTP and MongoDB in staging before release.

## Email delivery on Render Free

Both approval emails and password reset emails use the same delivery service. The Render blueprint selects Resend over HTTPS; it does not use Gmail SMTP. An existing service may need these settings added manually in Render → Environment:

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`: create a sending API key at https://resend.com/api-keys and save it directly in Render, never in client environment files or source control.
- `EMAIL_FROM`: a sender such as `PSR Webmaster <no-reply@your-domain.com>` on a domain you own and have verified in Resend.

Create a Resend account, add your domain at https://resend.com/domains, and add the DNS records Resend supplies at your DNS provider. Wait until Resend marks the domain verified. A Gmail address cannot be used as your verified Resend sender. Resend's default test sender is restricted to your account email and is not suitable for sending to all members.

Save the Render settings and redeploy these changes. Request a reset for an existing account's personal email and inspect the Resend dashboard for delivery status, then redeem the link. Test account approval email delivery too. Startup's “Email transport configured” message confirms local configuration only, not inbox delivery. Provider failures log a sanitized error code and HTTP status; `403` can indicate sender/domain restrictions, `401` authentication, and `429` rate limits. The public reset response remains generic to avoid exposing account existence.

Outside Render Free, SMTP remains supported with `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and optional `SMTP_FROM_NAME` / `SMTP_FROM_EMAIL`. If no provider is selected, a configured `RESEND_API_KEY` selects Resend; otherwise SMTP is used. HTTPS failures never silently fall back to SMTP.

Run backend tests with `node --test tests/emailDelivery.test.js tests/passwordManagement.test.js tests/passwordAdversarial.test.js` from `server`. Tests mock provider requests; they do not prove live delivery.
