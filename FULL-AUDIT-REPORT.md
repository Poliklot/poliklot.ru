# SEO + GEO audit — poliklot.ru

**Audit date:** 2026-09-07
**Scope:** public Russian homepage, English alternate, `?preview=2`, crawl controls, social metadata, structured data, performance, and AI-search readiness.
**Live baseline:** **61/100 — Needs improvement**
**Post-remediation estimate:** **90–94/100** after the 2026-09-07 application deploy and verified Caddy correction.
**Score confidence:** medium. Core Web Vitals were measured with Lighthouse, but Search Console, Yandex Webmaster, and real Telegram cache state were not available.

## Audit summary

The site already has an excellent technical delivery baseline: static server-rendered HTML, HTTPS, a valid canonical URL, one H1, complete core Open Graph metadata, a sitemap, crawlable links, and a Lighthouse mobile run of **100 Performance / 100 SEO**. The main gap is not visual quality or runtime performance. It is machine-readable entity definition and cache-safe distribution.

### Top issues

1. **Telegram treats `/` and `/?preview=2` as the same social object.** Both responses declare `og:url=https://poliklot.ru/` and the same unversioned image URL. The query parameter therefore does not reliably invalidate Telegram's cache.
2. **No production JSON-LD.** `Person`, `ProfilePage`, and `WebSite` entities are absent.
3. **Soft 404s.** Unknown paths return the custom error page with HTTP 200.

### Top opportunities

1. Publish a new versioned 1200×630 social image URL and refresh only the canonical root URL through `@WebpageBot`.
2. Publish real `/llms.txt` and `/llms-full.txt` documents instead of the current HTML fallback.
3. Connect the Poliklot entity to its existing GitHub, npm, Visual Studio Marketplace, and Prettier ecosystem signals.

## Findings

| Area | Severity | Confidence | Finding | Evidence | Fix |
|---|---|---|---|---|---|
| Social preview | Warning | Confirmed | Telegram receives the same canonical object for `/` and `/?preview=2`. | Both return `og:url=https://poliklot.ru/` and `og:image=https://poliklot.ru/og-poliklot.png`. A TelegramBot user-agent receives HTTP 200 for both the HTML and the 1200×630 image. | Use a new versioned image URL, keep the clean canonical URL, refresh the root URL through `@WebpageBot`, and create a new Telegram message. |
| Indexability | Warning | Confirmed | Unknown paths are soft 404s. | `/nonexistent-seo-check-97412` returned HTTP 200 with the 404 page body. | Remove `/404.html` from `try_files`; serve it through Caddy `handle_errors` so the status remains 404. |
| Structured data | Warning | Confirmed | Production has no JSON-LD. | `parse_html.py` returned `schema: []` for both languages. | Add `Person`, `ProfilePage`, and `WebSite` JSON-LD with stable `@id` values. |
| GEO | Warning | Confirmed | `/llms.txt` and `/llms-full.txt` are not real text files. | Both return `text/html`, the same 3,241-byte fallback page, and no llms sections or links. | Publish concise and full Markdown guidance files. |
| International SEO | Warning | Confirmed | Pages omit their self-referencing hreflang entry. | Russian has `en` + `x-default`; English has `ru` + `x-default`. | Put `ru`, `en`, and `x-default` on both pages and in the sitemap. |
| English on-page SEO | Warning | Confirmed | English description is too long. | 182 characters; Russian description is 155. | Reduce English description to roughly 150–160 characters. |
| Social metadata | Info | Confirmed | Core OG is complete, but `og:site_name` and explicit Twitter title/description are missing. | `social_meta.py`: OG 6/7, Twitter 2/6. | Add explicit fallback fields and alternate locale. |
| Authority | Info | Confirmed | Real engineering signals exist, but the person entity is weak across broader knowledge platforms. | Search surfaced GitHub gists, npm packages, a VS Marketplace extension, and an official Prettier documentation mention; no clear LinkedIn, YouTube, Reddit, Wikipedia, or Wikidata person profile surfaced. | Use consistent naming and reciprocal links across maintained profiles. |
| External résumé | Info | Likely | hh.ru rejects automated checks but is not confirmed broken for users. | The checker received 403 from hh.ru; six other links were healthy. | Keep the human link if it works; do not rely on hh.ru as the only crawler-readable identity source. |
| Crawl access | Pass | Confirmed | Search and AI crawlers are allowed. | `User-agent: *` + `Allow: /` applies to GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, and others. | Explicit agent rules are optional but useful for audit clarity. |
| Russian metadata | Pass | Confirmed | Primary title, description, and H1 meet the baseline. | Title 56 characters, description 155 characters, exactly one H1. | Preserve the pattern. |
| Rendering | Pass | Confirmed | Critical content is available without JavaScript. | Raw HTML contains the stack, experience, service cases, headings, and links. | Keep the static/server-rendered architecture. |
| Performance | Pass | Confirmed | Runtime performance is excellent. | Lighthouse mobile: Performance 100, SEO 100, FCP 1.1 s, LCP 1.1 s, TBT 0 ms, CLS 0.021, TTI 1.1 s, response 110 ms. | Preserve the architecture and keep assets right-sized. |

