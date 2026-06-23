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
  dates, and log a payment with one click to roll the date forward. Or flip on
  **⚡ auto-post** and the app logs each payment automatically when it falls due —
  catching up any periods you missed while the app was closed.
- **🏦 Accounts** — track everything you own and owe. Accounts can be **assets**
  (bank, cash, savings, investments) or **liabilities** (credit cards, loans,
  mortgages), each in its own currency. The view groups them with asset and
  liability subtotals and a real **net worth = assets − liabilities**. Use
  **📈 Update value** on any account to mark an investment to its current market
  value or set a loan's outstanding balance — recorded as a non-cashflow
  adjustment so it moves net worth without distorting your income/expense reports.
- **🏷️ Categories** — add, rename, recolor, and delete your own income/expense
  categories. Deleting a category that's in use safely reassigns its
  transactions to another category of the same type.
- **📄 Reports** — a printable financial report for this month / last 3 months /
  this year / all time, with income & expense category breakdowns, account
  balances, and goal progress. **Export to PDF** via your browser's print dialog.
- **⚙️ Settings** — choose your base currency, manage exchange rates, toggle
  light/dark theme, export/import a JSON backup, **import/export transactions as
  CSV**, load demo data, or wipe everything.

## Notifications center

A **🔔 bell** in the top bar shows a live badge counting bills that are **overdue**
or **due soon**. Click it to open a panel that lists each one with its amount,
account, and due/overdue status. From there you can:

- **✅ Log now** — post the payment immediately and roll the due date forward.
- **✕ Dismiss** — hide that specific occurrence; it reappears automatically at
  the next due date.
- **Dismiss all** or jump straight to **Manage recurring**.

The badge is red when something is overdue, amber when everything is merely
upcoming. The look-ahead window (default 7 days) is configurable under
**Settings → Notify about bills due within (days)**. Auto-posting items appear
here too, flagged ⚡, as a heads-up before they post.

### Desktop notifications

Beyond the in-app bell, FinTrack can raise **native desktop notifications** for
due/overdue bills. Turn them on under **Settings → Desktop Notifications**
(you'll be asked for the browser's notification permission). After that:

- On launch — and whenever you return to the tab — any newly-due bill triggers a
  notification (one per occurrence; a single summary when several are due).
- Clicking a notification focuses (or opens) FinTrack, via a small service
  worker (`sw.js`).
- A **Send a test notification** button lets you confirm it's working.

**Scope/limitation:** because the app is fully client-side with **no server**,
notifications fire while FinTrack is open or when you reopen the tab — not when
the browser is completely closed. True background/closed-browser push requires a
push server (VAPID + a backend), which this app intentionally doesn't have. The
service worker needs the app to be served over `http(s)` (e.g.
`python3 -m http.server`); over `file://` it gracefully falls back to in-page
notifications.

## Auto-posting recurring bills

Each recurring item has an **⚡ auto-post** switch (toggle it from the Recurring &
Bills table, or in the add/edit dialog). When it's on:

- Every time you open the app, any occurrences that have come due (on or before
  today) are logged automatically as transactions, and the due date rolls forward
  to the next one.
- If the app hasn't been opened in a while, it **catches up** — e.g. a monthly
  bill that's three months overdue posts all three missed payments at their
  correct dates.
- Auto-posted transactions are noted as `… (recurring)` so they're easy to spot.
- A summary toast tells you what was posted on launch.

Items that are paused, or whose due date is still in the future, are left alone.

## Net worth — assets & liabilities

Add **everything**: bank/cash/savings, **investments**, and what you owe —
**credit cards, car loans, mortgages**. When you add a liability account you
enter the **amount owed** (stored internally as a negative balance), so:

- **Net worth = total assets − total liabilities**, shown on the Dashboard, the
  Accounts page (grouped with subtotals), and in Reports.
- Spending on a credit card increases what you owe and lowers net worth; paying
  the card from your checking account is a **transfer** that's net-worth-neutral.
- **📈 Update value** revalues an investment or loan via a balance *adjustment* —
  it counts toward net worth and the net-worth trend, but is excluded from
  income, expenses, budgets, and savings rate (it isn't cashflow). Adjustments
  appear in the ledger as `📈 Adjustment` rows.

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
sw.js             service worker — desktop notification display + click-to-focus
js/store.js       state, localStorage persistence, derived metrics, CSV helpers
js/charts.js      dependency-free SVG charts (donut, bars, line)
js/app.js         UI controller: routing, views, modals, forms
```

## Tech

Plain HTML/CSS/JavaScript (ES5-compatible, no framework, no bundler). Charts are
rendered as inline SVG, so the app works completely offline.
