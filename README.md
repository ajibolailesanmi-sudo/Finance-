# 💰 FinTrack — Personal Finance Tracker

A private, fully client-side web app for tracking your finances. No accounts, no
servers, no installation — open it in a browser and everything is stored locally
on your device.

## Features

- **📊 Dashboard** — net worth, monthly income/expenses, savings rate, plus
  hand-drawn SVG charts: net-worth trend, income-vs-expense bars, and a
  spending-by-category donut.
- **💸 Transactions** — log income and expenses across accounts, with search and
  filtering by type and category. Also record **transfers between accounts** —
  these move money without counting as income or expense, so your net worth
  stays correct.
- **🎯 Budgets** — set monthly limits per category and watch progress bars turn
  amber/red as you approach or exceed them.
- **🏆 Goals** — set savings goals with a target amount and optional target date,
  add/withdraw funds, and track progress (with the required monthly pace to hit
  your deadline).
- **🔁 Recurring & Bills** — track recurring income/expenses, see upcoming due
  dates, and log a payment with one click to roll the date forward.
- **🏦 Accounts** — multiple accounts (bank, cash, credit card, etc.), each in
  **its own currency**, with live computed balances.
- **🏷️ Categories** — add, rename, recolor, and delete your own income/expense
  categories. Deleting a category that's in use safely reassigns its
  transactions to another category of the same type.
- **📄 Reports** — a printable financial report for this month / last 3 months /
  this year / all time, with income & expense category breakdowns, account
  balances, and goal progress. **Export to PDF** via your browser's print dialog.
- **⚙️ Settings** — choose your base currency, manage exchange rates, toggle
  light/dark theme, export/import a JSON backup, **import/export transactions as
  CSV**, load demo data, or wipe everything.

## Multi-currency

Each account has its own currency, and one **base currency** (set in Settings)
is used for all cross-account reporting — net worth, the dashboard, budgets, and
reports are converted into it using the **exchange rates** you maintain under
**Settings → Exchange Rates** (`1 EUR = ? USD`, etc.). Account balances and
individual transactions are shown in each account's own currency, with the base
equivalent alongside. Transfers between accounts in different currencies are
converted at your current rates, so net worth stays consistent.

> Rates are entered manually (the app is fully offline and makes no network
> calls). Update them whenever you like.

## Reports & PDF export

The **Reports** view builds a clean summary for the period you pick. Click
**Save as PDF** to open your browser's print dialog — choose "Save as PDF" as the
destination. A print stylesheet hides the navigation and chrome so only the
report is printed.

## CSV import/export

Under **Settings → Transactions CSV** you can bulk-import transactions or export
them as a spreadsheet. The expected columns are:

```
date,type,amount,category,account,note
2026-05-02,expense,55.20,Groceries,Checking,Weekly shop
2026-05-03,income,1500,Salary,Checking,Pay
```

- `date` accepts `YYYY-MM-DD` or `M/D/YYYY`.
- `type` is `income` or `expense`. If omitted, a negative `amount` is treated as
  an expense and a positive one as income.
- Unknown `category` or `account` names are **created automatically** on import.
- Rows with an unparseable date or amount are skipped, and you get a preview of
  what will be imported before anything is committed.

Use **Download CSV template** to get a correctly-formatted starter file.

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
js/store.js       state, localStorage persistence, derived metrics, CSV helpers
js/charts.js      dependency-free SVG charts (donut, bars, line)
js/app.js         UI controller: routing, views, modals, forms
```

## Tech

Plain HTML/CSS/JavaScript (ES5-compatible, no framework, no bundler). Charts are
rendered as inline SVG, so the app works completely offline.
