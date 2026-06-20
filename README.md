# 💰 FinTrack — Personal Finance Tracker

A private, fully client-side web app for tracking your finances. No accounts, no
servers, no installation — open it in a browser and everything is stored locally
on your device.

## Features

- **📊 Dashboard** — net worth, monthly income/expenses, savings rate, plus
  hand-drawn SVG charts: net-worth trend, income-vs-expense bars, and a
  spending-by-category donut.
- **💸 Transactions** — log income and expenses across accounts, with search and
  filtering by type and category.
- **🎯 Budgets** — set monthly limits per category and watch progress bars turn
  amber/red as you approach or exceed them.
- **🔁 Recurring & Bills** — track recurring income/expenses, see upcoming due
  dates, and log a payment with one click to roll the date forward.
- **🏦 Accounts** — multiple accounts (bank, cash, credit card, etc.) with live
  computed balances.
- **⚙️ Settings** — choose your currency, toggle light/dark theme, export/import
  a JSON backup, load demo data, or wipe everything.

## Privacy

All data lives in your browser's `localStorage` under the key `fintrack.v1`. It
never leaves your machine. Use **Settings → Export backup** regularly to keep a
copy, since clearing browser data will erase it.

## Running it

No build step and no dependencies. Either:

```bash
# Option A — just open the file
open index.html        # macOS  (use "start" on Windows, "xdg-open" on Linux)

# Option B — serve it (recommended; avoids any file:// quirks)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html        markup + layout
css/styles.css    theming (light/dark), components, responsive layout
js/store.js       state, localStorage persistence, derived metrics
js/charts.js      dependency-free SVG charts (donut, bars, line)
js/app.js         UI controller: routing, views, modals, forms
```

## Tech

Plain HTML/CSS/JavaScript (ES5-compatible, no framework, no bundler). Charts are
rendered as inline SVG, so the app works completely offline.
