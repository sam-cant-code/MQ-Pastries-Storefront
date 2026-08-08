const fs = require('fs');
const path = require('path');

// Extract siteUrl from environment.prod.ts
const envProdPath = path.join(__dirname, 'src', 'environments', 'environment.prod.ts');
const envContent = fs.readFileSync(envProdPath, 'utf8');
const match = envContent.match(/siteUrl:\s*'([^']+)'/);
const siteUrl = match ? match[1] : 'https://example.com';

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <priority>1.0</priority>
    <changefreq>weekly</changefreq>
  </url>
  <url>
    <loc>${siteUrl}/privacy-policy</loc>
    <priority>0.5</priority>
    <changefreq>monthly</changefreq>
  </url>
  <url>
    <loc>${siteUrl}/terms</loc>
    <priority>0.5</priority>
    <changefreq>monthly</changefreq>
  </url>
  <url>
    <loc>${siteUrl}/accessibility</loc>
    <priority>0.5</priority>
    <changefreq>monthly</changefreq>
  </url>
</urlset>`;

fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap);

const robots = `User-agent: *
Allow: /
Disallow: /order-success
Disallow: /track-order/

Sitemap: ${siteUrl}/sitemap.xml`;

fs.writeFileSync(path.join(__dirname, 'public', 'robots.txt'), robots);

console.log('Sitemap and robots.txt generated successfully using siteUrl:', siteUrl);
