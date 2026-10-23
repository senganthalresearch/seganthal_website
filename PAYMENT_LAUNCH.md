# Payment launch — ₹599 per year

The owner reports Razorpay approval. Provider credentials and live configuration have not yet been verified. The annual plan is ₹599 INR, automatically renewed, with up to ten annual charges as disclosed at checkout.

## 1. Prepare the live Razorpay account

1. Select **Live mode**. Under **Account & Settings → API Keys**, use the live Key ID (`rzp_live_...`) and Key Secret. Keep them private.
2. Open **Subscriptions → Plans → New Plan**. Name: `Senganthal Annual Membership`. Amount: **599 INR**. Frequency: **every 1 year**. Save the `plan_...` ID. The API represents this amount as 59900 paise; the dashboard amount is ₹599. If Subscriptions is unavailable, ask Razorpay to enable it before continuing.
3. Under **Account & Settings → Webhooks**, prepare a webhook for:
   `https://www.senganthal.co.in/api/billing/webhook`
4. Use a separate, randomly generated webhook secret (for example, 32 random bytes from a password manager). Save the identical secret in Render. Set a monitored alert email.
5. Select all available `subscription.*` events, plus `invoice.paid`, `payment.captured`, `payment.failed`, `payment.refunded` and `refund.processed`. Enable delivery when the configured endpoint is ready; while billing is disabled it returns 503.

## 2. Save server-only variables in Render

Open the existing web service → **Environment → Edit**, and add/update:

| Variable | Value |
| --- | --- |
| `RAZORPAY_KEY_ID` | Live Key ID |
| `RAZORPAY_KEY_SECRET` | Live Key Secret |
| `RAZORPAY_YEARLY_PLAN_ID` | Live ₹599 annual plan ID |
| `RAZORPAY_WEBHOOK_SECRET` | Same secret as the webhook |
| `RAZORPAY_MODE` | `disabled` during preparation; `live` only at launch |
| `NEXTAUTH_URL` | `https://www.senganthal.co.in` |
| `REVIEWER_LOGIN_ENABLED` | `false` after review |

Never use `NEXT_PUBLIC_` for secrets. Save and deploy the environment change. Saving keys while mode is disabled does not enable checkout.

**Render Free:** sign in as an administrator → My Space → Admin → System health and logs → **Check payment setup**. It reads the configured plan without revealing credentials or creating payments. Shell access is not required.

Optional read-only configuration check on plans with Render Shell: `node scripts/check-billing.mjs`. Locally use `node --env-file=.env.local scripts/check-billing.mjs`.

## 3. Verify before enabling customer payments

Use separate **test** keys and a **test** ₹599 yearly plan on localhost or a separate staging host. Production intentionally rejects test mode. A webhook needs a publicly reachable staging URL; localhost alone is insufficient. Never overwrite production live keys with test keys.

- New verified member → Account & billing → unpaid tools blocked.
- Successful test checkout → server verifies captured payment against the matching annual invoice → tools enabled.
- Failed/cancelled checkout → no access.
- Authentic webhook delivery returns 2xx, duplicate events do not extend access.
- Cancellation retains the paid year but stops renewal.
- Full refund revokes that paid period and stops future renewal.
- Administrator and complimentary member can enter without checkout; a complimentary grant does not cancel an existing paid subscription.

After these pass, change Render `RAZORPAY_MODE` to `live`, deploy, enable the live webhook and check deliveries. The owner must perform any real payment personally. Do not claim live payment success from mocked automated tests.

## Administrator access

**Admin → User management → Add member / View/edit**. Enter their email, retain a regular role, choose **Grant / extend 1 year**, enter a reason and **Save member**. The invited person completes normal Google signup, email verification and password setup. The grant gives workspace access without admin powers. Removal/expiry restores the payment requirement. Choose the Administrator role only for someone who should manage users and site settings.

## Non-admin reset

`node --env-file=.env.local scripts/reset-non-admin-users.mjs` previews the exact database and counts without changing it. Applying requires `--apply --database=senganthal --expected-count=<preview count>`.

The command preserves configured owners and every database administrator. It refuses to run if any current or legacy billing records exist. It removes non-admin account/login records and associated research data in one MongoDB transaction. Audit history and site settings remain. New signups after the snapshot follow normal verification and payment rules.

Before deletion, it saves an encrypted BSON-compatible backup under `.data/account-reset-backups/` and verifies decryption from disk. **Keep the NEXTAUTH_SECRET used at reset in a secure password manager: it is needed to decrypt the backup if the secret is later rotated.** Backups are ignored by Git and are not served publicly. Restoration must be performed as a separate maintenance task after reviewing conflicts with newly registered accounts.

Member sessions are tied to the database account ID. Deleting and recreating an email does not revive an old session. Existing non-admin sessions from before this release must sign in again; administrator access remains available.

Official references: [API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/), [plan API](https://razorpay.com/docs/api/payments/subscriptions/create-plan/), [webhooks](https://razorpay.com/docs/payments/dashboard/account-settings/webhooks/), [subscription events](https://razorpay.com/docs/webhooks/subscriptions/).
