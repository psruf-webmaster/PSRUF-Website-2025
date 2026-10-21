# Password management configuration

The Render deployment file sets `FRONTEND_URL` to `https://psruf-website-2026.onrender.com`. If it is unset, password reset links fall back to Render's `RENDER_EXTERNAL_URL` for the combined frontend/API service. For a custom domain or separately hosted frontend, set `FRONTEND_URL` explicitly. Recovery links never use request host or origin headers. Outside Render, `FRONTEND_URL` is required (use `http://localhost:3000` for local development).

Set `JWT_SECRET` to a strong random secret before deploying. Login issues an HS256 JWT valid for one day; the web client stores it as `psr_token` and removes it on logout. Existing sessions must log out and log in again to change passwords.

Set `FRONTEND_URL` to the public frontend base URL (for example `https://example.com`, without a hash route). Configure the existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and optional `SMTP_FROM_NAME` / `SMTP_FROM_EMAIL` settings. Reset emails link to `/reset-password?token=...`; the host must serve the SPA at that path. The Express production server already supports this fallback. The client translates that URL to its hash route.

Reset tokens are random 32-byte values; only their SHA-256 digest is stored. They expire after one hour, are replaced by new requests, and are atomically cleared on successful reset. Password changes also clear outstanding reset tokens. Both public endpoints allow ten requests per IP per fifteen minutes using the existing express-rate-limit dependency. Mail failures are logged server-side without changing the generic account-existence response.

This feature requires JWT authentication on password changes and profile updates (including the recovery email). Password changes and resets increment `passwordVersion`, invalidating previously issued JWTs on these endpoints. A signed-in password change returns a replacement JWT for the current client. Existing tokens without a version require a fresh login. Other endpoints still use legacy user-ID authentication and need a separate application-wide migration; this does not provide global session revocation.

Run backend coverage with `node tests/passwordManagement.test.js` from `server` and focused frontend tests with `npm test -- --watchAll=false --runInBand --testPathPattern=PasswordReset.test.js` from `client`. Backend tests exercise HTTP routes with an in-memory model stub and mocked email delivery; verify delivery against configured SMTP and MongoDB in staging before release.
