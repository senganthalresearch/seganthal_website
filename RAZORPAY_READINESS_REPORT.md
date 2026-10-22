# Senganthal website review report

Prepared 22 October 2026. Scope: existing Next.js website, public review pages, authentication isolation, claims and payment-readiness audit.

**Overall: MANUAL REVIEW.** The website review package is implemented and locally tested. This is not a certification, a guarantee of Razorpay approval, or a functioning paid-subscription launch. Production deployment and the dedicated reviewer configuration still need verification. No production user records were deleted and no live payment was initiated.

## Confirmed business details

- Individual operator: **Jayamohan Sundararaj**. Website brand: **Senganthal**. No registered company, SEBI registration or GST registration claimed.
- Operating/contact address: **118/7, Ganesh Nagar, Venkatachalapuram, Theni, Tamil Nadu – 625534, India**.
- Support: **senganthalreserch@gmail.com**, **+91 90258 39615**, Monday–Sunday, **6 PM–10 PM IST**.
- Grievance contact: **Surya**, using the same support channels. Approved targets: acknowledgement within 48 hours and resolution within 30 days.
- Approved proposed plan: **₹600 total/year**, annual renewal with explicit consent; cancellation stops the next renewal, access continues until the paid year ends.
- Approved refund policy: full refund requested within 7 calendar days of first purchase, including use of the digital tools; duplicate/incorrect charges eligible after verification. Approved refunds initiated within 7 working days, plus provider/bank processing time.
- These details are owner-provided, not independently identity-verified. Ensure the individual operator matches the legal merchant, PAN and settlement account in Razorpay. Earlier discussion of a Surya checkout display name does not establish that match.

## Findings and disposition

| Severity | Result | Finding / action |
|---|---|---|
| HIGH | PASS locally | About was protected; pricing and policies were absent. Added public pages and footer navigation without authentication. |
| HIGH | PASS locally | Removed unverified anniversary/customer-count/default company-history claims and misleading “Always Free” subscription copy. |
| HIGH | PASS locally | Scanner calculated entry, stop-loss and target levels and gave exit instructions despite the owner confirming data/education-only scope. Removed those actual API calculations and UI instructions; retained historical indicators. |
| HIGH | PASS locally | A normal reviewer member could see shared production chat. Added an explicitly labelled sample-data identity, server-enforced API denial, salted password hash, 20-attempt/hour rate limit, expiry and session revocation on configuration changes. |
| HIGH | FAIL — not implemented | No Razorpay checkout, server subscription creation, webhook signature verification/deduplication, payment persistence, paid-entitlement checks, recurring cancellation or payment reconciliation exists in this checkout. Render keys alone do not implement them. Existing member access remains administrator-controlled. |
| HIGH | MANUAL REVIEW | Commercial data-use/redistribution rights for Yahoo, NSE, MFapi and news/images were not supplied or verified. No API-access test proves a licence. |
| HIGH | MANUAL REVIEW | Confirm whether scores, screening outputs, classes and any administrator-authored content constitute regulated advice/research. No SEBI exemption is asserted based on having only 100 users or calling content education. |
| HIGH | MANUAL REVIEW | Confirm Razorpay account activation, subscription product eligibility, legal merchant identity and site/category approval in the actual dashboard. No application was submitted on the owner's behalf. |
| MEDIUM | MANUAL REVIEW | Existing database-stored About content/announcements may retain previous claims. Defaults were corrected; production content was not overwritten. Review these in Admin before submission. |
| MEDIUM | MANUAL REVIEW | Operator reports no GST registration; no extra GST is offered. An accountant must confirm actual registration/tax obligations before charging. No “GST exempt” claim has been added. |
| MEDIUM | MANUAL REVIEW | Verify live Google signup, Resend delivery, password reset and administrator sign-in after deployment. Prior user-confirmed delivery is not a fresh end-to-end test. |
| MEDIUM | MANUAL REVIEW | Password reset does not revoke every existing normal member JWT immediately; sessions last up to 8 hours. Deactivating a member denies workspace access. A future auth-version/session-revocation change merits a separate tested release. |
| MEDIUM | MANUAL REVIEW | Verify hosting/database backup retention and manual deletion operations. Privacy text describes the current absence of automatic account/research expiry rather than inventing a deletion guarantee. |
| LOW | PASS | Test command now clears its fixed generated output directory, preventing deleted legacy phone-auth tests from appearing in current results. |
| LOW | MANUAL REVIEW | No lint script is configured; lint was not run. |

