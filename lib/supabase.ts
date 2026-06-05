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
  condition?: string;
};

export type Part = {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  part_number: string | null;
  color: string | null;
  seller_count: number;
  discount: number;
  models: string[];
  year_min: number | null;
  year_max: number | null;
  listings: Listing[];
};

export type SearchResult = { total: number; rows: Part[] };

export type SortOption = "relevance" | "price_asc" | "price_desc" | "discount" | "name";

export const PAGE_SIZE = 40;

export async function searchParts(opts: {
  q?: string;
  model?: string;
  category?: string;
  year?: number;
  multiOnly?: boolean;
  brand?: string;
  color?: string;
  seller?: string;
  condition?: string;
  inStock?: boolean;
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
  offset?: number;
}): Promise<SearchResult> {
  const { data, error } = await supabase.rpc("search_parts", {
    q: opts.q ?? "",
    p_model: opts.model ?? "",
    p_category: opts.category ?? "",
    p_year: opts.year ?? 0,
    p_multi_only: opts.multiOnly ?? false,
    p_brand: opts.brand ?? "",
    p_color: opts.color ?? "",
    p_seller: opts.seller ?? "",
    p_condition: opts.condition ?? "",
    p_in_stock: opts.inStock ?? false,
    p_price_min: opts.priceMin ?? 0,
    p_price_max: opts.priceMax ?? 0,
    p_sort: opts.sort ?? "relevance",
    p_limit: PAGE_SIZE,
    p_offset: opts.offset ?? 0,
  });
  if (error) {
    console.error("search_parts error:", error.message);
    return { total: 0, rows: [] };
  }
  return (data as SearchResult) ?? { total: 0, rows: [] };
}

// ---- anonymous analytics ----

function sessionId(): string {
  if (typeof window === "undefined") return "server";
  let s = localStorage.getItem("pp_session");
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem("pp_session", s);
  }
  return s;
}

export function track(type: "pageview" | "search" | "click_buy", data: Record<string, unknown>) {
  try {
    void supabase.from("events").insert({ type, session_id: sessionId(), data });
  } catch {
    // analytics must never break the site
  }
}

export type Facets = {
  models: string[];
  years: number[];
  categories: string[];
  brands: string[];
  colors: string[];
  sellers: string[];
};

export async function getFacets(): Promise<Facets> {
  const { data, error } = await supabase.rpc("get_facets");
  if (error) {
    console.error("get_facets error:", error.message);
    return { models: [], years: [], categories: [], brands: [], colors: [], sellers: [] };
  }
  return data as Facets;
}
