"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchParts,
  getFacets,
  PAGE_SIZE,
  type Part,
} from "@/lib/supabase";

function fmt(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PartsBrowser() {
  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(0);

  const [models, setModels] = useState<string[]>([]);
  const [cats, setCats] = useState<string[]>([]);

  const [rows, setRows] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getFacets().then((f) => {
      setModels(f.models || []);
      setCats(f.categories || []);
    });
  }, []);

  const run = useCallback(
    async (offset: number) => {
      setLoading(true);
      const res = await searchParts({ q, model, category: cat, offset });
      setRows(res.rows);
      setTotal(res.total);
      setLoading(false);
    },
    [q, model, cat]
  );

  // Re-search (debounced) whenever filters change; reset to page 0.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setPage(0);
      run(0);
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q, model, cat, run]);

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
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="meta">
        {loading ? "Searching…" : `${total.toLocaleString()} ${total === 1 ? "part" : "parts"} found`}
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
                      onClick={() => l.url && window.open(l.url, "_blank", "noopener")}
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
