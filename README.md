# Poliklot — product landing

Source for [poliklot.ru](https://poliklot.ru): a bilingual personal product landing for Igor / Poliklot.

## Design intent

- product-style storytelling instead of a traditional résumé layout;
- one specialist presented as a complete delivery contour: product, engineering, infrastructure and release;
- AI agents shown as a practical speed multiplier backed by engineering judgement;
- six technology chapters with recognizable product and infrastructure tooling;
- commercial experience, product ownership and technical leadership before public profiles;
- no remote fonts or client-side framework runtime;
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
- React 19 components rendered to static HTML during the Astro build
- local variable Onest font
- static HTML and CSS without client hydration

## Local development

```bash
npm ci
npm run dev
```

Validation and production build:

```bash
npm run check
npm run build
```

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
