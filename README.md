# Poliklot — product landing

Source for [poliklot.ru](https://poliklot.ru): a bilingual personal product landing for Igor / Poliklot.

## Design intent

- product-style storytelling instead of a traditional résumé layout;
- one specialist presented as a complete delivery contour: product, engineering, infrastructure and release;
- AI agents shown as a practical speed multiplier backed by engineering judgement;
- six technology chapters with recognizable product and infrastructure tooling;
- commercial experience, product ownership and technical leadership before public profiles;
- no remote fonts; the homepage stays static, interactive article tools load only where needed;
- Russian homepage with a complete English version under `/en/`.

## Search and link previews

- bilingual canonical and `hreflang` metadata is mirrored in `sitemap.xml`;
- `Person`, `ProfilePage` and `WebSite` JSON-LD describe the Poliklot entity;
- `/llms.txt` and `/llms-full.txt` provide concise and expanded AI-readable context;
- major search and AI crawlers are explicitly allowed in `robots.txt`;
- the Open Graph card uses a versioned filename so Telegram and other messengers do not keep serving an overwritten cached image.
- practical guides use `TechArticle` structured data and their own 1200×630 preview images.

When the social artwork changes, publish it under a new filename and update `ogImage` in `src/layouts/BaseLayout.astro`. After deployment, refresh the clean canonical URL through Telegram's `@WebpageBot`; query parameters are not a reliable substitute because the page correctly canonicalizes to `/`.

## Stack

- Astro 7
- TypeScript
- Gravity UI UIKit 7 and the official Gravity UI icon set
- React 19: static layout components and a visibility-hydrated CI cost calculator
- local variable Onest font
- PhotoSwipe 5: screenshot viewer with lazy-loaded core and original-image fallback links
- Chart.js 4: calculator chart loaded only with the interactive island
- Fuse.js: local article search with an immediately visible native input; no WebAssembly or CSP exceptions
- `@astrojs/rss`: `/rss.xml`, generated from the same published article metadata

## Article tools

- `/articles/#search` filters the existing article cards by title, summary and full text. Search is case-insensitive, treats `ё` as `е`, accepts small spelling variations and requires every query word to match. On the first query it fetches only the published article pages on this site, extracts their marked content, excludes navigation and calculator values, and caches it in memory. Queries never leave the browser. If a page fails to load, title/summary search remains usable. Emptying the input restores all articles. No WebAssembly, external search service or relaxed CSP is required.
- `/rss.xml` contains stable canonical article links, original publication dates and summaries. Feed autodiscovery is in every page's head, with visible subscription links in the footer and articles index.
- The Metrika guide's screenshots open in PhotoSwipe with keyboard navigation, zoom and Russian controls. The original links still work without JavaScript. The core loads on opening a screenshot; animations respect reduced motion.
- `/articles/ephemeral-github-actions/#calculator` compares permanent and per-build machines with editable rates, preparation time and per-launch billing rounding. It is an estimate, not a provider quote; storage, IP, GitHub preparation jobs and maintenance are excluded. No form data leaves the browser.
- Calculator changes animate the existing Chart.js instance and numeric results together over 320 ms. Rapid edits retarget from the current displayed values. Reduced-motion preferences disable animation; screen readers receive final values only. Invalid input removes stale results and cancels animation.
- Technology profiler badges are not acceptance criteria for functional correctness: detection depends on the profiler version, the page and whether a lazy feature has been opened. No unused frameworks, fake globals or third-party CDN scripts are included.

## Local development

```bash
npm ci
npm run dev
```

Validation and production build:

```bash
npm run check
npm test
npm run build
npm run preview
```

Use `npm run dev -- --background` for the background Astro development server. Search works in development and in the built output; use `npm run build` followed by `npm run preview` for production checks.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`. The workflow validates and builds the site, uploads an immutable release directory with `rsync`, atomically moves `/opt/poliklot/current`, keeps the five newest releases and verifies the production URL.

Required GitHub Actions secrets:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_SSH_KEY` | Private key for the restricted deployment account |
| `VPS_HOST` | VPS hostname or IP address |
| `VPS_PORT` | SSH port, normally `22` |
| `VPS_USER` | Restricted deployment username |
| `VPS_KNOWN_HOSTS` | Pinned SSH host key from `ssh-keyscan` |

`deploy/Caddyfile.example` contains the production virtual host. It is intentionally not installed automatically by CI; server routing remains an explicit infrastructure change.

## Analytics

The production site uses a self-hosted [GoatCounter](https://www.goatcounter.com/) instance under `/analytics`. The asynchronous tracker is emitted only in production, uses no cookies and keeps analytics data on the VPS. `deploy/analytics.compose.yml` defines the pinned container and persistent SQLite volume; the Caddy example proxies the private dashboard and adds `X-Robots-Tag: noindex, nofollow`.

## License

The source code is available under the MIT License. Personal copy, project descriptions and the Poliklot identity are © Igor / Poliklot and are not licensed for reuse.
