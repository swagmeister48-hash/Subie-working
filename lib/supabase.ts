import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public read-only client (RLS limits it to reads).
export const supabase = createClient(url, anonKey);

export type Listing = {
  seller: string;
  price: number;
  shipping: number;
  total: number;
  url: string | null;
  in_stock: boolean;
};

export type Part = {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  part_number: string | null;
  models: string[];
  year_min: number | null;
  year_max: number | null;
  listings: Listing[];
};

export type SearchResult = { total: number; rows: Part[] };

export const PAGE_SIZE = 40;

export async function searchParts(opts: {
  q?: string;
  model?: string;
  category?: string;
  offset?: number;
}): Promise<SearchResult> {
  const { data, error } = await supabase.rpc("search_parts", {
    q: opts.q ?? "",
    p_model: opts.model ?? "",
    p_category: opts.category ?? "",
    p_limit: PAGE_SIZE,
    p_offset: opts.offset ?? 0,
  });
  if (error) {
    console.error("search_parts error:", error.message);
    return { total: 0, rows: [] };
  }
  return (data as SearchResult) ?? { total: 0, rows: [] };
}

export async function getFacets(): Promise<{ models: string[]; categories: string[] }> {
  const { data, error } = await supabase.rpc("get_facets");
  if (error) {
    console.error("get_facets error:", error.message);
    return { models: [], categories: [] };
  }
  return data as { models: string[]; categories: string[] };
}
