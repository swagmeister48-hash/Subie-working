import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public read-only client (safe to use anywhere — RLS limits it to reads).
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
  years: number[];
  listings: Listing[];
};

type Row = {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  part_number: string | null;
  listings: {
    price: number | null;
    shipping: number | null;
    total: number | null;
    url: string | null;
    in_stock: boolean | null;
    sellers: { name: string } | null;
  }[];
  fitments: { model: string | null; year: number | null }[];
};

// Fetch all parts with their listings and fitments, shaped for the UI.
export async function getParts(): Promise<Part[]> {
  const { data, error } = await supabase
    .from("parts")
    .select(
      `id, name, brand, category, part_number,
       listings ( price, shipping, total, url, in_stock, sellers ( name ) ),
       fitments ( model, year )`
    )
    .order("name");

  if (error) {
    console.error("Supabase error:", error.message);
    return [];
  }

  return (data as Row[]).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    part_number: p.part_number,
    models: [...new Set(p.fitments.map((f) => f.model).filter(Boolean) as string[])].sort(),
    years: [...new Set(p.fitments.map((f) => f.year).filter(Boolean) as number[])].sort(),
    listings: p.listings
      .map((l) => ({
        seller: l.sellers?.name ?? "Unknown",
        price: Number(l.price ?? 0),
        shipping: Number(l.shipping ?? 0),
        total: Number(l.total ?? (l.price ?? 0) + (l.shipping ?? 0)),
        url: l.url,
        in_stock: l.in_stock ?? true,
      }))
      .sort((a, b) => a.total - b.total),
  }));
}
