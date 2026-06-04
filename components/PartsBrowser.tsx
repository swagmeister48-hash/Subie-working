"use client";

import { useMemo, useState } from "react";
import type { Part } from "@/lib/supabase";

function fmt(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PartsBrowser({ parts }: { parts: Part[] }) {
  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [cat, setCat] = useState("");

  const models = useMemo(
    () => [...new Set(parts.flatMap((p) => p.models))].sort(),
    [parts]
  );
  const cats = useMemo(
    () => [...new Set(parts.map((p) => p.category).filter(Boolean) as string[])].sort(),
    [parts]
  );

  const rows = useMemo(() => {
    const text = q.toLowerCase().trim();
    return parts.filter((p) => {
      if (model && !p.models.includes(model)) return false;
      if (cat && p.category !== cat) return false;
      if (text) {
        const hay = [
          p.name,
          p.brand,
          p.category,
          p.part_number,
          p.models.join(" "),
          p.listings.map((l) => l.seller).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!text.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [parts, q, model, cat]);

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
        {rows.length} {rows.length === 1 ? "part" : "parts"} found
      </div>

      <div className="list">
        {rows.map((p) => {
          const sorted = p.listings;
          const best = sorted[0]?.total ?? 0;
          const save = sorted.length > 1 ? sorted[sorted.length - 1].total - best : 0;
          const yearLabel =
            p.years.length > 0 ? `${p.years[0]}–${p.years[p.years.length - 1]}` : "";
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
                    {i === 0 && <span className="badge">Best</span>}
                  </div>
                  <div className="price-cell">
                    <div>
                      <div className="price-num">{fmt(l.total)}</div>
                      <div className="price-ship">
                        {l.shipping ? `${fmt(l.price)} + ${fmt(l.shipping)} ship` : "free ship"}
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
        {rows.length === 0 && <div className="empty">No parts match those filters.</div>}
      </div>
    </>
  );
}
