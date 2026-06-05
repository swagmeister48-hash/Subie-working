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

const EMPTY_FACETS: Facets = {
  models: [],
  years: [],
  categories: [],
  brands: [],
  colors: [],
  sellers: [],
  chassis: [],
};

const SAVINGS_OPTIONS = [
  { label: "Any", value: 0 },
  { label: "5%+", value: 5 },
  { label: "10%+", value: 10 },
  { label: "25%+", value: 25 },
  { label: "50%+", value: 50 },
];

export default function PartsBrowser() {
  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [cat, setCat] = useState("");
  const [chassis, setChassis] = useState("");
  const [yearFrom, setYearFrom] = useState(0);
  const [yearTo, setYearTo] = useState(0);
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [seller, setSeller] = useState("");
  const [inStock, setInStock] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [savePct, setSavePct] = useState(0);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [multiOnly, setMultiOnly] = useState(true);
  const [page, setPage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const hasActiveFilters =
    !!(
      q || model || cat || chassis || yearFrom || yearTo || brand || color || seller || inStock || priceMin || priceMax || savePct || !multiOnly
    );

  const run = useCallback(
    async (offset: number) => {
      setLoading(true);
      const res = await searchParts({
        q,
        model,
        category: cat,
        yearFrom,
        yearTo,
        multiOnly,
        brand,
        color,
        seller,
        chassis,
        inStock,
        priceMin: Number(priceMin) || 0,
        priceMax: Number(priceMax) || 0,
        minSavePct: savePct,
        sort,
        offset,
      });

      setRows(res.rows);
      setTotal(res.total);
      setLoading(false);

      if (hasActiveFilters) {
        track("search", {
          q,
          model,
          category: cat,
          chassis,
          year_from: yearFrom,
          year_to: yearTo,
          multiOnly,
          brand,
          color,
          seller,
          inStock,
          priceMin,
          priceMax,
          savePct,
          sort,
          offset,
          results: res.total,
        });
      }
    },
    [q, model, cat, chassis, yearFrom, yearTo, multiOnly, brand, color, seller, inStock, priceMin, priceMax, savePct, sort, hasActiveFilters]
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
    const next = Math.max(0, Math.min(newPage, Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)));
    setPage(next);
    run(next * PAGE_SIZE);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setQ("");
    setModel("");
    setCat("");
    setChassis("");
    setYearFrom(0);
    setYearTo(0);
    setBrand("");
    setColor("");
    setSeller("");
    setInStock(false);
    setPriceMin("");
    setPriceMax("");
    setSavePct(0);
    setSort("relevance");
    setMultiOnly(true);
  }

  function clearFilter(key: string) {
    switch (key) {
      case "q":
        return setQ("");
      case "model":
        return setModel("");
      case "category":
        return setCat("");
      case "chassis":
        return setChassis("");
      case "yearFrom":
        return setYearFrom(0);
      case "yearTo":
        return setYearTo(0);
      case "brand":
        return setBrand("");
      case "color":
        return setColor("");
      case "seller":
        return setSeller("");
      case "inStock":
        return setInStock(false);
      case "priceMin":
        return setPriceMin("");
      case "priceMax":
        return setPriceMax("");
      case "savePct":
        return setSavePct(0);
      case "multiOnly":
        return setMultiOnly(true);
      default:
        return undefined;
    }
  }

  const filterChips = [
    q && { label: `Search: ${q}`, key: "q" },
    model && { label: `Model: ${model}`, key: "model" },
    cat && { label: `Category: ${cat}`, key: "category" },
    chassis && { label: `Chassis: ${chassis}`, key: "chassis" },
    yearFrom && { label: `Year ≥ ${yearFrom}`, key: "yearFrom" },
    yearTo && { label: `Year ≤ ${yearTo}`, key: "yearTo" },
    brand && { label: `Brand: ${brand}`, key: "brand" },
    color && { label: `Color: ${color}`, key: "color" },
    seller && { label: `Retailer: ${seller}`, key: "seller" },
    inStock && { label: "In stock only", key: "inStock" },
    priceMin && { label: `Min $${priceMin}`, key: "priceMin" },
    priceMax && { label: `Max $${priceMax}`, key: "priceMax" },
    savePct > 0 && { label: `Savings ${savePct}%+`, key: "savePct" },
    !multiOnly && { label: "All retailers", key: "multiOnly" },
  ].filter(Boolean) as { label: string; key: string }[];

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <div className="browser-shell">
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-header">
          <div>
            <p className="sidebar-eyebrow">Filter catalog</p>
            <h2>Find the part you need</h2>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close filters">
            ✕
          </button>
        </div>

        <div className="filter-body">
          <div className="filter-group search-group">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              placeholder="Part, brand, number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <details className="filter-group">
            <summary>Model</summary>
            <div className="filter-list">
              {facets.models.map((item) => (
                <button
                  key={item.v}
                  type="button"
                  className={item.v === model ? "pill active" : "pill"}
                  onClick={() => setModel(item.v === model ? "" : item.v)}
                >
                  {item.v}
                  <span>{item.n}</span>
                </button>
              ))}
            </div>
          </details>

          <details className="filter-group">
            <summary>Chassis</summary>
            <div className="filter-list">
              {facets.chassis.filter((item) => item.n >= 10).map((item) => (
                <button
                  key={item.v}
                  type="button"
                  className={item.v === chassis ? "pill active" : "pill"}
                  onClick={() => setChassis(item.v === chassis ? "" : item.v)}
                >
                  {item.v}
                  <span>{item.n}</span>
                </button>
              ))}
            </div>
          </details>

          <details className="filter-group">
            <summary>Year range</summary>
            <div className="range-row">
              <label>
                From
                <select value={yearFrom || ""} onChange={(e) => setYearFrom(Number(e.target.value) || 0)}>
                  <option value="">Any</option>
                  {facets.years.map((year) => (
                    <option key={`from-${year}`} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <label>
                To
                <select value={yearTo || ""} onChange={(e) => setYearTo(Number(e.target.value) || 0)}>
                  <option value="">Any</option>
                  {facets.years.map((year) => (
                    <option key={`to-${year}`} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <details className="filter-group">
            <summary>Category</summary>
            <div className="filter-list">
              {facets.categories.map((item) => (
                <button
                  key={item.v}
                  type="button"
                  className={item.v === cat ? "pill active" : "pill"}
                  onClick={() => setCat(item.v === cat ? "" : item.v)}
                >
                  {item.v}
                  <span>{item.n}</span>
                </button>
              ))}
            </div>
          </details>

          <details className="filter-group">
            <summary>Brand</summary>
            <div className="filter-list">
              {facets.brands.map((item) => (
                <button
                  key={item.v}
                  type="button"
                  className={item.v === brand ? "pill active" : "pill"}
                  onClick={() => setBrand(item.v === brand ? "" : item.v)}
                >
                  {item.v}
                  <span>{item.n}</span>
                </button>
              ))}
            </div>
          </details>

          <details className="filter-group">
            <summary>Color</summary>
            <div className="filter-list">
              {facets.colors.map((item) => (
                <button
                  key={item.v}
                  type="button"
                  className={item.v === color ? "pill active" : "pill"}
                  onClick={() => setColor(item.v === color ? "" : item.v)}
                >
                  {item.v}
                  <span>{item.n}</span>
                </button>
              ))}
            </div>
          </details>

          <details className="filter-group">
            <summary>Retailer</summary>
            <div className="filter-list">
              {facets.sellers.map((item) => (
                <button
                  key={item.v}
                  type="button"
                  className={item.v === seller ? "pill active" : "pill"}
                  onClick={() => setSeller(item.v === seller ? "" : item.v)}
                >
                  {item.v}
                  <span>{item.n}</span>
                </button>
              ))}
            </div>
          </details>

          <details className="filter-group">
            <summary>Price</summary>
            <div className="range-row">
              <label>
                Min
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
              </label>
              <label>
                Max
                <input
                  type="number"
                  min="0"
                  placeholder="Any"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </label>
            </div>
          </details>

          <details className="filter-group">
            <summary>Savings</summary>
            <div className="filter-list savings-list">
              {SAVINGS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={option.value === savePct ? "pill active" : "pill"}
                  onClick={() => setSavePct(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </details>

          <div className="filter-actions">
            <label className="switch">
              <input type="checkbox" checked={multiOnly} onChange={(e) => setMultiOnly(e.target.checked)} />
              Only show parts sold by 2+ retailers
            </label>
            <label className="switch">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              In stock only
            </label>
            <button type="button" className="clear-btn" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        </div>
      </aside>

      <div className="content">
        <div className="hero">
          <div>
            <p className="eyebrow">Performance dark Subaru catalog</p>
            <h1>Compare Subaru part prices across 12 retailers</h1>
            <p className="hero-copy">
              Search hard-to-find Subaru parts, compare prices with transparent listings, and jump to the best deal in one clean view.
            </p>
          </div>

          <div className="hero-stats">
            <div>
              <span>{total ? total.toLocaleString() : "—"}</span>
              <p>parts indexed</p>
            </div>
            <div>
              <span>{facets.sellers.length || "—"}</span>
              <p>retailers</p>
            </div>
            <div>
              <span>{facets.categories.length || "—"}</span>
              <p>categories</p>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <button className="filter-toggle" onClick={() => setSidebarOpen(true)}>
            Filters
          </button>
          <div className="toolbar-right">
            <p className="results-count">
              {loading ? "Searching…" : `${total.toLocaleString()} parts`}
            </p>
            <label className="sort-label">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
                <option value="relevance">Best match</option>
                <option value="save_pct">Best savings</option>
                <option value="discount">Biggest discount</option>
                <option value="price_asc">Price low → high</option>
                <option value="price_desc">Price high → low</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
          </div>
        </div>

        {filterChips.length > 0 && (
          <div className="chips-row">
            {filterChips.map((chip) => (
              <button key={chip.key} type="button" className="chip" onClick={() => clearFilter(chip.key)}>
                {chip.label} <span>×</span>
              </button>
            ))}
            <button type="button" className="chip clear-all" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        <div className="list">
          {rows.map((p) => {
            const best = p.listings[0]?.total ?? 0;
            const save = p.listings.length > 1 ? p.listings[p.listings.length - 1].total - best : 0;
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

                  <div className="card-meta">
                    <p className="best-price">{fmt(best)}</p>
                    {p.save_pct > 0 && <p className="save">{p.save_pct.toFixed(0)}% savings</p>}
                    {save > 0 && <p className="save-amount">{fmt(save)} cheaper vs highest seller</p>}
                  </div>
                </div>

                <div className="listing-grid">
                  {p.listings.map((listing, index) => (
                    <div className="row" key={`${listing.seller}-${listing.condition ?? "New"}-${index}`}>
                      <div className="seller">
                        <span>{listing.seller}</span>
                        {index === 0 && p.listings.length > 1 && <span className="badge best">Best</span>}
                        {listing.condition && listing.condition !== "New" && <span className="badge alt">{listing.condition}</span>}
                        {!listing.in_stock && <span className="badge oos">Out of stock</span>}
                      </div>
                      <div className="price-cell">
                        <div>
                          <p className="price-num">{fmt(listing.total)}</p>
                          <p className="price-ship">
                            {listing.shipping ? `${fmt(listing.price)} + ${fmt(listing.shipping)} ship` : "+ shipping at checkout"}
                          </p>
                        </div>
                        <button
                          className="buy"
                          onClick={() => {
                            if (!listing.url) return;
                            track("click_buy", {
                              part_id: p.id,
                              part_name: p.name,
                              brand: p.brand,
                              part_number: p.part_number,
                              seller: listing.seller,
                              price: listing.price,
                              total: listing.total,
                              condition: listing.condition ?? "New",
                              best_in_list: index === 0,
                              seller_count: p.listings.length,
                              url: listing.url,
                            });
                            window.open(listing.url, "_blank", "noopener");
                          }}
                          disabled={!listing.url}
                        >
                          Buy now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
      </div>

      <div className={sidebarOpen ? "backdrop open" : "backdrop"} onClick={() => setSidebarOpen(false)} />
    </div>
  );
}
