# Subie — Handoff / Project State

_Last updated: 2026-06-05_

## Project state (current)

### Database (Supabase, all live)
- **Search RPC:** `search_parts(q, p_model, p_category, p_year_from, p_year_to, p_multi_only, p_brand, p_color, p_seller, p_chassis, p_in_stock, p_price_min, p_price_max, p_min_save_pct, p_sort, p_limit, p_offset)`.
- **Sorts:** `relevance`, `price_asc`, `price_desc`, `discount`, `save_pct`, `name`.
- **Facets:** `get_facets()` returns `{v,n}` objects for models / categories / brands / colors / sellers / chassis, plus a `years[]` array.
- Both functions are `SECURITY DEFINER` (fast for the anonymous web role). Test query performance **as the anon role**, not owner.
- Facet counts reflect the default **2+-retailer** ("cross-shoppable") view.
- **Chassis** is derived from fitment data: VA ≈ 5,673 · GR ≈ 4,664 · GD ≈ 4,092 · VB ≈ 2,509 · ZC6 ≈ 2,156 · SJ ≈ 1,547 · ZD8 ≈ 1,469 · SK ≈ 1,252 · SG ≈ 1,233 · SH ≈ 1,232 · SF ≈ 681 · GC8 ≈ 447 (plus a handful of low-count codes hidden in the UI).
- **Colors** inferred (~43k parts colored).
- **eBay is PARKED** — there is no eBay seller in the catalog. Do not re-enable without asking Abe.
- **Nightly maintenance** auto-runs merge SKUs / categorize / color / chassis / stats / `ANALYZE`.
- **Catalog:** ~136k parts, ~28k cross-shoppable, 12 sellers.

### Frontend (builds clean)
- Dark theme, Inter font.
- Sidebar filters with rotating chevrons + counts; **entire filter header row is click-to-toggle** with hover state.
- Compact filter chips.
- Performance green (`#3cbf77`) on the Best badge / Buy buttons / savings text; blue (`#2e5fe8`) accent for general UI.
- Filter groups collapsed by default.
- Homepage loads the default catalog with a skeleton loader.
- Analytics `track()` (pageview / search / click_buy) wired and fixed.
- **Tagline:** "The best price, every time".
- **Centered header search bar** — sits directly on the page (no surface box), ~4px corners, monospace font, green caret; wired to the existing debounced search state.
- **Chassis/model banner** — shows a Subaru image chosen from the active chassis/model filter, the image extended and gradient-blended into the page background (`#11151f`) at the edges with the model name overlaid; falls back to a styled gradient + text when no image file exists (no broken-image icon). Default Subaru banner when nothing is filtered.

### Hosting / repo
- **Vercel:** not set up yet (parked until Abe says go).
- **GitHub:** `swagmeister48-hash/Subie-working`. Abe pushes; Claude prepares commands.

## Pending
- Vercel deployment (when Abe says go).
- Audit suspicious giant price spreads (e.g. Forced Performance turbos).
- eBay cadence/scale decision (only if Abe un-parks it).

## Banner images

All banner photos live in `/public/cars/`, were resized to ~1600px and optimised to
**≤300 KB** each, and every one was **visually confirmed to be the correct Subaru** before use.

### Image credits
Every file below is from **Pexels** under the [Pexels License](https://www.pexels.com/license/)
— free for commercial use, no attribution required (credited here anyway).

| File | What it is | Source |
| --- | --- | --- |
| `default.jpg` | Impreza (GC8) "555" rally car — site default & GC8 | https://www.pexels.com/photo/subaru-rally-car-at-red-bull-off-road-race-33626705/ |
| `va.jpg` | Silver VA-gen WRX STI (2015–2021) | https://www.pexels.com/photo/silver-subaru-wrx-sti-12920621/ |
| `gd.jpg` | Blue GD-gen WRX STI (2002–2007) | https://www.pexels.com/photo/high-speed-blue-subaru-wrx-sti-on-highway-30112449/ |
| `gr.jpg` | Orange GR-gen Impreza WRX hatch (2008–2014) | https://www.pexels.com/photo/back-view-of-orange-subaru-impreza-wrx-18501353/ |
| `zc6.jpg` / `brz.jpg` | White 1st-gen Subaru BRZ (ZC6) | https://www.pexels.com/photo/white-subaru-brz-sports-car-18611668/ |
| `wrx.jpg` | Blue VA-gen WRX, front | https://www.pexels.com/photo/front-of-blue-subaru-impreza-wrx-16728010/ |
| `sti.jpg` | Two WRX STIs at night | https://www.pexels.com/photo/black-and-white-subaru-wrx-cars-17158873/ |
| `forester.jpg` | Black SH-gen Forester | https://www.pexels.com/photo/black-subaru-forester-19868891/ |
| `impreza.jpg` | White GD-gen Impreza WRX STI | https://www.pexels.com/photo/white-modified-subaru-impreza-wrx-sti-9661391/ |
| `outback.jpg` | Modern Outback off-road | https://www.pexels.com/photo/subaru-outback-in-mud-15928390/ |

### How the banner picks an image (`resolveBanner` in `components/PartsBrowser.tsx`)
1. **Active chassis** → its mapped image: VA→`va`, GD→`gd`, GR→`gr`, ZC6→`zc6`, ZD8→`brz`,
   VB→`wrx`, GC8→`default`, and all Forester chassis (SF/SG/SH/SJ/SK)→`forester`.
2. Else **active model** → WRX→`wrx`, STI→`sti`, BRZ→`brz`, Forester→`forester`,
   Impreza→`impreza`, Outback→`outback`.
3. Else → `default.jpg` (the rally car).

Every mapping points at a file that exists, so the banner never requests a missing image.
The overlaid headline is the chassis code (with a friendly year/model label) or the model
name; the image edges gradient-blend into the page background (`#11151f`). If an image ever
fails to load, an `onError` handler hides it and the styled gradient + text remain (no broken
icon).