## Payment security assessment

There is no existing Razorpay implementation to verify. Accordingly, server-trusted pricing, payment signatures, raw-body webhook verification, idempotency, failed-payment handling and paid-access enforcement are **FAIL / not implemented**, not passed security checks. Public payment-status pages do not accept URL parameters as payment proof and cannot activate access. They truthfully state that checkout is inactive.

Before a paid launch, implement a server-controlled ₹600 annual plan, test-mode subscription creation, signed webhook handling with durable event deduplication, account/subscription ownership checks, verified activation, renewal failure/expiry handling, cancellation, refunds and reconciliation. Test these with Razorpay test credentials. Do not enable live charges until the owner and Razorpay authorise them. A sample-data reviewer login does not demonstrate a working checkout.

## Executed tests and limits

| Check | Result | Evidence / limitation |
|---|---|---|
| TypeScript | PASS | `pnpm typecheck` completed successfully; final production build also type-checked all source. |
| Unit/integration tests | PASS | `pnpm test`: **38 passed, 0 failed**. Includes Google registration decisions, password hashing, reviewer credential callbacks/rate limits/expiry/revocation, permissions, data-provider failures and missing-data handling. Reviewer callback test uses a mocked database and never reads production members. |
| Production build | PASS | `pnpm build`: compiled and generated 41 routes. |
| Public availability/navigation | PASS locally | `node scripts/check-reviewer-access.mjs` starts an isolated-config production server and runs `check-public-pages.mjs`: 12 pages return HTTP 200 without cookies, policy links are present, price is rendered and status page does not claim payment success. |
| Reviewer isolation | PASS locally | Signed test-session fixture opens labelled sample dashboard. 18 member/admin read endpoints and four writes return 403; onboarding rejects the reviewer; invalid fingerprint and anonymous access are denied. All real provider credentials are overridden for this test. |
| Responsive presentation | PASS for sampled pages | Browser inspection: desktop pricing and risk disclosure at 390×844. No full cross-browser/device or screen-reader certification performed. |
| Charts | MANUAL REVIEW | Existing chart components retained; historical indicator calculations tested. Full company-by-company rendering/interaction audit was not executed. |
| HTTPS | PASS for observed live endpoint | Read-only requests to the existing live login/health endpoints succeeded over HTTPS. This does not certify all TLS, DNS or enterprise-filter configurations. |
| Contact | PASS for implementation | Public email and telephone links are present. No contact form was added; no form delivery/spam test is claimed. Support inbox/phone availability remains owner-verified. |
| Secret scan | PASS for scoped scan | No tracked `.env`/`.env.local` and no matches for scanned Resend/Razorpay key patterns in tracked files. Not a complete historical or infrastructure secret audit. Previously disclosed keys should remain rotated privately. |
| Checkout, payment signatures, duplicate webhooks, failed charges, paid entitlements | FAIL — unavailable | Not implemented; no live charge attempted and no test-mode success claimed. |
| Live reviewer credentials | MANUAL REVIEW | Generated privately but require Render configuration and live login verification. |

## Reviewer access and deployment

1. Publish the tested commit to the connected GitHub deployment branch; in Render choose **Manual Deploy → Deploy latest commit** if automatic deployment is disabled. Confirm the commit in Events is **Live** and `/api/health` reports that revision.
2. The generated credentials are stored locally in the ignored `.data/razorpay-reviewer-credentials.txt`. Never commit that file. Privately add its four `REVIEWER_*` values in Render, then redeploy. This does not change ordinary member signup/sign-in.
3. The reviewer username is a demo identity, not a mailbox. It opens sample data only, has no administrator privileges, no production chats/holdings/users and no live checkout. Credentials expire after 14 days. Disable `REVIEWER_LOGIN_ENABLED` and redeploy when review finishes.
4. Test the live email/password reviewer login and sign-out, the sample-data badge, and denial of `/api/members`, `/api/chat` and `/api/portfolio`. Run `CHECK_ORIGIN=https://www.senganthal.co.in node scripts/check-public-pages.mjs` using the appropriate shell environment syntax.
5. Verify ordinary member and administrator sign-in yourself without sharing passwords/OTPs. Review stored public announcements/About content, legal merchant identity, data licensing and financial-service classification.
6. In Razorpay's official website verification form, provide `https://www.senganthal.co.in/` and explain that membership requires sign-in. Supply only the site reviewer username/password if requested. Describe it honestly as an isolated sample-data demo. Never supply a Google password, administrator password, API key or password hash.

