# Subaru Parts Price Comparison (rebuild)

The new version of the site: Next.js front end reading live from a Supabase database,
ready to deploy on Vercel whenever you choose.

## What's here
- `app/` — the website pages
- `components/PartsBrowser.tsx` — the search/filter/compare interface
- `lib/supabase.ts` — connects to and reads from your Supabase database
- `.env.local` — your Supabase URL + public key (already filled in)

## See it on your computer (optional, needs Node.js)
1. Install Node.js from https://nodejs.org (the "LTS" button) if you don't have it.
2. Open Terminal, then:
   ```
   cd ~/Downloads/Subie-mvp-main/parts-compare
   npm install
   npm run dev
   ```
3. Open http://localhost:3000 in your browser.

## Going live later (Vercel)
When you're ready, connect this folder's GitHub repo to Vercel and add the two
values from `.env.local` as Environment Variables. No code changes needed.

Prices update automatically: the page re-reads the database every few minutes,
so when the scraper refreshes Supabase, the live site reflects it without a redeploy.
