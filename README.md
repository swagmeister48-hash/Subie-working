# SubieDeal — Subaru Parts Price Comparison

The site that compares Subaru part prices across 12 retailers and links you to the
best deal. Next.js front end reading live from a Supabase database.

**Live on Vercel as "subiedeal."** Pushing to the `main` branch on GitHub
auto-deploys the new version.

## What's here
- `app/` — the website pages
  - `app/page.tsx` — the home page (catalog search/compare)
  - `app/retailers/page.tsx` — the "/retailers" page listing all 12 stores
- `components/PartsBrowser.tsx` — the search/filter/compare interface
- `lib/supabase.ts` — connects to and reads from your Supabase database
- `.env.local` — your Supabase URL + public key (already filled in)

## See it on your computer (optional, needs Node.js)
1. Install Node.js from https://nodejs.org (the "LTS" button) if you don't have it.
2. Copy the example environment file and fill in your Supabase values:

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and replace the example values with your project's
   # NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
   ```

3. Open Terminal in this folder and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 (or the port printed by the dev server) in your browser.

Note: the site provides a safe fallback when those env vars are missing so it
won't crash — but for live data you still need to set the two Supabase values.

## It's live (Vercel)
The GitHub repo is connected to Vercel with the two `.env.local` values set as
Environment Variables. Every push to `main` triggers a new deploy automatically —
no manual step needed.

Prices update automatically: the page re-reads the database every few minutes,
so when the scraper refreshes Supabase, the live site reflects it without a redeploy.
