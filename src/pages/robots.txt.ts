import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
	new Response(`User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: *
Allow: /

Sitemap: https://poliklot.ru/sitemap.xml
`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
