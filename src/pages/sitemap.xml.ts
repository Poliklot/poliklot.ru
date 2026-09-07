import type { APIRoute } from 'astro';

const pages = [
	{url: 'https://poliklot.ru/', language: 'ru'},
	{url: 'https://poliklot.ru/en/', language: 'en'},
];

const alternates = pages
	.map((page) => `<xhtml:link rel="alternate" hreflang="${page.language}" href="${page.url}" />`)
	.concat('<xhtml:link rel="alternate" hreflang="x-default" href="https://poliklot.ru/" />')
	.join('');

export const GET: APIRoute = () => {
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map((page) => `  <url><loc>${page.url}</loc>${alternates}</url>`).join('\n')}\n</urlset>\n`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
