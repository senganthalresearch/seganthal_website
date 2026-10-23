# Search indexing audit and fix

Verified locally on 23 October 2026. Not deployed by this task.

## Cause and audit findings

- `app/layout.tsx` originally supplied `noindex, nofollow` to every page that did not override it.
- `app/page.tsx` originally required a session and redirected unauthenticated visitors to `/login`. The destination also inherited noindex. Google could not obtain an indexable homepage.
- Nine informational pages already overrode robots with `index, follow`, but had no explicit canonical URLs or individual descriptions.
- No `generateMetadata` functions, nested route layouts, middleware or proxy files were present. No manual robots meta tags were found in components.
- `next.config.ts` had general security headers and a localhost/127.0.0.1 normalization redirect. It had no X-Robots-Tag. The local-host redirect is preserved and does not redirect the public production domain.
- `render.yaml` uses `next start`, the main branch and auto-deploy. It contains no robots/header/redirect override. `vercel.json` only selects Next.js and sets API function duration. Both hosting files remain unchanged.
- Neither a sitemap nor robots.txt existed in `app` or `public`.
- Production read-only checks confirmed `/` returned 307 to `/login` with noindex, `/about` returned 200 with index/follow, and `/robots.txt` and `/sitemap.xml` returned 404. There was no X-Robots-Tag on these responses. Remote dashboard-only rules cannot be audited from the repository, but no additional blocking header appeared on the sampled production responses.

## Resulting route policy

| Routes | Policy |
| --- | --- |
| `/` | Public marketing homepage, HTTP 200 without a session, index/follow, canonical `https://www.senganthal.co.in` |
| `/about`, `/contact`, `/pricing`, `/privacy-policy`, `/terms-and-conditions`, `/refund-policy`, `/cancellation-policy`, `/risk-disclosure`, `/grievance` | Public HTTP 200, index/follow, one canonical for each path |
| `/login` | Existing signup/sign-in UI, noindex/nofollow |
| `/workspace` | Existing authenticated terminal, onboarding and membership checks preserved; noindex/nofollow |
| `/account`, `/complete-account` | Authentication required, noindex/nofollow |
| `/preview` | Development-only preview; noindex, 404 in production |
| `/subscription-success`, `/subscription-failed` | Noindex/nofollow; visiting these pages does not grant payment access |
| `/api/*` | Existing authentication/authorization retained; X-Robots-Tag noindex/nofollow |

The root layout intentionally retains a private-by-default robots policy. Each public page **replaces** that policy through the shared metadata helper. Production HTML checks confirm this emits index/follow, not competing index and noindex tags. The root layout has metadataBase but does not impose a homepage canonical on private routes.

`/signup`, `/signin`, `/dashboard` and `/admin` are not separate routes in this project; signup uses `/login` and dashboard/admin tools live inside the authenticated terminal. They retain 404/noindex, with private-path response headers also configured for future routes.

`robots.txt` allows public pages and HTML login/private routes to be crawled so Google can see their noindex instructions. It disallows API crawling and declares the sitemap. It is not used as an authentication control. The sitemap contains exactly the ten canonical public URLs, with no invented modification dates and no authentication, payment-status or private URLs.

## Exact files changed for this indexing request

The payment/admin implementation already in the working tree was preserved. This list covers the indexing changes, including files shared with that work.

### Shared indexing configuration and discovery

1. `lib/seo.ts` — canonical origin, public-route allowlist and metadata helpers (new).
2. `app/layout.tsx` — metadataBase, accurate default description and explicit private default.
3. `next.config.ts` — private-route/API X-Robots-Tag headers; existing security headers and local redirects retained.
4. `app/robots.ts` — generated robots.txt (new).
5. `app/sitemap.ts` — generated public-only sitemap.xml (new).

### Public pages

