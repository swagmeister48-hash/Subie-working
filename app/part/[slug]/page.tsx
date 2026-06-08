import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPartPage, cleanName, type PartPage } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";

// Server-rendered + revalidated hourly (ISR). Full HTML is produced on the
// server so search engines see prices/fitment without running JS.
export const revalidate = 3600;

const fmt = (n: number) =>
  `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function yearLabel(p: PartPage): string {
  if (p.year_min && p.year_max) {
    return p.year_min === p.year_max ? `${p.year_min}` : `${p.year_min}–${p.year_max}`;
  }
  return "";
}

// Per-model fitment, preferring the new `fitment` array; falls back to the
// legacy models + global year span.
function fitmentPairs(p: PartPage): { model: string; years: string }[] {
  if (p.fitment && p.fitment.length) return p.fitment;
  const yrs = yearLabel(p);
  return (p.models ?? []).filter(Boolean).map((m) => ({ model: m, years: yrs }));
}

// "WRX 2015–2021 · STI 2015–2021 · Crosstrek 2013–2017"
function fitmentString(p: PartPage): string {
  return fitmentPairs(p)
    .map((f) => (f.years ? `${f.model} ${f.years}` : f.model))
    .join(" · ");
}

function conditionUrl(c?: string | null): string {
  const v = (c || "New").toLowerCase();
  if (v.includes("new")) return "https://schema.org/NewCondition";
  if (v.includes("refurb")) return "https://schema.org/RefurbishedCondition";
  return "https://schema.org/UsedCondition"; // Used / Open Box
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const part = await getPartPage(slug);
  if (!part) return { title: "Part not found — SubieDeal", robots: { index: false } };

  const name = cleanName(part.name);
  const fit = fitmentString(part);
  const stores = `${part.seller_count} store${part.seller_count === 1 ? "" : "s"}`;
  const title = `${name} — Compare Prices Across 14 Subaru Retailers | SubieDeal`;
  const desc =
    `Compare prices for the ${name} across 14 Subaru parts retailers and find it for sale at ` +
    `the lowest price. In stock from ${stores}, starting at ${fmt(part.best_total)}.` +
    (fit ? ` Fits ${fit}.` : "");
  const canonical = `${SITE_URL}/part/${part.slug}`;

  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: { title, description: desc, url: canonical, type: "website", siteName: "SubieDeal" },
    twitter: { card: "summary", title, description: desc },
  };
}

export default async function PartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const part = await getPartPage(slug);
  if (!part) notFound();

  const name = cleanName(part.name);
  const fit = fitmentString(part);
  const stores = `${part.seller_count} store${part.seller_count === 1 ? "" : "s"}`;
  const canonical = `${SITE_URL}/part/${part.slug}`;
  const listings = part.listings ?? [];
  const highPrice = Math.max(
    part.best_total,
    part.ref_high ?? 0,
    ...listings.map((l) => Number(l.total) || 0),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    ...(part.brand ? { brand: { "@type": "Brand", name: part.brand } } : {}),
    ...(part.category ? { category: part.category } : {}),
    ...(part.part_number ? { sku: part.part_number, mpn: part.part_number } : {}),
    url: canonical,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: part.best_total.toFixed(2),
      highPrice: highPrice.toFixed(2),
      offerCount: listings.length || part.seller_count,
      offers: listings.map((l) => ({
        "@type": "Offer",
        priceCurrency: "USD",
        price: Number(l.total).toFixed(2),
        availability: l.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: conditionUrl(l.condition),
        ...(l.url ? { url: l.url } : {}),
        seller: { "@type": "Organization", name: l.seller },
      })),
    },
  };

  return (
    <main className="wrap">
      <div className="content">
        <header className="masthead">
          <div className="brandbar">
            <Link className="brand" href="/" aria-label="SubieDeal home">
              <span className="brand-mark" aria-hidden>✦</span>
              <span className="brand-name">
                <span style={{ color: "#3f7dec" }}>SUBIE</span>
                <span style={{ color: "#3cbf77" }}>DEAL</span>
              </span>
            </Link>
            <Link className="back-link" href="/">← All parts</Link>
          </div>
        </header>

        <article className="part-page">
          {part.category && <p className="part-eyebrow">{part.category}</p>}
          <h1 className="part-title">{name}</h1>

          <p className="part-intro">
            Compare prices for the {name} across 14 Subaru parts retailers and find it for sale
            at the lowest price. In stock from {stores}, starting at {fmt(part.best_total)}.
          </p>

          <p className="part-meta">
            {[
              part.brand,
              part.part_number ? `#${part.part_number}` : null,
              part.category,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {(fit || part.chassis?.length) && (
            <p className="part-fitment">
              <span className="part-fitment-label">Fits</span> {fit || "Subaru"}
              {part.chassis?.length ? (
                <span className="part-chassis">
                  {part.chassis.map((c) => (
                    <span className="chassis-chip" key={c}>
                      {c}
                    </span>
                  ))}
                </span>
              ) : null}
            </p>
          )}

          <div className="part-pricebar">
            <span className="part-best">{fmt(part.best_total)}</span>
            <span className="part-pricebar-sub">
              best of {part.seller_count} retailer{part.seller_count === 1 ? "" : "s"}
            </span>
            {part.save_pct > 0 && <span className="part-save">save up to {part.save_pct}%</span>}
          </div>

          <h2 className="part-listings-h">All {listings.length} prices</h2>
          <div className="part-listings">
            {listings.map((l, i) => (
              <div className="part-listing" key={`${l.seller}-${l.condition ?? "New"}-${i}`}>
                <div className="part-listing-seller">
                  <span className="seller-name">{l.seller}</span>
                  {i === 0 && listings.length > 1 && <span className="badge best">Best</span>}
                  {l.condition && l.condition !== "New" && (
                    <span className="badge alt">{l.condition}</span>
                  )}
                  {!l.in_stock && <span className="badge oos">Out of stock</span>}
                </div>
                <div className="part-listing-right">
                  <span className="part-listing-price">{fmt(l.total)}</span>
                  {l.url ? (
                    <a
                      className="buy"
                      href={l.url}
                      target="_blank"
                      rel="nofollow sponsored noopener noreferrer"
                    >
                      Buy now
                    </a>
                  ) : (
                    <span className="buy disabled" aria-disabled>
                      Unavailable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="part-disclaimer">
            Prices are pulled from each retailer and refreshed regularly — always confirm the final
            price at the store&rsquo;s checkout.
          </p>
        </article>

        <footer className="site-footer">
          <Link className="footer-link" href="/retailers">
            The retailers we compare →
          </Link>
        </footer>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
