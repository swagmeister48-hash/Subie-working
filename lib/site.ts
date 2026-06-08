// Canonical production origin — used for canonical URLs, sitemap, robots, JSON-LD.
// MUST match the host the site actually serves on: the apex subiedeal.com
// 301-redirects to www, so www is canonical (split host signals hurt SEO).
// Override per-env with NEXT_PUBLIC_SITE_URL if the canonical host ever changes.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.subiedeal.com").replace(/\/$/, "");
