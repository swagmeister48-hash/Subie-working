# Setting up Claude Code in VS Code (~15 minutes)

Why you're doing this: Claude Code works directly on your computer, so it can run the site,
see errors itself, fix them, and push to GitHub on its own — no more copy-pasting commands
or relaying error messages. Use it for code work; keep Cowork for database/business operations.

---

## Step 1 — Install VS Code (if you don't have it)
1. Go to https://code.visualstudio.com and click Download for Mac.
2. Open the downloaded file; drag Visual Studio Code into Applications.
3. Open it once so macOS trusts it.

## Step 2 — Install the Claude Code extension
1. In VS Code press **Cmd+Shift+X** (opens Extensions).
2. Search **"Claude Code"**.
3. Install the one **published by Anthropic** (avoid lookalikes).
4. If prompted that the Claude Code CLI is needed, accept and let it install it for you.
   If nothing happens, restart VS Code.

## Step 3 — Sign in
1. A spark/Claude icon appears in the left sidebar — click it.
2. Click sign in; it opens your browser. Log in with the **same account you use for Claude/Cowork**
   (your Pro/Max subscription covers Claude Code — no separate billing).

## Step 4 — Open your project
1. **File → Open Folder…** → choose `Downloads/Subie-mvp-main/parts-compare`.
2. That's the rebuilt site. Claude Code automatically reads the `CLAUDE.md` file in this folder,
   so it already knows the whole architecture, the rules we set, and the gotchas we hit.

## Step 5 — First conversation (verify it works)
In the Claude panel, type:

> Read CLAUDE.md, then run the dev server and confirm the site loads with no errors.

It should start the site and report back. If it asks permission to run commands, allow it —
that permission system is normal (it asks before running anything new).

## Step 6 — Set the model (token efficiency)
- In the Claude panel, find the model picker (or type `/model`).
- Choose **Sonnet** for everyday code work — it's fast, excellent at this, and uses far less
  of your plan than Opus. Save Opus for genuinely hard problems.

## Step 7 — Let it handle git (one-time)
Tell it:

> Set up git credentials so you can push to my GitHub repo at
> https://github.com/swagmeister48-hash/Subie-working using a token I'll paste.

Paste a **fresh** GitHub token when asked (Settings → Developer settings → Fine-grained tokens —
regenerate the old one, it's been shared in chat). After this, Claude Code commits and pushes itself.

---

## How to split work between the two tools
- **Claude Code (VS Code)**: anything touching site code — new pages, design changes,
  bug fixes, new features. It edits, runs, tests, and pushes by itself.
- **Cowork**: database operations (it has the Supabase connection), eBay scrape passes,
  scheduled jobs, the scraper console, traffic reports, strategy.

Both read the same CLAUDE.md, so they stay coordinated. When either tool makes a big change,
ask it to update CLAUDE.md so the other knows.

## Tips
- Be specific: "make the filter bar collapse on mobile" beats "improve the site".
- Ask it to verify: "…and run the build to confirm nothing broke" — it can, locally.
- One feature per conversation keeps things cheap and focused.
