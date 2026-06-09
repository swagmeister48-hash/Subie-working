import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";

// Generate at REQUEST time (not build). Vercel's build-time prerender shipped
// an empty sitemap; render at runtime where Supabase is reachable.
export const dynamic = "force-dynamic";

const PAGE = 1000; // PostgREST caps RPC results at 1000 rows regardless of p_limit
const MAX_PAGES = 60; // safety cap (60k slugs)
const ATTEMPTS = 4; // per-page retries — a single transient failure must not empty the sitemap

// Fetch one 1000-row page, retrying transient errors with backoff. Throws on
// persistent failure so the caller can't mistake an error for "the end".
async function fetchPage(offset: number): Promise<string[]> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc("sitemap_slugs", { p_limit: PAGE, p_offset: offset });
    if (!error && data) return (data as { slug: string }[]).map((r) => r.slug);
    console.error(
      `[sitemap] offset=${offset} attempt ${attempt}/${ATTEMPTS} failed: ${error?.message ?? "no data returned"}`,
    );
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 300 * attempt));
  }
  throw new Error(`[sitemap] sitemap_slugs failed at offset ${offset} after ${ATTEMPTS} attempts`);
}

// Load all slugs SEQUENTIALLY (concurrent bursts were the source of transient
// failures — single calls, like the part pages make, are reliable). Wrapped in
// the data cache so this 21-page walk runs ~once/hour and is then served from
// cache (stale-while-revalidate), instead of re-fetching on every crawler hit.
const loadSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const slugs: string[] = [];
    for (let offset = 0; offset < MAX_PAGES * PAGE; offset += PAGE) {
      const page = await fetchPage(offset);
      slugs.push(...page);
      if (page.length < PAGE) break; // short/empty page = last one
    }
    console.log(`[sitemap] loaded ${slugs.length} part slugs`);
    if (slugs.length === 0) {
      // Loud failure beats a silently-empty sitemap getting submitted to Google.
      throw new Error("[sitemap] sitemap_slugs returned 0 rows — refusing to cache/serve an empty sitemap");
    }
    return slugs;
  },
  ["sitemap-part-slugs-v1"],
  { revalidate: 3600 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await loadSlugs();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/retailers`, changeFrequency: "weekly", priority: 0.6 },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/part/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
