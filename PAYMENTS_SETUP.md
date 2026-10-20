# Paid membership launch

The code supports ₹600 INR every year through Razorpay Subscriptions. Access begins only after a signed `subscription.charged` webhook confirms a captured ₹600 payment. Administrator accounts remain free. A separate admin grant can give a user temporary access without creating a payment.

## Configure providers

1. Activate a Razorpay merchant account and enable Subscriptions. Create a plan with `period=yearly`, `interval=1`, `amount=60000` paise, `currency=INR`. In Test Mode, record the key ID, secret and plan ID.
2. Add a Razorpay webhook at `https://www.senganthal.co.in/api/billing/webhook` for `subscription.charged`, `subscription.activated`, `subscription.cancelled`, `subscription.pending` and `subscription.halted`. Generate a separate webhook secret. Test and Live modes need their own credentials and webhook configuration.
3. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_ID` and `RAZORPAY_WEBHOOK_SECRET` as private Render environment variables. Never commit or paste secret values into the repository.
4. Activate Twilio Verify and its SMS channel for Indian numbers. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_VERIFY_SERVICE_SID` privately in Render. Verify any India messaging and DLT requirements with the provider.
5. Use a test account to register by phone, sign in with phone and password, authorize the Razorpay subscription, verify that the first `subscription.charged` event unlocks the workspace, then cancel renewal from Membership and confirm access remains until the paid period ends. Repeat a renewal webhook in Test Mode to verify extension without shortening access.
6. Confirm `NEXTAUTH_URL` is the exact public origin and the Google OAuth redirect URI includes `https://www.senganthal.co.in/api/auth/callback/google`. Verify an owner account can sign in before the account purge.

## Purging existing non-admin users

The ignored local backup at `.data/purge-backups/` contains a complete BSON-aware snapshot and a SHA-256 checksum. Run `node --env-file-if-exists=.env.local scripts/purge-nonadmin.mjs --backup-only` to refresh it. Only after the new access code is deployed, the owner can sign in, the subscription path is tested, and every existing non-admin subscription is cancelled, run `node --env-file-if-exists=.env.local scripts/purge-nonadmin.mjs --apply <absolute-backup-path>`.

The purge preserves `ADMIN_EMAILS` accounts and members with `role=admin`. It removes other members and user-linked workspace data. It does not delete global settings or general error logs. New users may register again through Google or verified phone and will need payment or an admin grant to enter the workspace.

## Operational points

- The first checkout callback only shows a pending state. The verified webhook is the source of access.
- Keep a current database backup and set up monitoring of webhook failures. A missing webhook delays activation.
- The Render free plan may sleep when idle; assess paid hosting before taking subscription revenue.
- The owner should confirm the classification and any registration obligations for daily stock recommendations before charging for that content.
