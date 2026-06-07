# Launch SubieDeal on Vercel (~10 min, no coding)

Your code is on GitHub and ready. Vercel will build it and put it on the real internet.

## A. Sign up
1. Go to **https://vercel.com** → **Sign Up**.
2. Choose **Continue with GitHub** and authorize it (use the GitHub account that owns
   the Subie-working repo: swagmeister48-hash).

## B. Import your project
1. On the Vercel dashboard click **Add New… → Project**.
2. You'll see a list of your GitHub repos. Find **Subie-working** and click **Import**.
   - If Vercel says it can't see your repos, click **Adjust GitHub App Permissions** and
     give it access to the Subie-working repo, then come back.
3. Vercel auto-detects **Next.js** — leave Framework Preset, Build Command, and Output
   all on their defaults. Root Directory stays as **./** (the app is at the repo root).

## C. Add the two environment variables (important)
Before clicking Deploy, expand **Environment Variables** and add these two, exactly:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dbrakcmlwmaqsbgfswsc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (copy from your local `.env.local`) |

(These are the same safe, public values from your local .env.local. Without them the live
site would show an empty catalog.)

## D. Deploy
1. Click **Deploy**. It builds for ~1–2 minutes.
2. When it finishes you'll get a live URL like **subie-working.vercel.app** — click it.
   That's your site, live on the internet. Send it to a friend to confirm.

## E. After it's live
- **Every future change** Claude Code pushes to GitHub auto-deploys here. No steps from you.
- **Custom domain** (subiedeal.com): in the project, go to **Settings → Domains**, add your
  domain, and follow the DNS instructions. (Buy the domain first from Cloudflare/Namecheap.)
- **Plan note:** the free **Hobby** plan is fine to launch and test on. Vercel's terms ask
  commercial/revenue sites to be on **Pro ($20/mo)** — so once you add affiliate links and
  it's earning, upgrade. No rush for a soft launch.

## If a build fails
Copy the red error text from Vercel's build log and paste it to Claude (here) or Claude Code —
it's almost always a quick fix, and a failed deploy never affects anything that's already live.
