# Senganthal review readiness — 23 October 2026

## Included in this release

- Public homepage, About, pricing, contact and policy pages; canonical URLs, sitemap and robots.txt. Authentication, accounts and private workspaces remain noindex.
- Annual price: INR 599. Server-side access uses verified annual invoice/payment records. Test records cannot unlock the production domain. Unpaid accounts may sign in and manage billing, but cannot use protected tools.
- Checkout signatures, signed raw-body webhooks, event deduplication, payment ownership, cancellation and refund reconciliation are implemented. Checkout fails closed when provider configuration is incomplete.
- Searchable, paginated admin user directory and expiring, administrator-controlled reviewer access for an existing verified website account. Its original password remains valid. Reviewer sessions open labelled sample data and cannot call private member/admin APIs. They are not real checkout tests.
- Consistent locally served Roboto for English with Noto Sans Tamil fallback; active styles use supplied font weights.
- Business identity updated from the owner-supplied Udyam certificate: SENGANTHAL INVESTMENT GROUP, a Micro services proprietorship; proprietor recorded as JAYAMOHAN. Registered enterprise address: No. 3/3A, Mela Street, Thombakkulam, Keelarajakularaman, Virudhunagar, Tamil Nadu 626136. The previously supplied Theni address is labelled separately as support correspondence. Website administrator profile remains as supplied by the owner and does not assert a different legal proprietor. The certificate has not been independently validated against the government record; owner/PAN/bank identity and current addresses must be confirmed for merchant KYC.
- Refund requests within seven calendar days of first purchase; duplicate/incorrect charges reviewed for refunds. Approved refunds initiated within seven working days, plus bank processing. Cancellation stops future renewal while retaining the paid period.

## Checks

- 45 automated tests pass, including existing reviewer passwords, expiry/revocation, payment signatures, annual periods, refunds and test/live separation. Provider requests in automated payment tests are mocked.
- Production build passes. Public route checks and reviewer isolation checks pass, including 18 read and four write API denials.
- SEO checks pass: ten public routes, normal and Googlebot HTML, canonical links, no conflicting noindex, private routes, sitemap and robots.
- Public TLS validation previously passed for both domain names. Certificates expire 23 December 2026; Render manages renewal.

## Remaining external or operational checks

1. Razorpay rejected the website for its stock-related financial-services category, according to the owner-supplied rejection notice. Updated Udyam business details do not reverse that decision. Obtain written category acceptance before enabling payments.
2. A real Razorpay test subscription checkout, provider webhook delivery and full failure/refund/renewal scenarios must pass before accepting real payments. This release does not claim those tests happened. Local payment configuration is incomplete; production configuration needs verification.
3. Confirm merchant/KYC identity, market-data commercial permissions and tax obligations. No SEBI registration or investment-advice approval is claimed.
4. Confirm rotation of secrets previously shared in chat, hosting/database backup retention, restore drill and uptime/error alerts. No backup recovery or load certification has been performed.
5. Password reset does not immediately revoke all already-issued normal-member JWTs; they expire within eight hours. Account suspension does deny access. Immediate reset-based session revocation remains pending.
6. Reviewer access is sample-only. If Razorpay requests actual checkout access, arrange a separate approved test walkthrough and clearly describe the demonstration limits.

No guarantee of Razorpay approval, search indexing or zero downtime is made. Live deployment and account verification are reported separately after the release is pushed.
