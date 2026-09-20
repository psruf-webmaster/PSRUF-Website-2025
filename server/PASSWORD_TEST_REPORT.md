# Password flow adversarial review

## Confirmed and fixed

- **Critical: recovery-email takeover.** Before the fix, isolated HTTP tests returned 200 when a caller replaced another user's personal email using only a MongoDB user ID in the bearer header or request body. That email is the reset destination. `PATCH /api/users/me` now requires verified JWT middleware before processing uploads. Tests now expect 401 and verify the email is unchanged. Web and mobile callers now send the JWT.
- **Old JWTs survived password recovery.** Password updates now increment a stored `passwordVersion`; JWT middleware rejects old versions. Signed-in changes return a fresh JWT. Tests cover rejection of old tokens and continued use of the replacement. This protects the two JWT endpoints, not legacy endpoints elsewhere in the application.
- **Reset form state survived a different reset link.** Form state is now keyed to the token, so another link clears the previous success and password values.

## Automated coverage

Result: all 35 focused tests passed. The production build passed with existing unused-code warnings in `App.js` and `Bylaws.js`; with `CI=true`, those warnings cause the build to fail. `git diff --check` passed. Modified mobile JSX parsed successfully.

22 backend tests (19 adversarial and 3 original): forged/unsigned/expired/future JWTs, wrong algorithms, missing secrets, unapproved accounts, recovery-email authentication bypasses, malformed password/email/token types, MongoDB operator injection payloads, bcrypt's 72-byte boundary including Unicode, token replacement, digest redemption rejection, reuse, expiration boundaries, eight simultaneous resets, simultaneous password changes, SMTP failures, configuration failures, host-header tampering, rate limiting, sanitized database failures, JWT rotation, and outstanding-token invalidation.

13 frontend tests: invalid/missing tokens, mismatched passwords, successful resets, payload contents, in-flight button disabling, network failure recovery, expired-token errors, request confirmation, required profile fields, JWT headers for profile/password updates, replacement JWT storage, legacy-session rejection, and navigation to another token. Tests use the real React Router implementation and mocked HTTP responses; animation and auth context are stubbed.

Commands:

```powershell
cd server
node tests/passwordManagement.test.js
node tests/passwordAdversarial.test.js
cd ../client
npm test -- --watchAll=false --runInBand --testPathPattern=PasswordAdversarial.test.js --silent
npm run build
```

## Remaining risks and limits

- **Application-wide authentication remains a serious gap.** Routes including `/api/auth/me` and admin routes still treat a public user ID as authentication. Password recovery cannot revoke that access. A full JWT migration is needed before describing the site as secure.
- **Account-enumeration timing remains.** A registered email waits for SMTP; an unknown email does not. Identical response bodies do not conceal this latency difference. A durable asynchronous email job architecture should decouple request timing from account existence.
- **Rate limiting is process-local and proxy configuration needs deployment verification.** The public reset endpoints share a ten-request/15-minute IP bucket. Behind a proxy, lack of correctly configured trusted proxy handling can group users into one bucket. Multiple processes have separate buckets; login and authenticated password changes do not currently have equivalent attempt limits.
- Tests make real loopback HTTP calls using real JWT/bcrypt libraries, but MongoDB and email are replaced with in-memory stubs. The concurrent tests verify application behavior under that model, not real MongoDB integration. No production accounts, real mailbox delivery, or production load tests were used.
- Mobile changes were syntax-checked, not exercised on a device. Old sessions must log in again to obtain versioned JWTs.
- Existing full-client App test has a React Router/CRA Jest resolver incompatibility; the focused test uses the real router through its compatible file path. The pre-existing deleted MemberProfile test and unrelated lockfile changes were preserved.

The passing checks are regression evidence, not a production security certification.
