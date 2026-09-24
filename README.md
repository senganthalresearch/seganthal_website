# Senganthal Research Terminal

Private stock research workspace with Google sign-in, an approved-member list, Indian market quotes, company fundamentals, watchlists, news, team chat, company filings and daily swing screens.

## Run locally

Use Node.js 22 or newer. Dependencies are already installed in this project. In PowerShell:

```powershell
npm.cmd run dev
```

Open http://localhost:3000. The login page links to `/preview`, a development-only sample workspace. Preview figures are illustrative and changes are not saved. The project runs independently of the ChatGPT desktop application.

For a fresh installation, use the committed pnpm lockfile: `corepack pnpm install --frozen-lockfile` (pnpm 10.17.1).

## Configuration

Keep credentials in `.env.local`; never commit or share that file. Copy `.env.example` only if `.env.local` does not already exist.

Required settings: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MONGODB_URI`, and comma-separated `ADMIN_EMAILS`. `MONGODB_DB` defaults to `senganthal`.

Google OAuth must permit the callback URL `<NEXTAUTH_URL>/api/auth/callback/google`. Use an approved, verified Google email. Owners in `ADMIN_EMAILS` can approve other accounts in Admin. Database access is checked on protected requests, so revoking a member takes effect without waiting for their session to expire.

```powershell
npm.cmd run check:setup
npm.cmd run check:setup -- --database
```

The first command checks configuration presence without printing secrets. The second also attempts a read-only MongoDB ping. Neither validates Google credentials; complete a browser sign-in to verify OAuth. MongoDB must allow the host's network connection and the app's database user must be able to read, write and create indexes.

PDF extraction additionally needs `ANTHROPIC_API_KEY` and a supported `ANTHROPIC_MODEL`. Choose a model available to your provider account. Extraction sends a PDF to Anthropic only after the user consents. Without extraction, use **Company filings → Enter figures manually**, review values in INR crore, add source/page references in Notes, and save. Original PDFs are not stored.

## Validation and production

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd start
```

Tests compile into the ignored `.test-build` directory and use Node's test runner. They cover access rules, real calendar dates, input validation, missing financial data, EMA/RSI calculations, cross/volume detection and CSV escaping.

Production requires a Node server or compatible Next.js host, not static file hosting. Set `NEXTAUTH_URL` to the deployed origin, configure the matching Google callback, and provide production environment variables. `vercel.json` is included, but its presence does not mean a deployment exists. Sample preview returns 404 in production.

On first database use, indexes are created for unique watchlist entries, unique filings per owner/symbol/period, unique member emails, recent messages, and expiry of rate-limit counters. If an older database contains duplicate filings, resolve those records with the owner before creating the unique index; the app does not delete research records automatically.

## Audit and remaining setup

The existing app contains all eight main screens and their API routes. This audit added manual filing entry, strict calendar-date validation, database indexes/expired-counter cleanup, trimmed member email validation, a setup checker and regression tests.

At inspection, required environment fields were populated, while the optional Anthropic API key was absent. Populated fields do not prove credentials are valid. Remaining acceptance work is a real approved-account Google login, connected database read/write checks, live quote/news checks, and an optional extraction check after supplying a valid provider key. Hosting must be confirmed separately; no deployment was performed during this audit.

### Verification results (22 September 2026)

- Regression suite: 7 tests passed.
- Updated production build: passed, including Next.js TypeScript validation.
- Browser: local sample dashboard and updated company filing screen rendered successfully; preview controls correctly remain read-only.
- MongoDB: read-only connection/ping failed both inside and outside the sandbox. Database-dependent workflows remain blocked until database credentials/network availability are corrected.
- Google OAuth: settings exist, but a successful approved-account login has not been verified.
- Automatic PDF extraction: blocked by missing `ANTHROPIC_API_KEY`; manual entry is implemented but saving still requires a working database and sign-in.
- Deployment: not performed or verified.

### Follow-up diagnosis

Google's authorization page explicitly returns `401: disabled_client` and states that the OAuth client was disabled. The Google Cloud project owner must inspect and restore the existing client or configure a replacement before Google login can succeed.

MongoDB fails with `MongoServerSelectionError` during TLS connection setup, including outside the restricted sandbox. Inspect Atlas cluster availability, network access and connection configuration; the failure alone does not identify which setting is responsible. TLS verification remains enabled.

Login now reports database service failures separately from unapproved-account errors, and allows retry when opening the Google sign-in flow fails.

### Connection recovery and appeal

- Atlas reported that the current computer's IP was not on its access list. Its Add Current IP Address action added a single /32 rule. The subsequent MongoDB connection and ping passed. This supersedes the earlier connection failure; another network or hosting environment needs its own approved access configuration.
- Live provider checks passed for an NSE quote (TCS) and the market news RSS feed. Run `npm.cmd run check:setup -- --market` to repeat these read-only checks.
- The owner approved submission of the Google Cloud appeal. Google displayed: "Submitted request. Check your email for confirmation."
- Google project/OAuth restoration is pending Google's review. An approved-account end-to-end login and saved-data workflow verification remain blocked until restoration.
- Optional automated PDF extraction still requires a valid Anthropic API key. Manual filing entry is implemented.
