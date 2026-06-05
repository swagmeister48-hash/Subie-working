"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchParts,
  getFacets,
  track,
  PAGE_SIZE,
  type Part,
  type Facets,
} from "@/lib/supabase";

function fmt(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PartsBrowser() {
  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [cat, setCat] = useState("");
  const [year, setYear] = useState(0);
  const [multiOnly, setMultiOnly] = useState(true);
  const [page, setPage] = useState(0);

  const [facets, setFacets] = useState<Facets>({ models: [], years: [], categories: [] });

  const [rows, setRows] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getFacets().then(setFacets);
    track("pageview", {
      path: window.location.pathname,
      referrer: document.referrer || null,
      ua: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
    });
  }, []);

  const run = useCallback(
    async (offset: number) => {
      setLoading(true);
      const res = await searchParts({ q, model, category: cat, year, multiOnly, offset });
      setRows(res.rows);
      setTotal(res.total);
      setLoading(false);
      if (q || model || cat || year) {
        track("search", { q, model, category: cat, year, multiOnly, offset, results: res.total });
      }
    },
    [q, model, cat, year, multiOnly]
  );

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(0);
      run(0);
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, model, cat, year, multiOnly, run]);

  function goTo(newPage: number) {
    setPage(newPage);
    run(newPage * PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <>
      <div className="controls">
        <div className="search">
          <input
            placeholder="Search parts, brands, part numbers…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search parts"
          />
        </div>
        <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Filter by model">
          <option value="">All models</option>
          {facets.models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={year || ""} onChange={(e) => setYear(Number(e.target.value) || 0)} aria-label="Filter by year">
          <option value="">All years</option>
          {facets.years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {facets.categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="toggle-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={multiOnly}
            onChange={(e) => setMultiOnly(e.target.checked)}
          />
          Only show parts sold by 2+ retailers
        </label>
        <span className="meta">
          {loading ? "Searching…" : `${total.toLocaleString()} ${total === 1 ? "part" : "parts"} found`}
        </span>
      </div>

      <div className="list">
        {rows.map((p) => {
          const sorted = p.listings;
          const best = sorted[0]?.total ?? 0;
          const save = sorted.length > 1 ? sorted[sorted.length - 1].total - best : 0;
          const yearLabel =
            p.year_min && p.year_max
              ? p.year_min === p.year_max
                ? `${p.year_min}`
                : `${p.year_min}–${p.year_max}`
              : "";
          return (
            <div className="card" key={p.id}>
              <div className="card-top">
                <div>
                  <p className="card-name">{p.name}</p>
                  <p className="card-sub">
                    {[p.brand, p.category, p.part_number ? `#${p.part_number}` : null, p.models.join(", "), yearLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="best-price">{fmt(best)}</p>
                  {save > 0 && <p className="save">save {fmt(save)}</p>}
                </div>
              </div>

              {sorted.map((l, i) => (
                <div className="row" key={l.seller + i}>
                  <div className="seller">
                    {l.seller}
                    {sorted.length > 1 && i === 0 && <span className="badge">Best</span>}
                    {l.condition && l.condition !== "New" && (
                      <span className="badge used">{l.condition}</span>
                    )}
                    {!l.in_stock && <span className="badge oos">Out of stock</span>}
                  </div>
                  <div className="price-cell">
                    <div>
                      <div className="price-num">{fmt(l.total)}</div>
                      <div className="price-ship">
                        {l.shipping ? `${fmt(l.price)} + ${fmt(l.shipping)} ship` : "+ shipping at checkout"}
                      </div>
                    </div>
                    <button
                      className="buy"
                      onClick={() => {
                        if (!l.url) return;
                        track("click_buy", {
                          part_id: p.id,
                          part_name: p.name,
                          brand: p.brand,
                          part_number: p.part_number,
                          seller: l.seller,
                          price: l.price,
                          total: l.total,
                          best_in_list: sorted[0]?.seller === l.seller,
                          seller_count: sorted.length,
                          url: l.url,
                        });
                        window.open(l.url, "_blank", "noopener");
                      }}
                      disabled={!l.url}
                    >
                      Buy now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {!loading && rows.length === 0 && <div className="empty">No parts match those filters.</div>}
      </div>

      {total > PAGE_SIZE && (
        <div className="pager">
          <button onClick={() => goTo(page - 1)} disabled={page === 0}>← Prev</button>
          <span className="pager-info">Page {page + 1} of {lastPage + 1}</span>
          <button onClick={() => goTo(page + 1)} disabled={page >= lastPage}>Next →</button>
        </div>
      )}
    </>
  );
}