## Telegram preview diagnosis

The server is **not blocking Telegram**. A request with a TelegramBot user-agent successfully receives:

- the homepage: HTTP 200, `text/html`;
- the OG image: HTTP 200, `image/png`;
- correct dimensions: 1200×630;
- correct `og:title`, `og:description`, `og:image`, and `og:url`.

The problem is cache identity. `/?preview=2` still declares the root page as `og:url`, which is SEO-correct but means the query parameter is not a reliable preview version. Telegram also keeps previously sent message previews; refreshing affects subsequent shares, not already delivered cards.

The prepared fix changes the image to a new immutable path, `https://poliklot.ru/og-poliklot-2026-09.jpg`, reduces it from 396 KB to 97 KB, adds the OG namespace and complete social metadata, and keeps `https://poliklot.ru/` as the only canonical share URL.

## Performance evidence

| Metric | Live result | Assessment |
|---|---:|---|
| Lighthouse Performance | 100/100 | Excellent |
| Lighthouse SEO | 100/100 | Excellent within Lighthouse's technical checklist |
| FCP | 1.1 s | Good |
| LCP | 1.1 s | Good |
| TBT | 0 ms | Excellent |
| CLS | 0.021 | Good |
| TTI | 1.1 s | Excellent |
| Origin response | 110 ms | Excellent |

Lighthouse flagged roughly 84 KiB of responsive-image savings on the current live logo. The prepared build reduces the header logo from 92 KB to 28 KB.

## Score derivation

Scores are directional and use the audit rubric rather than equating Lighthouse SEO with the full audit.

| Category | Positive signals | Deficit signals | Derived score |
|---|---:|---:|---:|
| Technical SEO | HTTPS, canonical, robots, sitemap, static HTML | soft 404, incomplete hreflang | 61 |
| Content quality | experience, concrete facts, use cases, technology range, bilingual copy | limited first-party identity/contact evidence, few corroborating profile links | 71 |
| On-page SEO | RU title/description, EN title, one H1, clear hierarchy, crawlable text | long EN description | 78 |
| Schema | none in production | missing entity graph | 0 |
| Performance | Lighthouse 100 and strong lab metrics | no material runtime deficit | 100 |
| Images | dimensions and OG alt present, valid 1200×630 card | oversized live header logo | 80 |
| GEO | static HTML, crawl access, headings, concrete facts | invalid llms endpoints, no schema, limited passage citability, fragmented brand entity | 40 |

Weighted result: approximately **61/100**. After the prepared application changes and the live Caddy correction, the same checklist is expected to move into the **90–94** band; this is an implementation estimate, not a ranking guarantee.

## Implemented remediation

- versioned JPEG social card at 1200×630 and 97 KB;
- full Open Graph and Twitter metadata;
- `Person` + `ProfilePage` + `WebSite` JSON-LD;
- real `/llms.txt` and `/llms-full.txt`;
- explicit AI crawler access rules;
- complete bilingual hreflang in HTML and sitemap;
- English description reduced to 158 characters;
- header logo reduced from 92 KB to 28 KB;
- corrected live Caddy soft-404 handling and CSP, with the repository example synchronized;
- stronger deployment verification for the social card and llms file.

## Unknowns and follow-ups

- PageSpeed Insights API was rate-limited; Lighthouse supplied lab data, but no CrUX field data was available.
- Google Search Console and Yandex Webmaster were not available, so indexing status and actual search queries remain unknown.
- The sample `site:poliklot.ru` search did not surface the portfolio; this must be confirmed in webmaster tools before calling it an indexing problem.
- Telegram's internal cached object cannot be inspected without the user's Telegram account. Production headers and crawler accessibility were verified directly.
- Live Caddy was validated before reload; unknown URLs now return HTTP 404 with the custom page and the expected security headers.
