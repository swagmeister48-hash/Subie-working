"use client";

import { useEffect } from "react";
import Link from "next/link";
import { track } from "@/lib/supabase";

// tone drives the small coloured indicator: home = Canadian store,
// yes = ships to Canada, quote = ships by quote, no = US only.
type ShipTone = "home" | "yes" | "quote" | "check" | "no";
type Retailer = { name: string; url: string; count: string; ship: { text: string; tone: ShipTone } };

const SHIPS = { text: "Ships to Canada (duties/brokerage on delivery)", tone: "yes" } as const;
const QUOTE = { text: "Ships to Canada by emailed quote", tone: "quote" } as const;
const CHECK = { text: "Ships to Canada (check at checkout)", tone: "check" } as const;

// Hardcoded (rounded live-DB total listing counts as of 2026-07, biggest catalog
// first). Refresh when the catalog/roster changes.
const RETAILERS: Retailer[] = [
  { name: "Subimods", url: "https://subimods.com", count: "31,700+", ship: SHIPS },
  { name: "JD Muscle", url: "https://jdmuscleusa.com", count: "26,300+", ship: QUOTE },
  { name: "Import Image Racing", url: "https://www.importimageracing.com", count: "25,300+", ship: SHIPS },
  { name: "MAPerformance", url: "https://www.maperformance.com", count: "20,600+", ship: QUOTE },
  { name: "TurnIn Concepts", url: "https://www.turninconcepts.com", count: "16,500+", ship: CHECK },
  { name: "RallySport Direct", url: "https://www.rallysportdirect.com", count: "16,200+", ship: { text: "US only (check at checkout)", tone: "no" } },
  { name: "Subie Supply Co", url: "https://subiesupplyco.ca", count: "14,100+", ship: { text: "🇨🇦 Canadian store (prices shown on SubieDeal are their USD prices)", tone: "home" } },
  { name: "SubiSpeed", url: "https://www.subispeed.com", count: "11,300+", ship: SHIPS },
  { name: "Flatirons Tuning", url: "https://www.flatironstuning.com", count: "9,600+", ship: CHECK },
  { name: "FastWRX", url: "https://www.fastwrx.com", count: "6,300+", ship: SHIPS },
  { name: "New Provisions Racing", url: "https://www.newprovisionsracing.com", count: "6,200+", ship: SHIPS },
  { name: "SMY Performance", url: "https://smyperformance.com", count: "3,900+", ship: CHECK },
  { name: "FT86 Speed Factory", url: "https://www.ft86speedfactory.com", count: "3,700+", ship: SHIPS },
  { name: "FTSpeed", url: "https://www.ftspeed.com", count: "3,300+", ship: SHIPS },
  { name: "PERRIN", url: "https://www.perrin.com", count: "720+", ship: CHECK },
  { name: "GrimmSpeed", url: "https://www.grimmspeed.com", count: "690+", ship: SHIPS },
  { name: "LP Aventure", url: "https://lachuteperformance.com", count: "420+", ship: { text: "🇨🇦 Canadian store (Lachute, QC)", tone: "home" } },
  { name: "RaceComp Engineering", url: "https://www.racecompengineering.com", count: "85+", ship: QUOTE },
];

export default function RetailersPage() {
  // Track this pageview the same way the rest of the site does.
  useEffect(() => {
    track("pageview", {
      path: window.location.pathname,
      referrer: document.referrer || null,
      ua: navigator.userAgent,
      screen: `${window.screen.width}x${window.screen.height}`,
    });
  }, []);

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
            <Link className="back-link" href="/">← Back to parts</Link>
          </div>
        </header>

        <section className="retailers-head">
          <p className="banner-eyebrow">Our retailers</p>
          <h1 className="retailers-title">18 stores, one best price</h1>
          <p className="retailers-intro">
            Every price on SubieDeal comes from one of these stores. We link you
            straight to them — no markups, no middleman.
          </p>
        </section>

        <ul className="retailer-grid">
          {RETAILERS.map((r) => (
            <li key={r.url} className="retailer-card">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="retailer-link"
              >
                <span className="retailer-main">
                  <span className="retailer-name">{r.name}</span>
                  <span className="retailer-domain">
                    {r.url.replace(/^https?:\/\//, "")}
                  </span>
                  <span className={`retailer-ship ship-${r.ship.tone}`}>{r.ship.text}</span>
                </span>
                <span className="retailer-meta">
                  <span className="retailer-count">{r.count}</span>
                  <span className="retailer-count-label">listings</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="retailers-disclaimer">
          Shipping policies change — always confirm at the store&rsquo;s checkout.
        </p>

        <footer className="site-footer">
          <Link className="footer-link" href="/">← Back to SubieDeal</Link>
        </footer>
      </div>
    </main>
  );
}
