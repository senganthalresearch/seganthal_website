# Manual UPI membership

UPI submissions are closed by default. Publishing this version does not enable QR collections; an administrator must complete Business QR setup first.

## Open the screens

- Member: `/account`, after completing account setup.
- Administrator: `/workspace#Admin` → **UPI payment requests**.
- Supplied QR: `public/payments/bharatpe-qr.jpeg`, labelled **MR SURIYA V**. This is the original supplied image, not a regenerated QR.

The QR flow starts **closed**. An administrator can enable it under **Business QR setup** after confirming ownership/authorisation of the recipient and the merchant provider's permission for these membership payments. A working QR does not resolve Razorpay's business-category or SEBI requirements.

## Member flow

The signed-in account supplies the email automatically. The user pays ₹599, enters the payer name, 12-digit UPI reference (UTR/RRN), actual payment time and a JPG/PNG/WebP screenshot up to 2 MB. The screenshot is not automatically read or accepted as proof of receipt. Requests remain pending until reviewed. Only one pending request is permitted per account. An existing active membership or unresolved card subscription prevents a second purchase through this flow.

## Admin review

Match the reference, amount and successful receipt in the actual merchant payment records. Never approve from the screenshot alone. Confirm the receipt check and enter a review note. Approval grants one calendar year from the approval time, with manual renewal. Rejection leaves access locked. Revoking a grant removes its access; it **does not transfer a refund**. Arrange any eligible refund through the merchant provider and record the refund reference in the review note before revoking.

The review queue supports status filters, exact account-email search and 20 requests per page. A payment cannot be approved twice. Review history is retained on the payment record. References remain reserved after rejection/revocation to prevent reuse. If a user typed a wrong reference or another account has claimed it, investigate and resolve through support rather than asking the user to pay again.

## Storage and verification

- `manualPayments`: account ID, verified account email, payer-supplied fields, amount, private screenshot, consent/version, status, access period and review history.
- Unique indexes: UTR across requests; one pending request per account.
- Access checks read approved payment records and match the original account ID. Recreating an account with the same email does not inherit access.
- `members.manualPaidUntil` is a searchable admin-directory summary, not the access authority.
- Financial writes and manual-access reads require MongoDB. They do not use the local JSON fallback.
- Mutation requests require a valid session and origin check. Only admins can configure, approve, reject or revoke. Proof is retrievable only by its submitting account or an admin, with private/no-store responses.

## Email

Uses existing `RESEND_API_KEY`, `EMAIL_OTP_FROM`, `NEXTAUTH_URL` and `ADMIN_EMAILS` configuration. New-request notifications go to configured owner/admin email addresses in `ADMIN_EMAILS`. Review results go to the member's verified account email. Emails link to the authenticated review/account page and do not attach screenshots. Failed notifications do not reverse saved decisions; administrators can retry a failed notification in the review panel. No real email delivery was tested as part of local implementation.

## Local verification

Use an isolated test database for real local submissions; do not point local payment tests at the production database. The automated route tests use an isolated ledger and mocked email, and the browser checks intercept API calls. No actual payment, approval, notification or merchant-account setting was changed during those checks.

Automated checks cover unauthenticated/unauthorised access, origin enforcement, proof privacy, fixed server amount, account email binding, duplicate UTRs, one pending request, repeated/concurrent approval, account recreation, revocation, expiry, leap-year duration and image restrictions. Existing Razorpay billing tests remain in place. The local browser checks cover desktop/mobile forms, proof upload, pending state, review and approval UI.
