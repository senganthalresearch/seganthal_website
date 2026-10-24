# Mobile, payment and security review — 24 October 2026

## Changes

- Production homepage search now opens the requested workspace view through the normal authentication/payment gates instead of merely scrolling to login.
- Workspace search has an explicit submit button and a mobile search keyboard. Submitting closes navigation overlays.
- Category buttons remain reachable while the mobile drawer is open. The sliding overlap was removed. Administrators have a direct Admin shortcut in the header; server permissions still enforce admin access.
- Research tabs scroll horizontally with larger touch targets. Admin sections, dialogs and forms fit narrow screens.
- UPI appears before annual card checkout. Closing an unused card checkout requires provider-confirmed cancellation; an authenticated mandate or captured payment cannot be silently discarded.
- Admin → UPI payment requests → Record verified payment records an existing member's verified ₹599 credit, 12-digit reference, chosen expiry (within one year), verification note and actor history. It never creates a charge. References cannot be reused; existing access, pending claims and unresolved card subscriptions block duplicate recording. Complimentary access remains a separate, honestly labelled feature.
- Card checkout and manual payment submissions share a member lock to prevent simultaneous payment-method creation.
- Tamil homepage wording now says “சேர்ந்து கற்போம்; தெளிவுடன் ஆராய்வோம்!” (Learn together; research with clarity). Tamil text has explicit language and font treatment, with readable mobile line spacing.
- News requests have shorter timeouts, a response-size limit, malformed-feed checks and partial-source warnings. Company-specific Moneycontrol searches no longer silently return unrelated articles. Standard news can show a labelled, bounded last-successful result during outages; order alerts never use this stale fallback.
- Password resets invalidate older sessions, including legacy sessions lacking an issue timestamp.
- Production cannot fall back to a local development database during a MongoDB outage, even if the development fallback flag was accidentally copied into hosting configuration.
- Updated Zod to 4.6.7 and transitive body-parser to 2.4.0 for reported denial-of-service advisories.

## Verification

- 55 automated tests passed, including payment permission/origin checks, duplicate references, expiry validation, reset-session invalidation and stale-news bounds.
- Production build passed (46 routes).
- Production dependency audit: zero known advisories after patching. This is not a guarantee of zero vulnerabilities.
- Isolated browser tests use mocked APIs: UPI ordering, unused card checkout switch, mobile category navigation, search, admin shortcut, payment recording, desktop and 320/390px layouts. No real bank payment, member modification or notification was made by these tests.
- Pattern scan of 226 tracked files and 485 text blobs in locally available Git history found only a deliberately fake MongoDB URL in a test. No tracked `.env.local` or `.env` history was found. This scan is not a full remote GitHub secret-scanning assessment.

## Before publishing / operational checks

1. Local checks below were completed before release. Confirm the deployed commit using `/api/health`; a successful Git push alone does not confirm a live deployment.
2. After deployment, check with a real admin phone and a normal unpaid account; verify the normal account cannot open admin APIs or member tools.
3. Verify merchant credits independently before recording a payment. Screenshots alone are not proof. Admin recording does not cancel existing mandates or execute refunds.
4. Verify live email delivery, webhook delivery and reconciliation using the provider's supported test process. External news availability cannot be guaranteed; the fallback is in-memory and is lost on restart.
5. Rotate any Resend/OTP/payment secrets previously shared in chat if not already replaced, and update them privately in Render. Rotation was not performed in this review.
6. GitHub: Settings → General → Danger Zone → Change repository visibility → Private, if you want private source. Ensure Render retains repository access. Review available Secret scanning, push protection and Dependabot settings under repository security settings. Changing visibility does not revoke a leaked secret.

References: [GitHub visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility), [GitHub security settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository).

## Files changed

UI: `components/research-shell.tsx`, `components/login.tsx`, `components/terminal.tsx`, `components/billing-account.tsx`, `components/manual-upi-payment.tsx`, `components/manual-payment-admin.tsx`, `components/record-payment.tsx`, `components/admin-users.tsx`, `app/research.css`.

Server/auth: `app/api/billing/route.ts`, `app/api/manual-payments/route.ts`, `app/api/email-auth/route.ts`, `app/api/news/route.ts`, `lib/billing.ts`, `lib/manual-payment-rules.ts`, `lib/news-cache.ts`, `lib/auth.ts`, `lib/member-access.ts`, `lib/db.ts`, `lib/types.ts`.

Dependencies/tests/docs: `package.json`, `pnpm-lock.yaml`, `tests/billing.test.ts`, `tests/manual-payment-route.test.ts`, `tests/member-access.test.ts`, `tests/news-cache.test.ts`, `MANUAL_UPI.md`, this report.
