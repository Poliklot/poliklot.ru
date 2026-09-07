# GEO analysis — poliklot.ru

**Audit date:** 2026-09-07
**Pre-remediation GEO readiness:** **40/100**
**Current live estimate:** **80–85/100** after application deployment and production verification; the remaining gap is external entity authority and webmaster indexing data.

## Platform breakdown

| Platform | Current readiness | Main signal |
|---|---:|---|
| Google AI Overviews | 82/100 | Static indexable content, complete hreflang, entity schema, and strong performance; actual index status still needs Search Console. |
| ChatGPT search | 85/100 | Search crawlers are explicitly allowed, the person graph is live, and both llms files are valid. |
| Perplexity | 75/100 | The source is crawlable and citation-ready context is available, but cross-platform person mentions remain limited. |

These are readiness estimates, not visibility or ranking measurements.

## AI crawler access

**Current status: allowed.** The live wildcard `Allow: /` applies to the major search and AI crawlers. The prepared robots file makes access explicit for:

- GPTBot;
- OAI-SearchBot;
- ChatGPT-User;
- ClaudeBot;
- PerplexityBot;
- Google-Extended;
- Applebot-Extended.

No critical content depends on client-side JavaScript. The full portfolio is present in the initial static HTML.

## llms.txt status

**Before remediation:** `/llms.txt` and `/llms-full.txt` returned the HTML 404 fallback with HTTP 200.
**Current production:** real Markdown files with canonical pages, key facts, experience, technology range, authoritative links, and usage terms; both return HTTP 200 as `text/plain; charset=utf-8`.

The concise file is designed for discovery. The full file supplies self-contained sections that can be quoted without scraping the visual landing into fragments.

## Brand and authority signals

Confirmed search-visible engineering signals:

- GitHub profile and gists under `Poliklot`;
- published npm packages including `form-father` and `2mqjs`;
- Visual Studio Marketplace extensions;
- an official Prettier documentation mention for `@poliklot/prettier-plugin-handlebars`;
- open-source contribution history.

No clear developer entity surfaced in the sample search across LinkedIn, YouTube, Reddit, Wikipedia, or Wikidata. This does not mean profiles do not exist; it means they were not discoverable under the same entity name in this audit.

## Passage-level citability

### Current landing

The landing has strong concise claims and concrete figures, but most sections are designed as presentation copy rather than 100–200 word standalone answers. The strongest citation candidates are:

- the explanation of how AI agents accelerate research, changes, tests, and documentation while Igor retains architectural and release responsibility;
- the four “when useful” scenarios;
- the grouped technology range;
- the experience timeline and education facts.

### Prepared improvement

`llms-full.txt` reformats these areas into direct, self-contained passages:

- who Igor / Poliklot is;
- how AI agents are used;
- when he is useful;
- how product launch, broken hand-offs, safe acceleration, and system stabilization are handled;
- technology coverage;
- experience and education.

This improves machine extraction without adding an SEO-text wall to the visual landing.

## Structured data

The prepared JSON-LD contains:

1. `WebSite` — canonical Poliklot entity and supported languages;
2. `ProfilePage` — one node per language page with a shared person entity;
3. `Person` — name, alternate name, role, description, expertise, education, image, website, GitHub, and résumé.

The output passes the bundled JSON-LD validator. No restricted FAQ schema or deprecated HowTo schema is used.

## Top five changes

1. Deploy the versioned social card and refresh the canonical root in Telegram.
2. Deploy the `Person` / `ProfilePage` / `WebSite` JSON-LD graph.
3. Publish real `llms.txt` and `llms-full.txt` files.
4. Submit the sitemap and request indexing in Google Search Console and Yandex Webmaster.
5. Align Poliklot naming and backlinks across GitHub, npm, Marketplace, and other maintained profiles.

## Content recommendations

- Keep the Apple-like landing concise; do not add artificial article-length text to every section.
- Add new long-form pages only around real expertise with proof: AI-agent delivery workflow, DevSecOps ownership, frontend architecture, and end-to-end product launches.
- Each future expertise page should answer one concrete query in its first paragraph, contain firsthand examples, and link to verifiable artifacts where appropriate.
- Use claims that can be corroborated. Avoid generic “AI expert” positioning without methods, constraints, and engineering ownership.
