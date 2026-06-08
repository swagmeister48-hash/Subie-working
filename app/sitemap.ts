import type { MetadataRoute } from "next";
import { sitemapSlugs } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";

// Rebuild the sitemap daily.
export const revalidate = 86400;

// ~20,900 deduped cross-shoppable slugs — comfortably under the 50k-per-file
// sitemap limit, so a single sitemap is enough. If the count ever approaches
// ~45k, switch to Next's generateSitemaps() to split into a sitemap index.
//
// NOTE: PostgREST caps any RPC result at 1000 rows regardless of p_limit, so we
// page in 1000s and stop on the first short/empty page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/retailers`, changeFrequency: "weekly", priority: 0.6 },
  ];

  const PAGE = 1000; // == PostgREST max-rows; a full page means "there may be more"
  const MAX = 50000; // hard safety cap (sitemaps.org limit per file)
  for (let offset = 0; entries.length < MAX; offset += PAGE) {
    const rows = await sitemapSlugs(PAGE, offset);
    if (!rows.length) break;
    for (const r of rows) {
      entries.push({ url: `${SITE_URL}/part/${r.slug}`, changeFrequency: "weekly", priority: 0.7 });
    }
    if (rows.length < PAGE) break; // last page
  }

  return entries;
}
