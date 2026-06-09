import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";

// Generate at REQUEST time (not build). Vercel's build-time prerender shipped
// an empty sitemap; render at runtime where Supabase is reachable.
export const dynamic = "force-dynamic";

const PAGE = 1000; // PostgREST caps RPC results at 1000 rows regardless of p_limit
const MAX_PAGES = 60; // safety cap (60k slugs)
const BATCH = 6; // pages fetched concurrently per round (bounds wall-clock + load)
const ATTEMPTS = 3; // per-page retries — a single transient failure must not empty the sitemap

// Fetch one 1000-row page, retrying transient errors. Throws (does NOT return
// []) on persistent failure so the caller can't mistake an error for "the end".
async function fetchPage(offset: number): Promise<{ slug: string }[]> {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { data, error } = await supabase.rpc("sitemap_slugs", { p_limit: PAGE, p_offset: offset });
    if (!error && data) return data as { slug: string }[];
    console.error(
      `[sitemap] offset=${offset} attempt ${attempt}/${ATTEMPTS} failed: ${error?.message ?? "no data returned"}`,
    );
    if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, 200 * attempt));
  }
  throw new Error(`[sitemap] sitemap_slugs failed at offset ${offset} after ${ATTEMPTS} attempts`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/retailers`, changeFrequency: "weekly", priority: 0.6 },
  ];

  let partCount = 0;
  let reachedEnd = false;
  for (let base = 0; !reachedEnd && base < MAX_PAGES * PAGE; base += PAGE * BATCH) {
    const offsets = Array.from({ length: BATCH }, (_, i) => base + i * PAGE);
    const pages = await Promise.all(offsets.map(fetchPage)); // rejects → route 500s (logged), never ships empty
    for (const rows of pages) {
      for (const r of rows) {
        entries.push({ url: `${SITE_URL}/part/${r.slug}`, changeFrequency: "weekly", priority: 0.7 });
        partCount++;
      }
      if (rows.length < PAGE) reachedEnd = true; // a short/empty page is the last one
    }
  }

  console.log(`[sitemap] generated ${partCount} part URLs (${entries.length} total entries)`);
  if (partCount === 0) {
    // Loud failure beats a silently-empty sitemap getting submitted to Google.
    throw new Error("[sitemap] produced 0 part URLs — refusing to serve a static-only sitemap");
  }
  return entries;
}
