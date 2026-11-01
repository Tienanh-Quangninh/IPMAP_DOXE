import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const site = new URL(env.VITE_SITE_URL || 'https://ipmap-doxe.pages.dev');
  if (
    site.protocol !== 'https:' ||
    site.username ||
    site.password ||
    site.pathname !== '/' ||
    site.search ||
    site.hash
  ) {
    throw new Error('VITE_SITE_URL phải là origin HTTPS, ví dụ https://ipmap-doxe.pages.dev');
  }
  const origin = site.origin;
  return {
    plugins: [
      react(),
      {
        name: 'site-metadata',
        transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', origin),
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,
          });
          this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>\n`,
          });
        },
      },
    ],
  };
});