Razorpay decides whether this pre-launch website/demo is sufficient for its review. Public policies do not substitute for working payment integration, legitimate KYC or commercial data rights.

## URLs for review after deployment

- https://www.senganthal.co.in/ (anonymous visitors reach the public landing/login page)
- https://www.senganthal.co.in/login
- https://www.senganthal.co.in/about
- https://www.senganthal.co.in/contact
- https://www.senganthal.co.in/pricing
- https://www.senganthal.co.in/privacy-policy
- https://www.senganthal.co.in/terms-and-conditions
- https://www.senganthal.co.in/refund-policy
- https://www.senganthal.co.in/cancellation-policy
- https://www.senganthal.co.in/risk-disclosure
- https://www.senganthal.co.in/grievance
- https://www.senganthal.co.in/subscription-success (neutral status, not proof of payment)
- https://www.senganthal.co.in/subscription-failed

## Official references consulted

- [Razorpay onboarding documents](https://razorpay.com/blog/minimum-documents-payment-gateway-onboarding-india/): eligible individual/unregistered businesses may apply; approval depends on the applicable category/documents.
- [Razorpay terms](https://razorpay.com/terms/): truthful merchant/business details are required.
- [Razorpay normal refunds](https://razorpay.com/docs/payments/refunds/normal/): return to the original method; bank processing varies and can take 7–10 working days. The owner's initiation target is separate.
- [NSE data policy](https://www.nseindia.com/static/market-data/nse-data-policy): redistribution rights depend on the relevant agreement; no grant inferred from website/API access.
- [SEBI caution concerning unregistered advisers/research analysts](https://www.sebi.gov.in/media/press-releases/jun-2016/sebi-cautions-public-to-deal-with-only-sebi-registered-investment-advisers-and-research-analysts_32627.html): consult qualified counsel about the actual service; disclaimers alone do not determine eligibility.

## Files changed

Public pages and layout:
`app/about/page.tsx`, `app/contact/page.tsx`, `app/pricing/page.tsx`, `app/privacy-policy/page.tsx`, `app/terms-and-conditions/page.tsx`, `app/refund-policy/page.tsx`, `app/cancellation-policy/page.tsx`, `app/risk-disclosure/page.tsx`, `app/grievance/page.tsx`, `app/subscription-success/page.tsx`, `app/subscription-failed/page.tsx`, `app/public-pages.css`, `app/layout.tsx`, `components/public-page.tsx`, `components/review-page.tsx`, `lib/public-content.ts`, `lib/review-pages.ts`.

Landing, content and scanner:
`components/login.tsx`, `components/research-shell.tsx`, `components/community.tsx`, `components/workflows.tsx`, `lib/site-settings.ts`, `lib/analytics.ts`, `tests/core.test.ts`.

Reviewer access:
`lib/reviewer-access.ts`, `lib/auth.ts`, `lib/http.ts`, `lib/types.ts`, `app/page.tsx`, `app/complete-account/page.tsx`, `app/api/email-auth/route.ts`, `components/terminal.tsx`, `scripts/create-reviewer.mjs`, `tests/reviewer-access.test.ts`, `tests/reviewer-auth.test.ts`, `.env.example`, `docs/email-auth.md`.

Verification/documentation:
`scripts/check-public-pages.mjs`, `scripts/check-reviewer-access.mjs`, `scripts/clean-test-build.mjs`, `tests/tsconfig.json`, `package.json`, `README.md`, `RAZORPAY_READINESS_REPORT.md`.

Private local output: `.data/razorpay-reviewer-credentials.txt` (ignored; not published). Existing unrelated user scripts, screenshots and `RESEARCH_FEATURES.md` were preserved and are not part of this change.
