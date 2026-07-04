"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, cleanName } from "@/lib/supabase";

// Shape returned by the get_weekly_deals() RPC (see migration weekly_deals_filters_and_pct_order).
type Deal = {
  name: string;
  brand: string | null;
  slug: string | null;
  category: string | null;
  best_price: number;
  typical_price: number;
  save_pct: number;
  sellers: number;
  best_at: string | null;
  buy_url: string | null;
  dropped_this_week: number | null;
};

export type DealFilters = {
  model?: string;
  chassis?: string;
  category?: string;
  brand?: string;
  yearFrom?: string | number;
  yearTo?: string | number;
};

function money(n: number) {
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function filterLabel(f: DealFilters): string {
  const yr =
    f.yearFrom && f.yearTo
      ? `${f.yearFrom}–${f.yearTo}`
      : f.yearFrom
        ? `${f.yearFrom}+`
        : f.yearTo
          ? `up to ${f.yearTo}`
          : "";
  return [f.brand, f.yearFrom || f.yearTo ? yr : "", f.model, f.chassis, f.category]
    .filter(Boolean)
    .join(" ");
}

// "Top deals this week" strip for the homepage. When catalog filters are active
// (model / chassis / year / category / brand) it scopes the deals to match and
// adapts its title. Renders nothing while loading, on error, or when no deals
// qualify, so it can never break or blank the page around it.
export default function WeeklyDeals({ filters = {} }: { filters?: DealFilters }) {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const { model, chassis, category, brand, yearFrom, yearTo } = filters;

  useEffect(() => {
    let cancelled = false;
    setDeals(null);
    (async () => {
      const { data, error } = await supabase.rpc("get_weekly_deals", {
        n: 8,
        p_model: model || null,
        p_chassis: chassis || null,
        p_year_from: Number(yearFrom) || null,
        p_year_to: Number(yearTo) || null,
        p_category: category || null,
        p_brand: brand || null,
      });
      if (cancelled || error || !Array.isArray(data)) return;
      setDeals(data as Deal[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [model, chassis, category, brand, yearFrom, yearTo]);

  if (!deals || deals.length === 0) return null;

  const scope = filterLabel(filters);

  return (
    <section className="deals-strip" aria-label="Top deals this week">
      <div className="deals-head">
        <p className="deals-eyebrow">Price drops</p>
        <h2 className="deals-title">{scope ? `Top ${scope} deals this week` : "Top deals this week"}</h2>
      </div>
      <div className="deals-row">
        {deals.map((d, i) => {
          const inner = (
            <>
              <p className="deal-save">{d.save_pct}% below typical</p>
              <p className="deal-name">{cleanName(d.name)}</p>
              <p className="deal-prices">
                <span className="deal-best">{money(d.best_price)}</span>
                <span className="deal-typical">{money(d.typical_price)}</span>
              </p>
              <p className="deal-meta">
                {[d.best_at ? `at ${d.best_at}` : null, `${d.sellers} retailers`].filter(Boolean).join(" · ")}
              </p>
            </>
          );
          return d.slug ? (
            <Link className="deal-card" href={`/part/${d.slug}`} key={`${d.slug}-${i}`}>
              {inner}
            </Link>
          ) : (
            <div className="deal-card" key={`${d.name}-${i}`}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
