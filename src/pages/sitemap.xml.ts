import type { APIRoute } from 'astro';

const pages = ['https://poliklot.ru/', 'https://poliklot.ru/en/'];

export const GET: APIRoute = () => {
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