6. `app/page.tsx` — public homepage with indexable metadata.
7. `components/landing-page.tsx` — shared unauthenticated landing renderer and resilient announcement loading (new).
8. `app/about/page.tsx` — canonical, description and public robots.
9. `app/contact/page.tsx` — canonical, description and public robots.
10. `app/pricing/page.tsx` — canonical, description and public robots.
11. `app/privacy-policy/page.tsx` — canonical, description and public robots.
12. `app/terms-and-conditions/page.tsx` — canonical, description and public robots.
13. `app/refund-policy/page.tsx` — canonical, description and public robots.
14. `app/cancellation-policy/page.tsx` — canonical, description and public robots.
15. `app/risk-disclosure/page.tsx` — canonical, description and public robots.
16. `app/grievance/page.tsx` — canonical, description and public robots.

### Private routing and navigation compatibility

17. `app/workspace/page.tsx` — existing terminal and access guards moved here, explicitly noindex (new).
18. `app/login/page.tsx` — shared landing content with explicit private metadata.
19. `app/complete-account/page.tsx` — private metadata and completion redirect to workspace.
20. `app/account/page.tsx` — private metadata and reviewer redirect to workspace.
21. `app/preview/page.tsx` — explicit noindex metadata.
22. `components/email-access.tsx` — successful password login now opens `/workspace`.
23. `components/complete-account.tsx` — completed setup now opens `/workspace`.
24. `components/billing-account.tsx` — Open workspace link updated.
25. `components/login.tsx` — brand/home links point to the new public homepage.
26. `components/public-page.tsx` — brand/home link points to the public homepage.

### Verification and documentation

27. `scripts/check-seo.mjs` — isolated production HTML/header/canonical/sitemap/auth regression checks (new).
28. `scripts/check-reviewer-access.mjs` — reviewer access checks target `/workspace`.
29. `package.json` — adds `pnpm check:seo`.
30. `docs/seo-indexing.md` — this audit and change inventory (new).

`next-env.d.ts` is framework-generated and may change between dev/build runs; it is not an intentional indexing edit. `render.yaml`, `vercel.json` and the two subscription-status page metadata definitions did not need changes.

## Verification performed

- `pnpm build`: passed, 45 generated pages/routes reported by Next.js.
- `pnpm check:seo`: passed against a production-mode local server with isolated credentials and an intentionally unavailable database.
  - All ten public pages requested without cookies using browser and Googlebot user agents.
  - Each returned 200, actual page content, an explicit index directive, exactly one correct canonical, and no noindex/nofollow/none conflict in any robots/googlebot/bingbot meta tag or X-Robots-Tag header.
  - Tracking-query homepage canonical remained the clean homepage URL.
  - Login/payment status pages remained noindex in both HTML and headers.
  - Private pages redirected anonymous requests to login; an isolated authenticated owner fixture rendered `/workspace` with noindex.
  - Preview and nonexistent auth/dashboard aliases remained 404/noindex.
  - Anonymous member API access remained 401.
  - Sitemap parsed as valid XML and matched the ten public URLs exactly.
  - robots.txt returned text/plain, allowed public crawling and referenced the sitemap.
- `node scripts/check-reviewer-access.mjs`: passed reviewer isolation, anonymous/forged-session denial, 18 API read denials, four API write denials and the public-page regression checks.
- Machine-readable rendered-metadata evidence: `output/seo-verification.json` (generated, git-ignored).

## After deployment

1. Re-run `CHECK_ORIGIN=https://www.senganthal.co.in pnpm check:seo` using the environment-variable syntax for your shell. This only reads public endpoints; the authenticated fixture check runs only on the isolated local server.
2. Submit `https://www.senganthal.co.in/sitemap.xml` in Google Search Console.
3. Inspect the homepage and affected public URLs, choose Test live URL and Request indexing. Validate the fixed issue where available.
4. Noindex exclusions for login and private routes are intentional. Do not request indexing for them.

Deployment makes the directives available; Google must recrawl them and decides whether to index. This task does not claim Search Console approval or completed Google indexing.

References: https://developers.google.com/search/docs/crawling-indexing/block-indexing and https://developers.google.com/search/docs/crawling-indexing/robots/intro .
