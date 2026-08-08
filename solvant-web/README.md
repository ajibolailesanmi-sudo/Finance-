# Solvant Labs — Website

Marketing site for Solvant Labs, an AI automation studio for US small businesses.
Next.js (App Router) + TypeScript + Tailwind. One job: turn a cold-email click into a booked intro call.

- **Pages:** `/` (home), `/services`, `/work`, `/process`, `/contact`, `/privacy`
- **Differentiator:** the "Ask Solvant" chat widget (server-side Anthropic call, degrades gracefully)
- **Design:** technical-paper / schematic; light "engineering paper" world, one accent color

## Local development

```bash
cd solvant-web
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

Fonts (Space Grotesk / Inter / IBM Plex Mono) are self-hosted at build time via `next/font` — no runtime network calls.

## Environment variables

| Variable                  | Required | Purpose |
|---------------------------|----------|---------|
| `ANTHROPIC_API_KEY`       | for chat | Server-side key for the Ask Solvant widget. **Never exposed to the browser.** Without it, the widget shows "Chat is offline. Book a call instead:" and the site works normally. |
| `NEXT_PUBLIC_BOOKING_URL` | yes      | Your Cal.com link, used by every "Book a 15-minute intro call" CTA. Until set, CTAs show a reminder toast instead of a dead link. |

## Deploy (Vercel + Hostinger DNS)

The app runs on **Vercel**; the domain stays registered at **Hostinger** and points to Vercel.

1. Push this repo and import it into Vercel. **Set the Root Directory to `solvant-web/`** (this project lives in a subfolder).
2. In Vercel → Settings → Environment Variables, add `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_BOOKING_URL` (Production scope).
3. Vercel → Settings → Domains → add `solvantlabs.com` and `www.solvantlabs.com`.
4. In Hostinger hPanel → Domains → DNS Records, add what Vercel shows — typically:
   - `A` `@` → `76.76.21.21`
   - `CNAME` `www` → `cname.vercel-dns.com`
   Remove any existing conflicting `@` / `www` records first. Keep Hostinger's nameservers.
5. HTTPS is issued automatically once DNS propagates.

Vercel Analytics is built in (`@vercel/analytics`); no extra config.

## Where to edit content and pricing

**All copy, pricing, and founder-supplied placeholders live in one file:** [`src/lib/content.ts`](src/lib/content.ts).
Edit that file to change text — the components read from it. Design tokens (colors) are in
[`src/app/globals.css`](src/app/globals.css) and [`tailwind.config.ts`](tailwind.config.ts).

### Placeholders to fill (`[FILL: …]`)

Grep the project for `[FILL` to find every one. As of now:

- `NEXT_PUBLIC_BOOKING_URL` — the Cal.com booking link
- Contact email and business mailing address (`src/lib/content.ts` → `CONTACT`)
- Both case-study **stacks** and **outcomes** (`CASES`)
- The **app.hoatpen.com** card: name, problem, what it does, stack (`APP`)
- Privacy page "last updated" date (`src/app/privacy/page.tsx`)

## The chat widget

- Client component: `src/components/AskSolvant.tsx` (keeps history in state, sends full history each request).
- Server route: `src/app/api/chat/route.ts` (calls the Anthropic Messages API, `claude-opus-5`).
  - Model and token caps are constants at the top of the route — swap `MODEL` to `claude-haiku-4-5` to reduce cost.
  - Light per-IP rate limiting (best-effort, per serverless instance).
  - Returns `{ offline: true }` when no key is configured or the API errors, so the widget never looks broken.

## Accessibility & performance

Semantic HTML, single `h1` per page, visible keyboard focus, WCAG AA contrast, and a `prefers-reduced-motion`
branch that freezes the hero schematic. No hero video. Target: Lighthouse 90+ on mobile across all categories.
