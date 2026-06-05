"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchParts,
  getFacets,
  track,
  PAGE_SIZE,
  type Part,
  type Facets,
  type SortOption,
} from "@/lib/supabase";

function fmt(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const EMPTY_FACETS: Facets = { models: [], years: [], categories: [], brands: [], colors: [], sellers: [] };

export default function PartsBrowser() {
  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [cat, setCat] = useState("");
  const [year, setYear] = useState(0);
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [seller, setSeller] = useState("");
  const [condition, setCondition] = useState("");
  const [inStock, setInStock] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [multiOnly, setMultiOnly] = useState(true);
  const [page, setPage] = useState(0);

  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);
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
      const res = await searchParts({
        q, model, category: cat, year, multiOnly,
        brand, color, seller, condition, inStock,
        priceMin: Number(priceMin) || 0,
        priceMax: Number(priceMax) || 0,
        sort, offset,
      });
      setRows(res.rows);
      setTotal(res.total);
      setLoading(false);
      if (q || model || cat || year || brand || color || seller || condition || inStock || priceMin || priceMax) {
        track("search", {
          q, model, category: cat, year, multiOnly, brand, color, seller,
          condition, inStock, priceMin, priceMax, sort, offset, results: res.total,
        });
      }
    },
    [q, model, cat, year, multiOnly, brand, color, seller, condition, inStock, priceMin, priceMax, sort]
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
  }, [run]);

  function goTo(newPage: number) {
    setPage(newPage);
    run(newPage * PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setModel(""); setCat(""); setYear(0); setBrand(""); setColor("");
    setSeller(""); setCondition(""); setInStock(false);
    setPriceMin(""); setPriceMax(""); setSort("relevance");
  }

  const hasFilters = !!(model || cat || year || brand || color || seller || condition || inStock || priceMin || priceMax);
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
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} aria-label="Sort results">
          <option value="relevance">Sort: Best match</option>
          <option value="discount">Sort: Biggest discount</option>
          <option value="price_asc">Sort: Price low → high</option>
          <option value="price_desc">Sort: Price high → low</option>
          <option value="name">Sort: Name A–Z</option>
        </select>
      </div>

      <div className="controls">
        <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Filter by model">
          <option value="">All models</option>
          {facets.models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={year || ""} onChange={(e) => setYear(Number(e.target.value) || 0)} aria-label="Filter by year">
          <option value="">All years</option>
          {facets.years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {facets.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Filter by brand">
          <option value="">All brands</option>
          {facets.brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={color} onChange={(e) => setColor(e.target.value)} aria-label="Filter by color">
          <option value="">All colors</option>
          {facets.colors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="controls">
        <select value={seller} onChange={(e) => setSeller(e.target.value)} aria-label="Filter by retailer">
          <option value="">All retailers</option>
          {facets.sellers.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={condition} onChange={(e) => setCondition(e.target.value)} aria-label="Filter by condition">
          <option value="">Any condition</option>
          <option value="New">New</option>
          <option value="Used">Used</option>
        </select>
        <input className="price-input" type="number" min="0" placeholder="Min $"
          value={priceMin} onChange={(e) => setPriceMin(e.target.value)} aria-label="Minimum price" />
        <input className="price-input" type="number" min="0" placeholder="Max $"
          value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label="Maximum price" />
        <label className="toggle">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
          In stock
        </label>
        {hasFilters && (
          <button className="clear-btn" onClick={clearFilters}>Clear filters</button>
        )}
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
                    {[p.brand, p.category, p.color, p.part_number ? `#${p.part_number}` : null, p.models.join(", "), yearLabel]
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
                <div className="row" key={l.seller + (l.condition ?? "") + i}>
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
                          condition: l.condition ?? "New",
                          best_in_list: i === 0,
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
