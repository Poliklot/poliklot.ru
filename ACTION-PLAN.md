# SEO + GEO action plan — poliklot.ru

## 1. Immediate: publish the cache-safe social card

**Impact:** high  
**Effort:** low  
**Status:** prepared locally

1. Deploy the current application changes.
2. Confirm `https://poliklot.ru/og-poliklot-2026-09.jpg` returns HTTP 200 and `Content-Type: image/jpeg`.
3. Confirm the root HTML references that exact versioned URL in `og:image`, `og:image:url`, `og:image:secure_url`, and `twitter:image`.
4. In Telegram, open `@WebpageBot`, run `/updatepreview`, and submit **only** `https://poliklot.ru/`.
5. Wait for success, then paste the clean URL into a **new** message. Existing sent previews will not be rewritten.
6. If Telegram shows a small thumbnail, choose the large-media layout in the Telegram compose UI. The site supplies a 1200×630 image, but the final large/small display is controlled by Telegram and the sender.

Do not use `?preview=2` as an SEO or cache-version URL. It correctly canonicalizes to `/`, and Telegram may merge it with the root object.

## 2. Immediate: install the Caddy 404/CSP correction

**Impact:** high  
**Effort:** low  
**Dependency:** VPS configuration access  
**Status:** example prepared; live server change still required

Apply the updated `deploy/Caddyfile.example` logic to the live Caddy configuration, validate, then reload Caddy. Verify:

```bash
curl -I https://poliklot.ru/does-not-exist
```

Expected result: `HTTP/2 404`, with the custom 404 page body.

Also confirm the new `Content-Security-Policy` response header does not break the page.

## 3. Quick win: deploy structured entity data

**Impact:** high  
**Effort:** low  
**Status:** prepared and locally validated

- `WebSite` defines the Poliklot site entity.
- `ProfilePage` defines each language page and points to the same person.
- `Person` defines role, expertise, education, GitHub, résumé, and the canonical website.
- Keep stable `@id` values across future builds.

After deployment, validate the production source and Google's Rich Results Test. ProfilePage and Person schema improve entity understanding even when no special rich result is displayed.

## 4. Quick win: deploy real AI guidance files

**Impact:** medium/high for GEO  
**Effort:** low  
**Status:** prepared locally

Verify after deployment:

```bash
curl -I https://poliklot.ru/llms.txt
curl -I https://poliklot.ru/llms-full.txt
```

Expected: HTTP 200 and a plain-text content type, not HTML. Keep the files synchronized when the public résumé changes.

## 5. Quick win: complete international and social metadata

**Impact:** medium  
**Effort:** low  
**Status:** prepared locally

- self-referencing `ru` and `en` hreflang on both pages;
- `x-default` to the Russian root;
- the same alternates in `sitemap.xml`;
- `og:site_name`, alternate locale, and explicit Twitter title/description/URL;
- English meta description reduced from 182 to 158 characters.

## 6. Quick win: request indexing with first-party evidence

**Impact:** high  
**Effort:** low  
**Status:** requires account access

1. Add/verify the domain property in Google Search Console.
2. Submit `https://poliklot.ru/sitemap.xml`.
3. Inspect and request indexing for `/` and `/en/`.
4. Repeat in Yandex Webmaster.
5. Check Coverage/Pages, canonical selection, discovered URLs, and search queries after indexing.

A public search sample did not surface the new portfolio, but that is not enough to prove an indexing fault without webmaster data.

## 7. Strategic: strengthen the Poliklot entity graph

**Impact:** high for GEO and branded discovery  
**Effort:** medium

Existing corroborating signals include GitHub, npm, Visual Studio Marketplace, and an official Prettier documentation mention. Strengthen the connection:

- use the same display name, avatar, short bio, and canonical website URL across maintained profiles;
- link from GitHub and package metadata back to `https://poliklot.ru/`;
- link from the website only to profiles worth maintaining;
- make package `author`, `homepage`, and repository metadata consistent;
- consider LinkedIn, YouTube, or long-form technical writing only if content will be actively maintained.

Do not manufacture Wikipedia, Reddit, or social mentions. GEO authority should be based on verifiable engineering work.

## 8. Maintenance

- Change the OG filename whenever the card artwork changes; never overwrite a cached social image in place.
- Update `dateModified`, `llms.txt`, `llms-full.txt`, schema expertise, and experience together.
- Keep a CI smoke test for the homepage, social image, and llms file.
- Re-run Lighthouse and the SEO audit after material design or dependency changes.
- Review Telegram preview in a new message after each social-card release.
