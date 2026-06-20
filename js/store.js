/* ============================================================
   store.js — state, persistence (localStorage), and pure helpers
   ============================================================ */
(function (global) {
  "use strict";

  var STORAGE_KEY = "fintrack.v1";

  // Default categories shipped with the app. Each maps to a color token.
  var DEFAULT_CATEGORIES = [
    { name: "Salary", type: "income", color: "#1faa6c" },
    { name: "Freelance", type: "income", color: "#18b6c4" },
    { name: "Interest", type: "income", color: "#36c98a" },
    { name: "Other Income", type: "income", color: "#7bd389" },
    { name: "Housing", type: "expense", color: "#4f6ef7" },
    { name: "Groceries", type: "expense", color: "#e6a23c" },
    { name: "Dining", type: "expense", color: "#e2574c" },
    { name: "Transport", type: "expense", color: "#9b59f5" },
    { name: "Utilities", type: "expense", color: "#18b6c4" },
    { name: "Health", type: "expense", color: "#e879a6" },
    { name: "Entertainment", type: "expense", color: "#f2994a" },
    { name: "Shopping", type: "expense", color: "#6b87ff" },
    { name: "Subscriptions", type: "expense", color: "#5b6678" },
    { name: "Other", type: "expense", color: "#8b95a7" }
  ];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function defaultState() {
    return {
      settings: { currency: "USD", theme: "light" },
      accounts: [
        { id: uid(), name: "Checking", type: "Bank", openingBalance: 0 },
        { id: uid(), name: "Cash", type: "Cash", openingBalance: 0 }
      ],
      categories: DEFAULT_CATEGORIES.map(function (c) { return Object.assign({ id: uid() }, c); }),
      transactions: [],
      budgets: [],       // { id, categoryId, amount }  (monthly limit)
      recurring: []      // { id, name, type, accountId, categoryId, amount, frequency, nextDate, active }
    };
  }

  var state = null;

  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        // Merge in any new default fields for forward-compatibility.
        var d = defaultState();
        for (var k in d) if (!(k in state)) state[k] = d[k];
      } else {
        state = defaultState();
        save();
      }
    } catch (e) {
      console.error("Failed to load state, resetting:", e);
      state = defaultState();
    }
    return state;
  }

  function save() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save state:", e);
    }
  }

  function getState() { return state; }

  function replaceState(next) { state = next; save(); }

  /* ---------- Currency / date formatting ---------- */
  function fmtMoney(amount, opts) {
    opts = opts || {};
    var cur = state.settings.currency || "USD";
    var n = Number(amount) || 0;
    try {
      return n.toLocaleString(undefined, {
        style: "currency",
        currency: cur,
        minimumFractionDigits: opts.compact ? 0 : 2,
        maximumFractionDigits: opts.compact ? 0 : 2
      });
    } catch (e) {
      return cur + " " + n.toFixed(2);
    }
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function monthKey(iso) { return iso.slice(0, 7); }          // "2026-06"
  function monthLabel(key) {
    var p = key.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  /* ---------- Lookups ---------- */
  function accountById(id) { return state.accounts.find(function (a) { return a.id === id; }); }
  function categoryById(id) { return state.categories.find(function (c) { return c.id === id; }); }
  function categoryByName(name) { return state.categories.find(function (c) { return c.name === name; }); }

  /* ---------- Derived metrics ---------- */

  // Current balance of an account = opening + all its transactions.
  function accountBalance(accountId) {
    var acct = accountById(accountId);
    if (!acct) return 0;
    var bal = Number(acct.openingBalance) || 0;
    state.transactions.forEach(function (t) {
      if (t.type === "transfer") {
        if (t.accountId === accountId) bal -= t.amount;       // money leaves source
        if (t.toAccountId === accountId) bal += t.amount;      // money enters destination
        return;
      }
      if (t.accountId !== accountId) return;
      bal += t.type === "income" ? t.amount : -t.amount;
    });
    return bal;
  }

  function totalNetWorth() {
    return state.accounts.reduce(function (sum, a) { return sum + accountBalance(a.id); }, 0);
  }

  function transactionsInMonth(key) {
    return state.transactions.filter(function (t) { return monthKey(t.date) === key; });
  }

  function monthTotals(key) {
    var income = 0, expense = 0;
    transactionsInMonth(key).forEach(function (t) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;   // transfers excluded
    });
    return { income: income, expense: expense, net: income - expense };
  }

  // Spend per category (expenses only) within a month.
  function spendByCategory(key) {
    var map = {};
    transactionsInMonth(key).forEach(function (t) {
      if (t.type !== "expense") return;
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return map;
  }

  // Last N months (including current) of {key, income, expense, net}.
  function monthlySeries(n, endKey) {
    var parts = endKey.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      var key = dd.getFullYear() + "-" + String(dd.getMonth() + 1).padStart(2, "0");
      var t = monthTotals(key);
      out.push({ key: key, label: dd.toLocaleDateString(undefined, { month: "short" }), income: t.income, expense: t.expense, net: t.net });
    }
    return out;
  }

  // Running net-worth value at the end of each of the last N months.
  function netWorthSeries(n, endKey) {
    var series = monthlySeries(n, endKey);
    // Net worth at end of each month = opening balances + cumulative net up to that month.
    var openings = state.accounts.reduce(function (s, a) { return s + (Number(a.openingBalance) || 0); }, 0);
    // Sum of all transactions strictly before the first month in the window.
    var firstKey = series.length ? series[0].key : endKey;
    var priorNet = 0;
    state.transactions.forEach(function (t) {
      if (monthKey(t.date) >= firstKey) return;
      if (t.type === "income") priorNet += t.amount;
      else if (t.type === "expense") priorNet -= t.amount;   // transfers net to zero
    });
    var running = openings + priorNet;
    return series.map(function (m) {
      running += m.net;
      return { label: m.label, value: running };
    });
  }

  /* ---------- Recurring helpers ---------- */
  function addToDate(iso, frequency) {
    var p = iso.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    switch (frequency) {
      case "weekly": d.setDate(d.getDate() + 7); break;
      case "biweekly": d.setDate(d.getDate() + 14); break;
      case "monthly": d.setMonth(d.getMonth() + 1); break;
      case "quarterly": d.setMonth(d.getMonth() + 3); break;
      case "yearly": d.setFullYear(d.getFullYear() + 1); break;
      default: d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().slice(0, 10);
  }

  function daysUntil(iso) {
    var p = iso.split("-");
    var target = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  }

  /* ---------- CSV helpers (import / export) ---------- */
  // RFC-4180-ish parser: handles quoted fields, escaped quotes, CRLF. Returns rows of cells.
  function parseCSVRows(text) {
    var rows = [], row = [], field = "", inQ = false;
    text = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += ch;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // Parse CSV text into objects keyed by lowercased header names.
  function csvToObjects(text) {
    var rows = parseCSVRows(text).filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
    if (rows.length < 2) return [];
    var headers = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      headers.forEach(function (h, i) { o[h] = (r[i] != null ? String(r[i]).trim() : ""); });
      return o;
    });
  }

  // Serialize records (array of objects) to CSV given an ordered header list.
  function toCSV(headers, records) {
    function q(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [headers.join(",")];
    records.forEach(function (rec) { lines.push(headers.map(function (h) { return q(rec[h]); }).join(",")); });
    return lines.join("\n");
  }

  // Best-effort date parsing → ISO yyyy-mm-dd, or null if unparseable.
  function parseDateLoose(s) {
    s = String(s || "").trim();
    if (!s) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {                                   // assume M/D/Y (most common in exports)
      var mm = m[1], dd = m[2], yy = m[3];
      if (yy.length === 2) yy = "20" + yy;
      return yy + "-" + String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
    }
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  // Parse a possibly-formatted amount string ("$1,234.50", "(50)") → number or NaN.
  function parseAmountLoose(s) {
    s = String(s == null ? "" : s).trim();
    var neg = /^\(.*\)$/.test(s);                // accounting-style negatives
    var n = parseFloat(s.replace(/[(),$£€₦]/g, "").replace(/[^0-9.\-]/g, ""));
    if (isNaN(n)) return NaN;
    return neg ? -Math.abs(n) : n;
  }

  /* ---------- Demo data (optional, from Settings) ---------- */
  function loadDemoData() {
    var s = defaultState();
    var checking = s.accounts[0].id;
    var cash = s.accounts[1].id;
    s.accounts[0].openingBalance = 3200;
    s.accounts[1].openingBalance = 150;
    function cat(name) { var c = s.categories.find(function (x) { return x.name === name; }); return c ? c.id : null; }
    var now = new Date();
    function iso(daysAgo) { var d = new Date(now); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0, 10); }
    var tx = [
      ["income", "Salary", 4200, checking, "Monthly pay", 2],
      ["expense", "Housing", 1450, checking, "Rent", 1],
      ["expense", "Groceries", 86.4, checking, "Supermarket", 1],
      ["expense", "Dining", 32.5, cash, "Lunch", 3],
      ["expense", "Transport", 60, checking, "Fuel", 4],
      ["expense", "Utilities", 120, checking, "Electric", 6],
      ["expense", "Subscriptions", 15.99, checking, "Streaming", 7],
      ["expense", "Entertainment", 45, cash, "Cinema", 9],
      ["income", "Freelance", 600, checking, "Side project", 12],
      ["expense", "Groceries", 102.3, checking, "Weekly shop", 14],
      ["expense", "Health", 40, checking, "Pharmacy", 18],
      ["expense", "Shopping", 78.2, checking, "Clothes", 22]
    ];
    s.transactions = tx.map(function (r) {
      return { id: uid(), type: r[0], categoryId: cat(r[1]), amount: r[2], accountId: r[3], note: r[4], date: iso(r[5]) };
    });
    s.budgets = [
      { id: uid(), categoryId: cat("Housing"), amount: 1500 },
      { id: uid(), categoryId: cat("Groceries"), amount: 400 },
      { id: uid(), categoryId: cat("Dining"), amount: 200 },
      { id: uid(), categoryId: cat("Transport"), amount: 150 },
      { id: uid(), categoryId: cat("Entertainment"), amount: 120 }
    ];
    s.recurring = [
      { id: uid(), name: "Rent", type: "expense", accountId: checking, categoryId: cat("Housing"), amount: 1450, frequency: "monthly", nextDate: iso(-5), active: true },
      { id: uid(), name: "Salary", type: "income", accountId: checking, categoryId: cat("Salary"), amount: 4200, frequency: "monthly", nextDate: iso(-12), active: true },
      { id: uid(), name: "Streaming", type: "expense", accountId: checking, categoryId: cat("Subscriptions"), amount: 15.99, frequency: "monthly", nextDate: iso(-2), active: true }
    ];
    replaceState(s);
  }

  global.Store = {
    STORAGE_KEY: STORAGE_KEY,
    uid: uid,
    load: load,
    save: save,
    getState: getState,
    replaceState: replaceState,
    defaultState: defaultState,
    loadDemoData: loadDemoData,
    fmtMoney: fmtMoney,
    todayISO: todayISO,
    monthKey: monthKey,
    monthLabel: monthLabel,
    accountById: accountById,
    categoryById: categoryById,
    categoryByName: categoryByName,
    accountBalance: accountBalance,
    totalNetWorth: totalNetWorth,
    transactionsInMonth: transactionsInMonth,
    monthTotals: monthTotals,
    spendByCategory: spendByCategory,
    monthlySeries: monthlySeries,
    netWorthSeries: netWorthSeries,
    addToDate: addToDate,
    daysUntil: daysUntil,
    csvToObjects: csvToObjects,
    toCSV: toCSV,
    parseDateLoose: parseDateLoose,
    parseAmountLoose: parseAmountLoose
  };
})(window);
