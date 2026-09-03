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

Every push to `main` runs `.github/workflows/deploy.yml`. The workflow validates and builds the site, uploads an immutable release directory with `rsync`, atomically moves `/srv/poliklot/current`, keeps the five newest releases and verifies the production URL.

Required GitHub Actions secrets:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_SSH_KEY` | Private key for the restricted deployment account |
| `VPS_HOST` | VPS hostname or IP address |
| `VPS_PORT` | SSH port, normally `22` |
| `VPS_USER` | Restricted deployment username |
| `VPS_KNOWN_HOSTS` | Pinned SSH host key from `ssh-keyscan` |

`deploy/Caddyfile.example` contains the production virtual host. It is intentionally not installed automatically by CI; server routing remains an explicit infrastructure change.

## License

The source code is available under the MIT License. Personal copy, project descriptions and the Poliklot identity are © Igor / Poliklot and are not licensed for reuse.
