# Frontend Overhaul Handoff

## What changed
- `lib/supabase.ts`
  - Updated the Supabase RPC contract to match deployed `search_parts` signature.
  - Added `p_year_from`, `p_year_to`, `p_chassis`, and `p_min_save_pct` support.
  - Added `save_pct` and `chassis` to the `Part` type.
  - Updated `get_facets()` and facet types to use `{v,n}` objects.
- `components/PartsBrowser.tsx`
  - Rebuilt the search UI as a premium dark price-comparison experience.
  - Added desktop sidebar filters and mobile slide-over filters.
  - Added filter chips, savings presets, year range controls, chassis selection, and retailer/category/brand/color filtering.
  - Kept analytics calls for `pageview`, `search`, and `click_buy`.
  - Kept `PAGE_SIZE=40` and delayed search by 250ms.
- `app/globals.css`
  - Replaced the base theme with a refined dark palette, accent blue, subtle elevation, and responsive layouts.
  - Added improved card styling, filter pills, hero stats, and mobile-friendly sidebar behavior.
- `app/layout.tsx`
  - Added the Inter font via `next/font/google`.

## Verification
- `npm run build` passes cleanly.
- The app now compiles with the new frontend code and theme.

## Questions
- I used the safe local supabase fallback for development when `.env.local` is not populated. Do you want me to keep that behavior or require the real Supabase env values at runtime?
- Would you like me to follow up by wiring example homepage data or snapshot testing with the live Supabase dataset once the credentials are available?
- Should I also add a small QA note in `CLAUDE.md` listing the exact filter queries you requested (e.g. chassis `VA`, year `2015–2021`, `save_pct=25`)?
