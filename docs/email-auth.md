# Email authentication setup

## User flow

```text
New user: Google sign-in → send six-digit email code → verify once
          → enter mobile contact number → choose site password → workspace

Returning member: verified email + site password → workspace
                  Google registration displays "already registered" instead of signing in

Owner administrator: Google sign-in remains available for emergency access

Forgot password: verified email → email code → choose new password → sign in
```

The verified email is the username. The mobile number is stored as contact information only. Passwords are stored as salted scrypt hashes; codes are stored as keyed hashes, expire after 10 minutes, have a five-attempt limit, and are consumed after verification. The code request endpoint is rate limited.

## Before deployment

1. Create a transactional email account with Resend. Add `senganthal.co.in` as a sending domain and add the DNS records Resend provides at the domain registrar. Wait for domain verification. A subdomain such as `mail.senganthal.co.in` is also possible; the `From` address must match the verified domain.
2. In Render, set `RESEND_API_KEY` to the private API key and `EMAIL_OTP_FROM` to a verified sender, for example `Senganthal <login@senganthal.co.in>`. Keep the API key only in Render secrets. Do not put it in Git or chat.
3. Keep `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `MONGODB_URI`, and `ADMIN_EMAILS` configured. Check that the Google OAuth callback is `https://www.senganthal.co.in/api/auth/callback/google` if that is the configured site origin.
4. Remove the unused `TWOFACTOR_API_KEY`, `TWOFACTOR_TEMPLATE_NAME`, and `TWOFACTOR_SMS_ONLY_READY` variables from Render after the new version is deployed and verified. Rotate the previously shared 2Factor key at that provider as well.
5. Test with a **new non-admin** Google account: send the email code, complete setup, sign out, then sign in with email and password. Try Google again and verify it shows the already-registered message without signing in. Test password reset. Check that a wrong or expired code is rejected. Do not send any code or password to a developer.

Do not deploy this branch to the live site until email delivery works. New Google members and existing non-admin members without the new verification fields are sent to account setup and cannot access the workspace until they finish it. Existing phone-only accounts cannot use the removed phone login; migrate their data and identities with the account owner before deployment. No database records are automatically deleted.

## Razorpay website review account

Use the isolated reviewer identity, not a normal member or administrator. Run `node scripts/create-reviewer.mjs` locally. This creates a random password and salted scrypt hash in the ignored `.data/razorpay-reviewer-credentials.txt` file without printing secrets. It refuses to overwrite an existing file. The email-shaped username is a demo identity, not a mailbox; it requires no Google account or email OTP.

Privately copy the four `REVIEWER_*` environment values from that file into Render. Deploy, then test the username/password on `/login`. The session opens the labelled sample-data workspace and receives HTTP 403 from member/admin APIs. It cannot read production chats, portfolios or users. It expires after 14 days; setting `REVIEWER_LOGIN_ENABLED=false`, changing the hash or expiry, or removing configuration invalidates reviewer sessions. Do not put this identity in `ADMIN_EMAILS` or create it as a normal member.

Provide only the SITE username/password through Razorpay's official verification form. Never provide an administrator account, Google password, OTP, API key or password hash. Explain that it is an isolated sample-data demo and has no live checkout. Disable it after review, redeploy and delete the private local credentials file when no longer needed.

The Razorpay website form should use `https://www.senganthal.co.in/` and answer **Yes** when asked whether users must log in. Confirm that the site's payment, pricing, refund and cancellation terms accurately describe the eventual paid product before enabling live charges. Payment integration is a separate release; this authentication change does not activate subscriptions.
