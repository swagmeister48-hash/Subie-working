// Canonical production origin — used for canonical URLs, sitemap, robots, JSON-LD.
// Override per-env with NEXT_PUBLIC_SITE_URL if the domain ever changes.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://subiedeal.com").replace(/\/$/, "");
