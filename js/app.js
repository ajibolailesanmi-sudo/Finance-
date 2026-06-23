/* ============================================================
   app.js — UI controller: routing, views, modals, forms
   ============================================================ */
(function (global) {
  "use strict";

  var S = global.Store;
  var C = global.Charts;

  var ui = {
    view: "dashboard",
    month: S.monthKey(S.todayISO()),
    reportPeriod: "month",
    txFilter: { search: "", category: "all", type: "all" }
  };

  /* ---------- tiny DOM helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  function toast(msg, kind) {
    var host = $("#toast-host");
    var t = el('<div class="toast ' + (kind || "") + '">' + msg + "</div>");
    host.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  /* ---------- Modal ---------- */
  function openModal(html) {
    $("#modal").innerHTML = html;
    $("#modal-overlay").classList.remove("hidden");
  }
  function closeModal() { $("#modal-overlay").classList.add("hidden"); $("#modal").innerHTML = ""; }
  $("#modal-overlay").addEventListener("click", function (e) { if (e.target.id === "modal-overlay") closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  /* ---------- Month picker ---------- */
  function buildMonthPicker() {
    var sel = $("#month-picker");
    var keys = {};
    S.getState().transactions.forEach(function (t) { keys[S.monthKey(t.date)] = true; });
    keys[ui.month] = true;
    keys[S.monthKey(S.todayISO())] = true;
    var sorted = Object.keys(keys).sort().reverse();
    sel.innerHTML = sorted.map(function (k) {
      return '<option value="' + k + '"' + (k === ui.month ? " selected" : "") + ">" + S.monthLabel(k) + "</option>";
    }).join("");
  }

  /* ============================================================
     VIEWS
     ============================================================ */
  var Views = {};

  // ---------- Dashboard ----------
  Views.dashboard = function () {
    var st = S.getState();
    var totals = S.monthTotals(ui.month);
    var nw = S.totalNetWorth();
    var liab = S.liabilitiesTotal();
    var savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : 0;
    var nwSub = liab < 0
      ? "Assets " + S.fmtMoney(S.assetsTotal(), { compact: true }) + " · Debts " + S.fmtMoney(Math.abs(liab), { compact: true })
      : "Across all accounts";

    var stats = '<div class="grid stat-grid">' +
      statCard("Net Worth", S.fmtMoney(nw), nw >= 0 ? null : "neg", nwSub) +
      statCard("Income", S.fmtMoney(totals.income), "pos", S.monthLabel(ui.month)) +
      statCard("Expenses", S.fmtMoney(totals.expense), "neg", S.monthLabel(ui.month)) +
      statCard("Net Savings", S.fmtMoney(totals.net), totals.net >= 0 ? "pos" : "neg", savingsRate.toFixed(0) + "% of income") +
      "</div>";

    // Spending donut + legend
    var spend = S.spendByCategory(ui.month);
    var donutData = Object.keys(spend).map(function (cid) {
      var c = S.categoryById(cid);
      return { label: c ? c.name : "Unknown", value: spend[cid], color: c ? c.color : "#8b95a7" };
    }).sort(function (a, b) { return b.value - a.value; });

    var legend = donutData.map(function (d) {
      return '<div class="legend-item"><span class="l"><span class="dot" style="background:' + d.color + '"></span>' + d.label + '</span><span class="v">' + S.fmtMoney(d.value) + "</span></div>";
    }).join("") || '<div class="muted small">No expenses recorded.</div>';

    var donutBlock = '<div class="card"><div class="card-title">Spending by Category</div>' +
      '<div class="grid" style="grid-template-columns:200px 1fr;gap:20px;align-items:center">' +
      '<div>' + C.donut(donutData, { centerLabel: S.fmtMoney(totals.expense, { compact: true }) }) + "</div>" +
      '<div class="legend">' + legend + "</div></div></div>";

    // Net worth trend
    var nwSeries = S.netWorthSeries(6, ui.month);
    var trendBlock = '<div class="card"><div class="card-title">Net Worth — last 6 months</div>' + C.line(nwSeries) + "</div>";

    // Income vs expense bars
    var ms = S.monthlySeries(6, ui.month);
    var barsBlock = '<div class="card"><div class="card-title">Income vs Expenses</div>' + C.barsIncomeExpense(ms) +
      '<div class="legend" style="flex-direction:row;gap:18px;margin-top:10px"><span class="legend-item"><span class="l"><span class="dot" style="background:var(--income)"></span>Income</span></span>' +
      '<span class="legend-item"><span class="l"><span class="dot" style="background:var(--expense)"></span>Expenses</span></span></div></div>';

    // Upcoming bills
    var bills = upcomingBillsList(5);

    // Goals progress (compact)
    var goalsBlock = "";
    if (st.goals.length) {
      var gitems = st.goals.slice().sort(function (a, b) {
        return (b.target ? b.saved / b.target : 0) - (a.target ? a.saved / a.target : 0);
      }).slice(0, 4).map(function (g) {
        var pct = g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 0;
        var done = g.target > 0 && g.saved >= g.target;
        return '<div style="margin-bottom:12px"><div class="row-between small" style="margin-bottom:5px">' +
          "<span><span class='dot' style='background:" + (g.color || "#4f6ef7") + "'></span>" + escHtml(g.name) + "</span>" +
          '<span class="muted">' + S.fmtMoney(g.saved) + " / " + S.fmtMoney(g.target) + "</span></div>" +
          '<div class="progress"><span style="width:' + pct + '%;background:' + (done ? "var(--income)" : (g.color || "var(--primary)")) + '"></span></div></div>';
      }).join("");
      goalsBlock = '<div class="card"><div class="card-title">Savings Goals</div>' + gitems + "</div>";
    }

    return stats +
      '<div class="grid cols-2">' + trendBlock + donutBlock + "</div>" +
      '<div class="grid cols-2 section-gap">' + barsBlock + bills + "</div>" +
      (goalsBlock ? '<div class="grid section-gap">' + goalsBlock + "</div>" : "");
  };

  function statCard(label, value, cls, sub) {
    return '<div class="card stat"><span class="stat-label">' + label + '</span>' +
      '<span class="stat-value ' + (cls || "") + '">' + value + "</span>" +
      '<span class="stat-sub">' + (sub || "") + "</span></div>";
  }

  function upcomingBillsList(limit) {
    var st = S.getState();
    var items = st.recurring.filter(function (r) { return r.active; })
      .map(function (r) { return Object.assign({ days: S.daysUntil(r.nextDate) }, r); })
      .sort(function (a, b) { return a.days - b.days; })
      .slice(0, limit);
    var rows = items.map(function (r) {
      var c = S.categoryById(r.categoryId);
      var cls = r.days < 0 ? "overdue" : (r.days <= 7 ? "due-soon" : "");
      var when = r.days < 0 ? Math.abs(r.days) + "d overdue" : (r.days === 0 ? "Today" : "in " + r.days + "d");
      return '<tr><td><span class="dot" style="background:' + (c ? c.color : "#888") + '"></span>' + escHtml(r.name) + "</td>" +
        '<td class="' + cls + '">' + when + "</td>" +
        '<td class="amount-cell ' + (r.type === "income" ? "pos" : "neg") + '">' + S.fmtMoney(r.amount, { currency: S.accountCurrency(r.accountId) }) + "</td></tr>";
    }).join("");
    var body = items.length ? '<table class="table"><tbody>' + rows + "</tbody></table>"
      : '<div class="muted small">No recurring items. Add some under "Recurring &amp; Bills".</div>';
    return '<div class="card"><div class="card-title">Upcoming Bills</div>' + body + "</div>";
  }

  // ---------- Transactions ----------
  Views.transactions = function () {
    var st = S.getState();
    var cats = st.categories;
    var catOptions = '<option value="all">All categories</option>' + cats.map(function (c) {
      return '<option value="' + c.id + '"' + (ui.txFilter.category === c.id ? " selected" : "") + ">" + c.name + "</option>";
    }).join("");

    function typeOpt(v, label) { return '<option value="' + v + '"' + (ui.txFilter.type === v ? " selected" : "") + ">" + label + "</option>"; }
    var toolbar = '<div class="toolbar">' +
      '<input class="search" id="tx-search" placeholder="Search notes…" value="' + escAttr(ui.txFilter.search) + '" />' +
      '<select id="tx-type"><option value="all">All types</option>' + typeOpt("income", "Income") + typeOpt("expense", "Expense") + typeOpt("transfer", "Transfer") + typeOpt("adjust", "Adjustment") + "</select>" +
      '<select id="tx-cat">' + catOptions + "</select>" +
      '<button class="ghost-btn" id="tx-transfer" style="width:auto">⇄ Transfer</button>' +
      '<button class="primary-btn" id="tx-add">+ Add</button></div>';

    var list = filteredTransactions().sort(function (a, b) { return b.date < a.date ? -1 : 1; });
    var rows = list.map(function (t) {
      if (t.type === "transfer") {
        var from = S.accountById(t.accountId), to = S.accountById(t.toAccountId);
        return '<tr data-id="' + t.id + '">' +
          "<td>" + t.date + "</td>" +
          '<td><span class="dot" style="background:var(--muted)"></span><span class="muted">⇄ Transfer</span></td>' +
          "<td>" + (t.note ? escHtml(t.note) : '<span class="muted">—</span>') + "</td>" +
          "<td>" + (from ? escHtml(from.name) : "—") + ' <span class="muted">→</span> ' + (to ? escHtml(to.name) : "—") + "</td>" +
          '<td class="amount-cell muted">' + S.fmtMoney(t.amount, { currency: S.accountCurrency(t.accountId) }) + "</td>" +
          '<td class="nowrap"><button class="icon-btn" data-act="edit">✏️</button><button class="icon-btn" data-act="del">🗑️</button></td>' +
          "</tr>";
      }
      if (t.type === "adjust") {
        var aa = S.accountById(t.accountId);
        var up = t.amount >= 0;
        return '<tr data-id="' + t.id + '">' +
          "<td>" + t.date + "</td>" +
          '<td><span class="dot" style="background:var(--accent-4)"></span><span class="muted">📈 Adjustment</span></td>' +
          "<td>" + (t.note ? escHtml(t.note) : '<span class="muted">—</span>') + "</td>" +
          "<td>" + (aa ? escHtml(aa.name) : "—") + "</td>" +
          '<td class="amount-cell ' + (up ? "pos" : "neg") + '">' + (up ? "+" : "−") + S.fmtMoney(Math.abs(t.amount), { currency: S.accountCurrency(t.accountId) }) + "</td>" +
          '<td class="nowrap"><button class="icon-btn" data-act="del">🗑️</button></td>' +
          "</tr>";
      }
      var c = S.categoryById(t.categoryId);
      var a = S.accountById(t.accountId);
      return '<tr data-id="' + t.id + '">' +
        "<td>" + t.date + "</td>" +
        '<td><span class="dot" style="background:' + (c ? c.color : "#888") + '"></span>' + (c ? escHtml(c.name) : "—") + "</td>" +
        "<td>" + (t.note ? escHtml(t.note) : '<span class="muted">—</span>') + "</td>" +
        "<td>" + (a ? escHtml(a.name) : "—") + "</td>" +
        '<td class="amount-cell ' + (t.type === "income" ? "pos" : "neg") + '">' + (t.type === "income" ? "+" : "−") + S.fmtMoney(t.amount, { currency: S.accountCurrency(t.accountId) }) + "</td>" +
        '<td class="nowrap"><button class="icon-btn" data-act="edit">✏️</button><button class="icon-btn" data-act="del">🗑️</button></td>' +
        "</tr>";
    }).join("");

    var table = list.length ?
      '<table class="table"><thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Account</th><th style="text-align:right">Amount</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>"
      : '<div class="empty"><div class="big">🧾</div>No transactions match. Add one to get started.</div>';

    return toolbar + '<div class="card">' + table + "</div>";
  };

  function filteredTransactions() {
    var f = ui.txFilter;
    return S.getState().transactions.filter(function (t) {
      if (f.type !== "all" && t.type !== f.type) return false;
      if (f.category !== "all" && t.categoryId !== f.category) return false;
      if (f.search && (t.note || "").toLowerCase().indexOf(f.search.toLowerCase()) === -1) return false;
      return true;
    });
  }

  // ---------- Budgets ----------
  Views.budgets = function () {
    var st = S.getState();
    var spend = S.spendByCategory(ui.month);
    var expenseCats = st.categories.filter(function (c) { return c.type === "expense"; });

    var totalBudget = st.budgets.reduce(function (s, b) { return s + b.amount; }, 0);
    var totalSpent = Object.keys(spend).reduce(function (s, k) { return s + spend[k]; }, 0);

    var head = '<div class="grid stat-grid">' +
      statCard("Total Budget", S.fmtMoney(totalBudget), null, S.monthLabel(ui.month)) +
      statCard("Spent", S.fmtMoney(totalSpent), "neg", (totalBudget ? (totalSpent / totalBudget * 100).toFixed(0) : 0) + "% used") +
      statCard("Remaining", S.fmtMoney(totalBudget - totalSpent), (totalBudget - totalSpent) >= 0 ? "pos" : "neg", "") +
      "</div>";

    var rows = st.budgets.map(function (b) {
      var c = S.categoryById(b.categoryId);
      var used = spend[b.categoryId] || 0;
      var pct = b.amount > 0 ? Math.min(100, used / b.amount * 100) : 0;
      var over = used > b.amount;
      var barColor = over ? "var(--expense)" : (pct > 80 ? "var(--warn)" : "var(--income)");
      return '<div class="card" style="margin-bottom:12px" data-id="' + b.id + '">' +
        '<div class="row-between" style="margin-bottom:10px">' +
        '<strong><span class="dot" style="background:' + (c ? c.color : "#888") + '"></span>' + (c ? c.name : "Unknown") + "</strong>" +
        '<span>' + S.fmtMoney(used) + ' <span class="muted">/ ' + S.fmtMoney(b.amount) + "</span> " +
        '<button class="icon-btn" data-act="edit-budget">✏️</button><button class="icon-btn" data-act="del-budget">🗑️</button></span></div>' +
        '<div class="progress"><span style="width:' + pct + '%;background:' + barColor + '"></span></div>' +
        '<div class="small ' + (over ? "neg" : "muted") + '" style="margin-top:6px">' +
        (over ? "Over by " + S.fmtMoney(used - b.amount) : S.fmtMoney(b.amount - used) + " remaining") + "</div></div>";
    }).join("");

    var addBtn = '<button class="primary-btn" id="budget-add">+ Set a Budget</button>';
    var body = st.budgets.length ? rows : '<div class="empty"><div class="big">🎯</div>No budgets yet. Set one to track your spending.</div>';

    return head + '<div class="toolbar" style="justify-content:flex-end">' + addBtn + "</div>" + body;
  };

  // ---------- Recurring & Bills ----------
  Views.recurring = function () {
    var st = S.getState();
    var items = st.recurring.slice().sort(function (a, b) { return a.nextDate < b.nextDate ? -1 : 1; });
    var rows = items.map(function (r) {
      var c = S.categoryById(r.categoryId);
      var a = S.accountById(r.accountId);
      var days = S.daysUntil(r.nextDate);
      var cls = !r.active ? "muted" : (days < 0 ? "overdue" : (days <= 7 ? "due-soon" : ""));
      var when = days < 0 ? Math.abs(days) + "d overdue" : (days === 0 ? "Today" : "in " + days + "d");
      var autoPill = r.autoPost ? ' <span class="pill" style="background:var(--primary-soft);color:var(--primary)" title="Posts automatically when due">⚡ Auto</span>' : "";
      return '<tr data-id="' + r.id + '">' +
        "<td><strong>" + escHtml(r.name) + "</strong>" + autoPill + "<br><span class='muted small'>" + (c ? c.name : "—") + " · " + (a ? a.name : "—") + "</span></td>" +
        '<td><span class="pill">' + r.frequency + "</span></td>" +
        "<td>" + r.nextDate + ' <br><span class="small ' + cls + '">' + (r.active ? when : "paused") + "</span></td>" +
        '<td class="amount-cell ' + (r.type === "income" ? "pos" : "neg") + '">' + (r.type === "income" ? "+" : "−") + S.fmtMoney(r.amount, { currency: S.accountCurrency(r.accountId) }) + "</td>" +
        '<td class="nowrap">' +
        '<button class="icon-btn" data-act="auto" title="' + (r.autoPost ? "Auto-posting on — click to turn off" : "Turn on auto-posting") + '" style="' + (r.autoPost ? "color:var(--primary)" : "") + '">⚡</button>' +
        '<button class="icon-btn" data-act="post" title="Log now &amp; advance date">✅</button>' +
        '<button class="icon-btn" data-act="toggle" title="Pause/Resume">' + (r.active ? "⏸️" : "▶️") + "</button>" +
        '<button class="icon-btn" data-act="edit">✏️</button>' +
        '<button class="icon-btn" data-act="del">🗑️</button></td>' +
        "</tr>";
    }).join("");

    var table = items.length ?
      '<table class="table"><thead><tr><th>Name</th><th>Frequency</th><th>Next due</th><th style="text-align:right">Amount</th><th></th></tr></thead><tbody>' + rows + "</tbody></table>"
      : '<div class="empty"><div class="big">🔁</div>No recurring items yet.</div>';

    return '<div class="toolbar" style="justify-content:space-between">' +
      '<span class="muted small">Use ✅ to log a payment now, or ⚡ to auto-post it on the due date.</span>' +
      '<button class="primary-btn" id="rec-add">+ Add Recurring</button></div>' +
      '<div class="card">' + table + "</div>";
  };

  // ---------- Accounts ----------
  Views.accounts = function () {
    var st = S.getState();
    var base = S.baseCurrency();

    function acctRow(a) {
      var bal = S.accountBalance(a.id);
      var cur = a.currency || base;
      var count = st.transactions.filter(function (t) { return t.accountId === a.id || t.toAccountId === a.id; }).length;
      var baseEq = cur !== base ? '<div class="small muted">≈ ' + S.fmtMoney(S.convert(bal, cur, base)) + " " + base + "</div>" : "";
      return '<tr data-id="' + a.id + '">' +
        "<td><strong>" + escHtml(a.name) + "</strong></td>" +
        '<td><span class="pill">' + escHtml(a.type) + '</span> <span class="pill">' + cur + "</span></td>" +
        "<td>" + count + " transactions</td>" +
        '<td class="amount-cell ' + (bal >= 0 ? "pos" : "neg") + '">' + S.fmtMoney(bal, { currency: cur }) + baseEq + "</td>" +
        '<td class="nowrap">' +
        '<button class="icon-btn" data-act="adjust-value" title="Update current value / balance">📈</button>' +
        '<button class="icon-btn" data-act="edit" title="Edit">✏️</button>' +
        '<button class="icon-btn" data-act="del" title="Delete">🗑️</button></td>' +
        "</tr>";
    }

    function section(title, list, total, totalCls) {
      if (!list.length) return "";
      return '<div class="card section-gap"><div class="row-between" style="margin-bottom:8px">' +
        '<div class="card-title" style="margin:0">' + title + "</div>" +
        '<strong class="' + totalCls + '">' + S.fmtMoney(total) + " " + base + "</strong></div>" +
        '<table class="table"><thead><tr><th>Account</th><th>Type</th><th>Activity</th><th style="text-align:right">Balance</th><th></th></tr></thead><tbody>' +
        list.map(acctRow).join("") + "</tbody></table></div>";
    }

    var assets = st.accounts.filter(function (a) { return !S.isLiability(a); });
    var liabs = st.accounts.filter(function (a) { return S.isLiability(a); });
    var aTotal = S.assetsTotal(), lTotal = S.liabilitiesTotal(), nw = S.totalNetWorth();

    var summary = '<div class="grid stat-grid">' +
      statCard("Net Worth", S.fmtMoney(nw), nw >= 0 ? "pos" : "neg", "Assets − Liabilities, in " + base) +
      statCard("Assets", S.fmtMoney(aTotal), "pos", assets.length + " account(s)") +
      statCard("Liabilities", S.fmtMoney(Math.abs(lTotal)), "neg", liabs.length + " account(s)") +
      "</div>";

    return summary +
      '<div class="toolbar" style="justify-content:flex-end"><button class="primary-btn" id="acct-add">+ Add Account</button></div>' +
      section("Assets", assets, aTotal, "pos") +
      section("Liabilities", liabs, Math.abs(lTotal), "neg") +
      (st.accounts.length ? "" : '<div class="empty"><div class="big">🏦</div>No accounts yet.</div>');
  };

  // ---------- Categories ----------
  Views.categories = function () {
    var st = S.getState();
    function usage(catId) {
      var n = st.transactions.filter(function (t) { return t.categoryId === catId; }).length;
      return n;
    }
    function section(type, title) {
      var cats = st.categories.filter(function (c) { return c.type === type; });
      var rows = cats.map(function (c) {
        return '<tr data-id="' + c.id + '">' +
          '<td><span class="dot" style="background:' + c.color + '"></span><strong>' + escHtml(c.name) + "</strong></td>" +
          '<td class="muted">' + usage(c.id) + " transactions</td>" +
          '<td class="nowrap" style="text-align:right"><button class="icon-btn" data-act="edit-cat">✏️</button><button class="icon-btn" data-act="del-cat">🗑️</button></td>' +
          "</tr>";
      }).join("");
      var body = cats.length ? '<table class="table"><tbody>' + rows + "</tbody></table>" : '<div class="muted small">No ' + type + " categories.</div>";
      return '<div class="card"><div class="card-title">' + title + "</div>" + body + "</div>";
    }
    return '<div class="toolbar" style="justify-content:space-between">' +
      '<span class="muted small">Categories drive your transactions, budgets and charts. Pick a color for each.</span>' +
      '<button class="primary-btn" id="cat-add">+ Add Category</button></div>' +
      '<div class="grid cols-2">' + section("income", "Income Categories") + section("expense", "Expense Categories") + "</div>";
  };

  // ---------- Goals ----------
  Views.goals = function () {
    var st = S.getState();
    var totalTarget = st.goals.reduce(function (s, g) { return s + (g.target || 0); }, 0);
    var totalSaved = st.goals.reduce(function (s, g) { return s + (g.saved || 0); }, 0);

    var head = '<div class="grid stat-grid">' +
      statCard("Goals", String(st.goals.length), null, "Active savings goals") +
      statCard("Saved", S.fmtMoney(totalSaved), "pos", (totalTarget ? (totalSaved / totalTarget * 100).toFixed(0) : 0) + "% of target") +
      statCard("Target", S.fmtMoney(totalTarget), null, "Combined goal value") +
      "</div>";

    var cards = st.goals.map(function (g) {
      var pct = g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 0;
      var done = g.saved >= g.target && g.target > 0;
      var remaining = Math.max(0, g.target - g.saved);
      var dateInfo = "";
      if (g.targetDate) {
        var days = S.daysUntil(g.targetDate);
        if (done) dateInfo = '<span class="pos">🎉 Goal reached!</span>';
        else if (days < 0) dateInfo = '<span class="overdue">Target date passed</span>';
        else {
          var months = Math.max(1, days / 30.44);
          dateInfo = "Need " + S.fmtMoney(remaining / months) + "/mo · " + days + "d left (" + g.targetDate + ")";
        }
      } else if (done) dateInfo = '<span class="pos">🎉 Goal reached!</span>';
      else dateInfo = S.fmtMoney(remaining) + " to go";

      return '<div class="card" style="margin-bottom:12px" data-id="' + g.id + '">' +
        '<div class="row-between" style="margin-bottom:10px">' +
        '<strong><span class="dot" style="background:' + (g.color || "#4f6ef7") + '"></span>' + escHtml(g.name) + "</strong>" +
        '<span>' + S.fmtMoney(g.saved) + ' <span class="muted">/ ' + S.fmtMoney(g.target) + "</span> " +
        '<button class="icon-btn" data-act="fund-goal" title="Add or remove funds">💵</button>' +
        '<button class="icon-btn" data-act="edit-goal">✏️</button><button class="icon-btn" data-act="del-goal">🗑️</button></span></div>' +
        '<div class="progress"><span style="width:' + pct + '%;background:' + (done ? "var(--income)" : (g.color || "var(--primary)")) + '"></span></div>' +
        '<div class="small ' + (done ? "pos" : "muted") + '" style="margin-top:6px">' + pct.toFixed(0) + "% · " + dateInfo + "</div></div>";
    }).join("");

    var body = st.goals.length ? cards : '<div class="empty"><div class="big">🏆</div>No goals yet. Set one to start saving toward something.</div>';
    return head + '<div class="toolbar" style="justify-content:flex-end"><button class="primary-btn" id="goal-add">+ Add Goal</button></div>' + body;
  };

  // ---------- Reports ----------
  function reportRange(period) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    function iso(d) { return d.toISOString().slice(0, 10); }
    if (period === "3m") { var s = new Date(y, m - 2, 1); return { start: iso(s), end: iso(new Date(y, m + 1, 0)), label: "Last 3 months" }; }
    if (period === "year") return { start: y + "-01-01", end: y + "-12-31", label: "This year (" + y + ")" };
    if (period === "all") return { start: "0000-01-01", end: "9999-12-31", label: "All time" };
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)), label: S.monthLabel(S.monthKey(S.todayISO())) };  // this month
  }

  Views.reports = function () {
    var st = S.getState();
    var period = ui.reportPeriod || "month";
    var range = reportRange(period);
    var txs = S.transactionsInRange(range.start, range.end);
    var totals = S.totalsFor(txs);
    var base = S.baseCurrency();
    var savingsRate = totals.income > 0 ? (totals.net / totals.income * 100) : 0;

    function periodBtn(v, label) { return '<button class="' + (period === v ? "active" : "") + '" data-period="' + v + '">' + label + "</button>"; }
    var selector = '<div class="toolbar no-print" style="justify-content:space-between">' +
      '<div class="seg" id="report-period" style="max-width:520px">' +
      periodBtn("month", "This month") + periodBtn("3m", "Last 3 months") + periodBtn("year", "This year") + periodBtn("all", "All time") + "</div>" +
      '<button class="primary-btn" id="report-print">🖨️ Save as PDF</button></div>';

    var header = '<div class="report-head"><h2 style="margin:0">Financial Report</h2>' +
      '<div class="muted small">' + escHtml(range.label) + " · all values in " + base +
      " · generated " + new Date().toLocaleString() + "</div></div>";

    var stats = '<div class="grid stat-grid">' +
      statCard("Income", S.fmtMoney(totals.income), "pos", range.label) +
      statCard("Expenses", S.fmtMoney(totals.expense), "neg", range.label) +
      statCard("Net", S.fmtMoney(totals.net), totals.net >= 0 ? "pos" : "neg", savingsRate.toFixed(0) + "% savings rate") +
      statCard("Net Worth", S.fmtMoney(S.totalNetWorth()), S.totalNetWorth() >= 0 ? null : "neg",
        "Assets " + S.fmtMoney(S.assetsTotal(), { compact: true }) + " − Debts " + S.fmtMoney(Math.abs(S.liabilitiesTotal()), { compact: true })) +
      "</div>";

    function breakdown(title, map, total) {
      var keys = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
      if (!keys.length) return '<div class="card"><div class="card-title">' + title + '</div><div class="muted small">No data for this period.</div></div>';
      var rows = keys.map(function (k) {
        var c = S.categoryById(k);
        var pct = total > 0 ? (map[k] / total * 100) : 0;
        return "<tr><td><span class='dot' style='background:" + (c ? c.color : "#888") + "'></span>" + (c ? escHtml(c.name) : "—") + "</td>" +
          '<td class="muted">' + pct.toFixed(1) + "%</td>" +
          '<td class="amount-cell">' + S.fmtMoney(map[k]) + "</td></tr>";
      }).join("");
      return '<div class="card"><div class="card-title">' + title + '</div><table class="table"><tbody>' + rows + "</tbody></table></div>";
    }
    var breakdowns = '<div class="grid cols-2 section-gap">' +
      breakdown("Expenses by Category", S.spendByCategoryFor(txs), totals.expense) +
      breakdown("Income by Category", S.incomeByCategoryFor(txs), totals.income) + "</div>";

    // Account balances, grouped by assets / liabilities with subtotals.
    function acctRowsFor(list) {
      return list.map(function (a) {
        var cur = a.currency || base, bal = S.accountBalance(a.id);
        return "<tr><td>" + escHtml(a.name) + ' <span class="pill">' + escHtml(a.type) + "</span></td>" +
          '<td class="amount-cell">' + S.fmtMoney(bal, { currency: cur }) + "</td>" +
          '<td class="amount-cell muted">' + S.fmtMoney(S.convert(bal, cur, base)) + " " + base + "</td></tr>";
      }).join("");
    }
    function subtotal(label, val, cls) {
      return '<tr><td><strong>' + label + '</strong></td><td></td><td class="amount-cell ' + cls + '"><strong>' + S.fmtMoney(val) + " " + base + "</strong></td></tr>";
    }
    var assetList = st.accounts.filter(function (a) { return !S.isLiability(a); });
    var liabList = st.accounts.filter(function (a) { return S.isLiability(a); });
    var accountsCard = '<div class="card"><div class="card-title">Net Worth — Accounts</div><table class="table">' +
      '<thead><tr><th>Account</th><th style="text-align:right">Balance</th><th style="text-align:right">In ' + base + "</th></tr></thead><tbody>" +
      acctRowsFor(assetList) + subtotal("Total assets", S.assetsTotal(), "pos") +
      (liabList.length ? acctRowsFor(liabList) + subtotal("Total liabilities", S.liabilitiesTotal(), "neg") : "") +
      subtotal("Net worth", S.totalNetWorth(), S.totalNetWorth() >= 0 ? "pos" : "neg") +
      "</tbody></table></div>";

    // Goals snapshot
    var goalsCard = "";
    if (st.goals.length) {
      var grows = st.goals.map(function (g) {
        var pct = g.target > 0 ? Math.min(100, g.saved / g.target * 100) : 0;
        return "<tr><td><span class='dot' style='background:" + (g.color || "#4f6ef7") + "'></span>" + escHtml(g.name) + "</td>" +
          '<td class="muted">' + pct.toFixed(0) + "%</td>" +
          '<td class="amount-cell">' + S.fmtMoney(g.saved) + " / " + S.fmtMoney(g.target) + "</td></tr>";
      }).join("");
      goalsCard = '<div class="card"><div class="card-title">Savings Goals</div><table class="table"><tbody>' + grows + "</tbody></table></div>";
    }

    return selector + '<div id="printable">' + header + stats + breakdowns +
      '<div class="grid cols-2 section-gap">' + accountsCard + goalsCard + "</div></div>";
  };

  // ---------- Settings ----------
  Views.settings = function () {
    var st = S.getState();
    var currencies = ["USD", "EUR", "GBP", "NGN", "JPY", "CAD", "AUD", "INR", "ZAR", "BRL", "CNY", "CHF", "MXN", "KES"];
    var base = S.baseCurrency();
    var curOpts = currencies.map(function (c) { return '<option value="' + c + '"' + (base === c ? " selected" : "") + ">" + c + "</option>"; }).join("");

    // Currencies actually in use by accounts, excluding base, plus any with a stored rate.
    var used = {};
    st.accounts.forEach(function (a) { if (a.currency && a.currency !== base) used[a.currency] = true; });
    Object.keys(st.settings.rates || {}).forEach(function (c) { if (c !== base) used[c] = true; });
    var rateRows = Object.keys(used).sort().map(function (c) {
      return '<div class="form-row"><label>1 ' + c + " = ? " + base + '</label><input type="number" step="0.0001" min="0" class="rate-input" data-cur="' + c + '" value="' + (S.rateOf(c)) + '" /></div>';
    }).join("") || '<div class="muted small">No foreign-currency accounts yet. Add an account in a different currency to set its rate.</div>';

    var notifyCard = buildNotifyCard();

    return '<div class="grid cols-2">' +
      '<div class="card"><div class="card-title">Preferences</div>' +
      '<div class="form-row"><label>Base currency (for reports &amp; net worth)</label><select id="set-currency">' + curOpts + "</select></div>" +
      '<div class="form-row"><label>Notify about bills due within (days)</label><input id="set-leaddays" type="number" min="0" max="90" value="' + S.alertLeadDays() + '" /></div>' +
      '<div class="form-row"><label>Theme</label><div class="seg"><button id="theme-light" class="' + (st.settings.theme !== "dark" ? "active" : "") + '">☀️ Light</button><button id="theme-dark" class="' + (st.settings.theme === "dark" ? "active" : "") + '">🌙 Dark</button></div></div>' +
      "</div>" +
      '<div class="card"><div class="card-title">Exchange Rates</div>' +
      '<p class="muted small" style="margin-bottom:14px">Used to convert other currencies into ' + base + ' for net worth and reports. Update these manually as rates change.</p>' +
      rateRows +
      "</div>" +
      notifyCard +
      '<div class="card"><div class="card-title">Your Data</div>' +
      '<p class="muted small" style="margin-bottom:14px">Everything is stored privately in this browser. Export regularly to keep a backup.</p>' +
      '<div class="form-row"><button class="ghost-btn" id="export-data">⬇️ Export backup (JSON)</button></div>' +
      '<div class="form-row"><button class="ghost-btn" id="import-data">⬆️ Import backup (JSON)</button><input type="file" id="import-file" accept="application/json" style="display:none" /></div>' +
      '<div class="form-row"><button class="ghost-btn" id="load-demo">✨ Load demo data</button></div>' +
      '<div class="form-row"><button class="danger-btn" id="reset-data" style="width:100%">⚠️ Erase all data</button></div>' +
      "</div>" +
      '<div class="card"><div class="card-title">Transactions CSV</div>' +
      '<p class="muted small" style="margin-bottom:14px">Bulk-import transactions, or export them as a spreadsheet. Columns: <code>date, type, amount, category, account, note</code>. Missing categories/accounts are created automatically.</p>' +
      '<div class="form-row"><button class="ghost-btn" id="import-csv">⬆️ Import transactions (CSV)</button><input type="file" id="import-csv-file" accept=".csv,text/csv" style="display:none" /></div>' +
      '<div class="form-row"><button class="ghost-btn" id="export-csv">⬇️ Export transactions (CSV)</button></div>' +
      '<div class="form-row"><button class="ghost-btn" id="download-template">📄 Download CSV template</button></div>' +
      "</div></div>";
  };

  function buildNotifyCard() {
    var st = S.getState();
    var head = '<div class="card"><div class="card-title">Desktop Notifications</div>';
    if (!notifySupported()) {
      return head + '<p class="muted small">This browser doesn\'t support desktop notifications.</p></div>';
    }
    var perm = notifyPermission();
    var body;
    if (perm === "denied") {
      body = '<p class="muted small">Notifications are <strong>blocked</strong> for this site. Re-enable them in your browser\'s site settings (look for the 🔒/ⓘ icon in the address bar), then reload.</p>';
    } else if (perm === "granted") {
      var on = !!st.settings.notifyEnabled;
      body = '<p class="muted small" style="margin-bottom:12px">Get a desktop alert when a bill is due or overdue (within your ' + S.alertLeadDays() + '-day window).</p>' +
        '<label class="check-row"><input type="checkbox" id="notify-toggle"' + (on ? " checked" : "") + ' /> <span>Enable bill notifications <span class="muted small">— ' + (on ? "on" : "off") + "</span></span></label>" +
        '<div class="form-row" style="margin-top:14px"><button class="ghost-btn" id="notify-test">🔔 Send a test notification</button></div>' +
        '<p class="muted small">Notifications appear while FinTrack is open or when you return to the tab. (Alerts when the browser is fully closed would need a server, which this app doesn\'t use.)</p>';
    } else {
      body = '<p class="muted small" style="margin-bottom:12px">Allow desktop notifications to be reminded about due and overdue bills.</p>' +
        '<div class="form-row"><button class="primary-btn" id="notify-enable" style="width:100%">Enable notifications</button></div>';
    }
    return head + body + "</div>";
  }

  /* ============================================================
     MODALS / FORMS
     ============================================================ */
  function categorySelect(id, selectedId, typeFilter) {
    var cats = S.getState().categories.filter(function (c) { return !typeFilter || c.type === typeFilter; });
    return '<select id="' + id + '">' + cats.map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === selectedId ? " selected" : "") + ">" + c.name + "</option>";
    }).join("") + "</select>";
  }
  function accountSelect(id, selectedId) {
    return '<select id="' + id + '">' + S.getState().accounts.map(function (a) {
      return '<option value="' + a.id + '"' + (a.id === selectedId ? " selected" : "") + ">" + a.name + "</option>";
    }).join("") + "</select>";
  }

  function txModal(existing) {
    var t = existing || { type: "expense", date: S.todayISO(), amount: "", note: "", accountId: S.getState().accounts[0] && S.getState().accounts[0].id };
    openModal(
      "<h2>" + (existing ? "Edit" : "Add") + " Transaction</h2>" +
      '<div class="form-row"><div class="seg"><button id="t-expense" class="' + (t.type === "expense" ? "active" : "") + '">Expense</button><button id="t-income" class="' + (t.type === "income" ? "active" : "") + '">Income</button></div></div>' +
      '<div class="form-grid-2"><div class="form-row"><label>Amount</label><input id="t-amount" type="number" step="0.01" min="0" value="' + (t.amount || "") + '" /></div>' +
      '<div class="form-row"><label>Date</label><input id="t-date" type="date" value="' + t.date + '" /></div></div>' +
      '<div class="form-row"><label>Category</label><span id="t-cat-wrap">' + categorySelect("t-cat", t.categoryId, t.type) + "</span></div>" +
      '<div class="form-row"><label>Account</label>' + accountSelect("t-account", t.accountId) + "</div>" +
      '<div class="form-row"><label>Note (optional)</label><input id="t-note" value="' + escAttr(t.note || "") + '" placeholder="e.g. Groceries at market" /></div>' +
      modalActions()
    );
    var type = t.type;
    function setType(newType) {
      type = newType;
      $("#t-expense").classList.toggle("active", newType === "expense");
      $("#t-income").classList.toggle("active", newType === "income");
      $("#t-cat-wrap").innerHTML = categorySelect("t-cat", null, newType);
    }
    $("#t-expense").onclick = function () { setType("expense"); };
    $("#t-income").onclick = function () { setType("income"); };
    $("#modal-save").onclick = function () {
      var amount = parseFloat($("#t-amount").value);
      if (!(amount > 0)) return toast("Enter a valid amount.", "error");
      var rec = {
        id: existing ? existing.id : S.uid(),
        type: type,
        amount: amount,
        date: $("#t-date").value || S.todayISO(),
        categoryId: $("#t-cat").value,
        accountId: $("#t-account").value,
        note: $("#t-note").value.trim()
      };
      var st = S.getState();
      if (existing) {
        var i = st.transactions.findIndex(function (x) { return x.id === existing.id; });
        st.transactions[i] = rec;
      } else {
        st.transactions.push(rec);
      }
      S.save();
      closeModal();
      toast(existing ? "Transaction updated." : "Transaction added.", "success");
      render();
    };
  }

  function budgetModal(existing) {
    var st = S.getState();
    var used = st.budgets.map(function (b) { return b.categoryId; });
    var avail = st.categories.filter(function (c) { return c.type === "expense" && (existing ? true : used.indexOf(c.id) === -1); });
    if (!avail.length && !existing) { toast("All expense categories already have budgets.", "error"); return; }
    var b = existing || { amount: "", categoryId: avail[0] && avail[0].id };
    var opts = avail.map(function (c) { return '<option value="' + c.id + '"' + (c.id === b.categoryId ? " selected" : "") + ">" + c.name + "</option>"; }).join("");
    openModal(
      "<h2>" + (existing ? "Edit" : "Set") + " Budget</h2>" +
      '<div class="form-row"><label>Category</label><select id="b-cat"' + (existing ? " disabled" : "") + ">" + opts + "</select></div>" +
      '<div class="form-row"><label>Monthly limit</label><input id="b-amount" type="number" step="0.01" min="0" value="' + (b.amount || "") + '" /></div>' +
      modalActions()
    );
    $("#modal-save").onclick = function () {
      var amount = parseFloat($("#b-amount").value);
      if (!(amount > 0)) return toast("Enter a valid amount.", "error");
      if (existing) {
        var i = st.budgets.findIndex(function (x) { return x.id === existing.id; });
        st.budgets[i].amount = amount;
      } else {
        st.budgets.push({ id: S.uid(), categoryId: $("#b-cat").value, amount: amount });
      }
      S.save(); closeModal(); toast("Budget saved.", "success"); render();
    };
  }

  function recurringModal(existing) {
    var st = S.getState();
    var r = existing || { name: "", type: "expense", amount: "", frequency: "monthly", nextDate: S.todayISO(), accountId: st.accounts[0] && st.accounts[0].id, active: true };
    var freqs = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];
    var freqOpts = freqs.map(function (f) { return '<option value="' + f + '"' + (r.frequency === f ? " selected" : "") + ">" + f + "</option>"; }).join("");
    openModal(
      "<h2>" + (existing ? "Edit" : "Add") + " Recurring Item</h2>" +
      '<div class="form-row"><label>Name</label><input id="r-name" value="' + escAttr(r.name) + '" placeholder="e.g. Rent, Netflix, Salary" /></div>' +
      '<div class="form-row"><div class="seg"><button id="r-expense" class="' + (r.type === "expense" ? "active" : "") + '">Expense</button><button id="r-income" class="' + (r.type === "income" ? "active" : "") + '">Income</button></div></div>' +
      '<div class="form-grid-2"><div class="form-row"><label>Amount</label><input id="r-amount" type="number" step="0.01" min="0" value="' + (r.amount || "") + '" /></div>' +
      '<div class="form-row"><label>Frequency</label><select id="r-freq">' + freqOpts + "</select></div></div>" +
      '<div class="form-grid-2"><div class="form-row"><label>Next due date</label><input id="r-date" type="date" value="' + r.nextDate + '" /></div>' +
      '<div class="form-row"><label>Account</label>' + accountSelect("r-account", r.accountId) + "</div></div>" +
      '<div class="form-row"><label>Category</label><span id="r-cat-wrap">' + categorySelect("r-cat", r.categoryId, r.type) + "</span></div>" +
      '<label class="check-row"><input type="checkbox" id="r-auto"' + (r.autoPost ? " checked" : "") + ' /> <span>Auto-post on the due date <span class="muted small">— the app logs it for you (and catches up any missed periods on launch)</span></span></label>' +
      modalActions()
    );
    var type = r.type;
    function setType(nt) { type = nt; $("#r-expense").classList.toggle("active", nt === "expense"); $("#r-income").classList.toggle("active", nt === "income"); $("#r-cat-wrap").innerHTML = categorySelect("r-cat", null, nt); }
    $("#r-expense").onclick = function () { setType("expense"); };
    $("#r-income").onclick = function () { setType("income"); };
    $("#modal-save").onclick = function () {
      var name = $("#r-name").value.trim();
      var amount = parseFloat($("#r-amount").value);
      if (!name) return toast("Enter a name.", "error");
      if (!(amount > 0)) return toast("Enter a valid amount.", "error");
      var rec = {
        id: existing ? existing.id : S.uid(),
        name: name, type: type, amount: amount,
        frequency: $("#r-freq").value,
        nextDate: $("#r-date").value || S.todayISO(),
        accountId: $("#r-account").value,
        categoryId: $("#r-cat").value,
        active: existing ? existing.active : true,
        autoPost: $("#r-auto").checked
      };
      if (existing) { var i = st.recurring.findIndex(function (x) { return x.id === existing.id; }); st.recurring[i] = rec; }
      else st.recurring.push(rec);
      S.save();
      // If auto-post is on and it's already due, catch up immediately.
      var posted = rec.autoPost ? S.catchUpRecurring(rec, S.todayISO()) : 0;
      if (posted) S.save();
      closeModal();
      toast(posted ? "Saved — auto-posted " + posted + " due payment(s)." : "Recurring item saved.", "success");
      buildMonthPicker(); render();
    };
  }

  var CURRENCIES = ["USD", "EUR", "GBP", "NGN", "JPY", "CAD", "AUD", "INR", "ZAR", "BRL", "CNY", "CHF", "MXN", "KES"];
  var ACCOUNT_TYPES = ["Bank", "Cash", "Savings", "Investment", "Credit Card", "Loan", "Mortgage", "Other"];
  function accountModal(existing) {
    var st = S.getState();
    var base = S.baseCurrency();
    var a = existing || { name: "", type: "Bank", openingBalance: 0, currency: base, liability: false };
    var isLiab = existing ? S.isLiability(a) : false;
    var typeOpts = ACCOUNT_TYPES.map(function (t) { return '<option' + (a.type === t ? " selected" : "") + ">" + t + "</option>"; }).join("");
    var curList = CURRENCIES.slice();
    if (curList.indexOf(base) === -1) curList.unshift(base);
    var curOpts = curList.map(function (c) { return '<option value="' + c + '"' + ((a.currency || base) === c ? " selected" : "") + ">" + c + (c === base ? " (base)" : "") + "</option>"; }).join("");
    // Liabilities store a negative balance; show the magnitude ("amount owed") in the field.
    var balValue = isLiab ? Math.abs(Number(a.openingBalance) || 0) : (a.openingBalance || 0);
    openModal(
      "<h2>" + (existing ? "Edit" : "Add") + " Account</h2>" +
      '<div class="form-row"><label>Name</label><input id="a-name" value="' + escAttr(a.name) + '" placeholder="e.g. Main Checking, Visa, Car Loan" /></div>' +
      '<div class="form-grid-2"><div class="form-row"><label>Type</label><select id="a-type">' + typeOpts + "</select></div>" +
      '<div class="form-row"><label>Currency</label><select id="a-currency">' + curOpts + "</select></div></div>" +
      '<label class="check-row"><input type="checkbox" id="a-liability"' + (isLiab ? " checked" : "") + ' /> <span>This is a <strong>liability</strong> (money you owe — credit card, loan, mortgage)</span></label>' +
      '<div class="form-row" style="margin-top:14px"><label id="a-bal-label">' + (isLiab ? "Current amount owed" : "Opening / current balance") + '</label><input id="a-bal" type="number" step="0.01" value="' + balValue + '" /></div>' +
      modalActions()
    );
    function syncLiabilityUI() {
      var owed = $("#a-liability").checked;
      $("#a-bal-label").textContent = owed ? "Current amount owed" : "Opening / current balance";
    }
    // Default the liability flag from the chosen type (until the user overrides it).
    $("#a-type").onchange = function () {
      if (!existing) { $("#a-liability").checked = S.isLiabilityType($("#a-type").value); syncLiabilityUI(); }
    };
    $("#a-liability").onchange = syncLiabilityUI;
    $("#modal-save").onclick = function () {
      var name = $("#a-name").value.trim();
      if (!name) return toast("Enter a name.", "error");
      var currency = $("#a-currency").value;
      var liability = $("#a-liability").checked;
      var entered = parseFloat($("#a-bal").value) || 0;
      var opening = liability ? -Math.abs(entered) : entered;   // liabilities stored negative
      var rec = { id: existing ? existing.id : S.uid(), name: name, type: $("#a-type").value, openingBalance: opening, currency: currency, liability: liability };
      if (existing) { var i = st.accounts.findIndex(function (x) { return x.id === existing.id; }); st.accounts[i] = rec; }
      else st.accounts.push(rec);
      // Register a placeholder rate so the user can set it in Settings.
      if (currency !== S.baseCurrency() && !(st.settings.rates && st.settings.rates[currency])) {
        st.settings.rates = st.settings.rates || {};
        st.settings.rates[currency] = 1;
      }
      S.save(); closeModal();
      toast(currency !== S.baseCurrency() ? "Account saved — set its exchange rate in Settings." : "Account saved.", "success");
      buildMonthPicker(); render();
    };
  }

  // Update an account's current value (mark-to-market for investments, or the
  // outstanding balance on a loan). Records a non-cashflow "adjust" transaction
  // for the difference so net worth stays accurate without affecting income/expense.
  function adjustValueModal(acct) {
    var cur = acct.currency || S.baseCurrency();
    var current = S.accountBalance(acct.id);
    var liab = S.isLiability(acct);
    var shownCurrent = liab ? Math.abs(current) : current;
    openModal(
      "<h2>Update “" + escHtml(acct.name) + "”</h2>" +
      '<p class="muted small" style="margin-bottom:14px">Current ' + (liab ? "amount owed" : "value") + ": <strong>" + S.fmtMoney(shownCurrent, { currency: cur }) + "</strong>. " +
      "Enter the new figure — we'll record the difference as a balance adjustment (it won't count as income or spending).</p>" +
      '<div class="form-row"><label>New ' + (liab ? "amount owed" : "current value") + " (" + cur + ')</label><input id="av-value" type="number" step="0.01" value="' + shownCurrent + '" /></div>' +
      '<div class="form-row"><label>Date</label><input id="av-date" type="date" value="' + S.todayISO() + '" /></div>' +
      '<div class="small muted" id="av-hint" style="margin-bottom:4px"></div>' +
      modalActions()
    );
    function newTarget() { var v = parseFloat($("#av-value").value); if (isNaN(v)) return null; return liab ? -Math.abs(v) : v; }
    function updateHint() {
      var target = newTarget(); if (target == null) { $("#av-hint").textContent = ""; return; }
      var delta = target - current;
      $("#av-hint").textContent = (delta === 0 ? "No change." :
        (delta > 0 ? "Increase of " : "Decrease of ") + S.fmtMoney(Math.abs(delta), { currency: cur }));
    }
    $("#av-value").oninput = updateHint; updateHint();
    $("#modal-save").onclick = function () {
      var target = newTarget();
      if (target == null) return toast("Enter a valid number.", "error");
      var delta = target - current;
      if (delta === 0) { closeModal(); return; }
      S.getState().transactions.push({
        id: S.uid(), type: "adjust", amount: delta, accountId: acct.id,
        date: $("#av-date").value || S.todayISO(), note: "Balance adjustment"
      });
      S.save(); closeModal();
      toast("Updated " + acct.name + " to " + S.fmtMoney(liab ? Math.abs(target) : target, { currency: cur }) + ".", "success");
      buildMonthPicker(); render();
    };
  }

  function goalModal(existing) {
    var st = S.getState();
    var g = existing || { name: "", target: "", saved: 0, targetDate: "", color: PALETTE[Math.floor(Math.random() * PALETTE.length)] };
    openModal(
      "<h2>" + (existing ? "Edit" : "Add") + " Goal</h2>" +
      '<div class="form-row"><label>Name</label><input id="g-name" value="' + escAttr(g.name) + '" placeholder="e.g. Emergency Fund" /></div>' +
      '<div class="form-grid-2"><div class="form-row"><label>Target amount (' + S.baseCurrency() + ')</label><input id="g-target" type="number" step="0.01" min="0" value="' + (g.target || "") + '" /></div>' +
      '<div class="form-row"><label>Already saved</label><input id="g-saved" type="number" step="0.01" min="0" value="' + (g.saved || 0) + '" /></div></div>' +
      '<div class="form-grid-2"><div class="form-row"><label>Target date (optional)</label><input id="g-date" type="date" value="' + (g.targetDate || "") + '" /></div>' +
      '<div class="form-row"><label>Color</label><input id="g-color" type="color" value="' + (g.color || "#4f6ef7") + '" style="height:42px;padding:4px" /></div></div>' +
      modalActions()
    );
    $("#modal-save").onclick = function () {
      var name = $("#g-name").value.trim();
      var target = parseFloat($("#g-target").value);
      if (!name) return toast("Enter a name.", "error");
      if (!(target > 0)) return toast("Enter a target amount.", "error");
      var rec = { id: existing ? existing.id : S.uid(), name: name, target: target, saved: parseFloat($("#g-saved").value) || 0, targetDate: $("#g-date").value || "", color: $("#g-color").value };
      if (existing) { var i = st.goals.findIndex(function (x) { return x.id === existing.id; }); st.goals[i] = rec; }
      else st.goals.push(rec);
      S.save(); closeModal(); toast("Goal saved.", "success"); render();
    };
  }

  function goalFundsModal(goal) {
    openModal(
      "<h2>Update “" + escHtml(goal.name) + "”</h2>" +
      '<p class="muted small" style="margin-bottom:14px">Currently saved: <strong>' + S.fmtMoney(goal.saved) + "</strong> of " + S.fmtMoney(goal.target) + ".</p>" +
      '<div class="form-row"><label>Amount to add (use a negative number to withdraw)</label><input id="gf-amount" type="number" step="0.01" value="" placeholder="e.g. 250" /></div>' +
      modalActions()
    );
    $("#modal-save").onclick = function () {
      var delta = parseFloat($("#gf-amount").value);
      if (isNaN(delta) || delta === 0) return toast("Enter an amount.", "error");
      var st = S.getState();
      var i = st.goals.findIndex(function (x) { return x.id === goal.id; });
      st.goals[i].saved = Math.max(0, (st.goals[i].saved || 0) + delta);
      S.save(); closeModal(); toast((delta > 0 ? "Added " : "Withdrew ") + S.fmtMoney(Math.abs(delta)) + ".", "success"); render();
    };
  }

  function transferModal(existing) {
    var st = S.getState();
    if (st.accounts.length < 2) { toast("You need at least two accounts to transfer.", "error"); return; }
    var t = existing || { amount: "", date: S.todayISO(), note: "", accountId: st.accounts[0].id, toAccountId: st.accounts[1].id };
    function opts(id, sel) {
      return '<select id="' + id + '">' + st.accounts.map(function (a) {
        return '<option value="' + a.id + '"' + (a.id === sel ? " selected" : "") + ">" + escHtml(a.name) + "</option>";
      }).join("") + "</select>";
    }
    openModal(
      "<h2>" + (existing ? "Edit" : "New") + " Transfer</h2>" +
      '<div class="form-grid-2"><div class="form-row"><label>From account</label>' + opts("tr-from", t.accountId) + "</div>" +
      '<div class="form-row"><label>To account</label>' + opts("tr-to", t.toAccountId) + "</div></div>" +
      '<div class="form-grid-2"><div class="form-row"><label>Amount (in source currency)</label><input id="tr-amount" type="number" step="0.01" min="0" value="' + (t.amount || "") + '" /></div>' +
      '<div class="form-row"><label>Date</label><input id="tr-date" type="date" value="' + t.date + '" /></div></div>' +
      '<div class="form-row"><label>Note (optional)</label><input id="tr-note" value="' + escAttr(t.note || "") + '" placeholder="e.g. Move to savings" /></div>' +
      '<div class="small muted" id="tr-hint" style="margin-bottom:4px"></div>' +
      modalActions()
    );
    function updateHint() {
      var fromCur = S.accountCurrency($("#tr-from").value), toCur = S.accountCurrency($("#tr-to").value);
      var amt = parseFloat($("#tr-amount").value);
      var hint = "";
      if (fromCur !== toCur && amt > 0) hint = "Converts to " + S.fmtMoney(S.convert(amt, fromCur, toCur), { currency: toCur }) + " at current rates.";
      $("#tr-hint").textContent = hint;
    }
    $("#tr-from").onchange = updateHint; $("#tr-to").onchange = updateHint; $("#tr-amount").oninput = updateHint;
    updateHint();
    $("#modal-save").onclick = function () {
      var from = $("#tr-from").value, to = $("#tr-to").value;
      var amount = parseFloat($("#tr-amount").value);
      if (from === to) return toast("Pick two different accounts.", "error");
      if (!(amount > 0)) return toast("Enter a valid amount.", "error");
      var rec = { id: existing ? existing.id : S.uid(), type: "transfer", amount: amount, date: $("#tr-date").value || S.todayISO(), accountId: from, toAccountId: to, note: $("#tr-note").value.trim() };
      if (existing) { var i = st.transactions.findIndex(function (x) { return x.id === existing.id; }); st.transactions[i] = rec; }
      else st.transactions.push(rec);
      S.save(); closeModal(); toast(existing ? "Transfer updated." : "Transfer recorded.", "success"); render();
    };
  }

  var PALETTE = ["#4f6ef7", "#1faa6c", "#e6a23c", "#9b59f5", "#e2574c", "#18b6c4", "#e879a6", "#f2994a", "#6b87ff", "#36c98a", "#8b95a7", "#5b6678"];
  function categoryModal(existing) {
    var st = S.getState();
    var c = existing || { name: "", type: "expense", color: PALETTE[Math.floor(Math.random() * PALETTE.length)] };
    openModal(
      "<h2>" + (existing ? "Edit" : "Add") + " Category</h2>" +
      '<div class="form-row"><label>Name</label><input id="c-name" value="' + escAttr(c.name) + '" placeholder="e.g. Pets" /></div>' +
      '<div class="form-row"><label>Type</label><div class="seg"><button id="c-expense" class="' + (c.type === "expense" ? "active" : "") + '"' + (existing ? " disabled" : "") + '>Expense</button><button id="c-income" class="' + (c.type === "income" ? "active" : "") + '"' + (existing ? " disabled" : "") + ">Income</button></div></div>" +
      '<div class="form-row"><label>Color</label><input id="c-color" type="color" value="' + c.color + '" style="height:42px;padding:4px" /></div>' +
      modalActions()
    );
    var type = c.type;
    if (!existing) {
      $("#c-expense").onclick = function () { type = "expense"; $("#c-expense").classList.add("active"); $("#c-income").classList.remove("active"); };
      $("#c-income").onclick = function () { type = "income"; $("#c-income").classList.add("active"); $("#c-expense").classList.remove("active"); };
    }
    $("#modal-save").onclick = function () {
      var name = $("#c-name").value.trim();
      if (!name) return toast("Enter a name.", "error");
      var dup = st.categories.find(function (x) { return x.name.toLowerCase() === name.toLowerCase() && x.type === type && (!existing || x.id !== existing.id); });
      if (dup) return toast("A " + type + " category with that name already exists.", "error");
      if (existing) {
        var i = st.categories.findIndex(function (x) { return x.id === existing.id; });
        st.categories[i].name = name; st.categories[i].color = $("#c-color").value;
      } else {
        st.categories.push({ id: S.uid(), name: name, type: type, color: $("#c-color").value });
      }
      S.save(); closeModal(); toast("Category saved.", "success"); render();
    };
  }

  function modalActions() {
    return '<div class="modal-actions"><button class="ghost-btn" id="modal-cancel" style="width:auto">Cancel</button><button class="primary-btn" id="modal-save">Save</button></div>';
  }

  function confirmModal(message, onYes, opts) {
    opts = opts || {};
    var label = opts.yesLabel || "Delete";
    var cls = opts.danger === false ? "primary-btn" : "danger-btn";
    openModal('<h2>' + (opts.title || "Are you sure?") + '</h2><p class="muted" style="margin-bottom:8px">' + message + "</p>" +
      '<div class="modal-actions"><button class="ghost-btn" id="modal-cancel" style="width:auto">Cancel</button><button class="' + cls + '" id="modal-yes">' + label + "</button></div>");
    $("#modal-yes").onclick = function () { onYes(); closeModal(); };
  }

  /* ============================================================
     EVENT WIRING
     - Delegated handlers on persistent nodes (#view-root, document) are
       installed ONCE in init() via installDelegation(), then dispatch by ui.view.
     - wireView() runs each render and only binds freshly-created form controls
       (safe to reassign onclick/oninput since innerHTML replaces them).
     ============================================================ */
  function installDelegation() {
    // Modal cancel button works in any modal.
    document.addEventListener("click", function (e) {
      if (e.target.id === "modal-cancel") closeModal();
    });
    // Single row-action handler, dispatched by the active view.
    $("#view-root").addEventListener("click", handleRootClick);

    // Notifications bell + panel.
    $("#alerts-btn").addEventListener("click", function (e) { e.stopPropagation(); toggleAlertsPanel(); });
    $("#alerts-panel").addEventListener("click", handleAlertClick);
    document.addEventListener("click", function (e) {
      if ($("#alerts-panel").classList.contains("hidden")) return;
      if (!e.target.closest(".alerts-wrap")) toggleAlertsPanel(false);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggleAlertsPanel(false); });
  }

  /* ---------- Notifications center ---------- */
  function updateAlertsBadge() {
    var alerts = S.activeAlerts();
    var badge = $("#alerts-badge");
    if (!alerts.length) { badge.classList.add("hidden"); return; }
    badge.classList.remove("hidden");
    badge.textContent = alerts.length > 99 ? "99+" : String(alerts.length);
    // Red if anything is overdue, amber if only upcoming.
    badge.classList.toggle("amber", !alerts.some(function (a) { return a.status === "overdue"; }));
  }

  function renderAlertsPanel() {
    var panel = $("#alerts-panel");
    var alerts = S.activeAlerts();
    var head = '<div class="alerts-head"><strong>Notifications</strong>' +
      (alerts.length ? '<button class="link-btn" id="alerts-dismiss-all">Dismiss all</button>' : "") + "</div>";
    if (!alerts.length) {
      panel.innerHTML = head + '<div class="alerts-empty"><div class="big">🎉</div>You\'re all caught up.' +
        '<div class="small muted" style="margin-top:6px">No bills due in the next ' + S.alertLeadDays() + " days.</div></div>";
      return;
    }
    var overdue = alerts.filter(function (a) { return a.status === "overdue"; }).length;
    var rows = alerts.map(function (a) {
      var acct = S.accountById(a.accountId);
      var cur = S.accountCurrency(a.accountId);
      var when = a.days < 0 ? Math.abs(a.days) + "d overdue" : (a.days === 0 ? "Due today" : "Due in " + a.days + "d");
      var whenCls = a.status === "overdue" ? "overdue" : "due-soon";
      var icon = a.status === "overdue" ? "⚠️" : "🗓️";
      return '<div class="alert-item" data-key="' + escAttr(a.key) + '" data-id="' + a.id + '">' +
        '<div class="alert-icon ' + a.status + '">' + icon + "</div>" +
        '<div class="a-main"><div class="a-name">' + escHtml(a.name) + (a.autoPost ? ' <span class="muted small">⚡ auto</span>' : "") + "</div>" +
        '<div class="a-sub"><span class="' + whenCls + '">' + when + "</span> · " + S.fmtMoney(a.amount, { currency: cur }) +
        " · " + (acct ? escHtml(acct.name) : "—") + "</div></div>" +
        '<div class="a-actions">' +
        '<button class="icon-btn" data-aact="log" title="Log this payment now & roll the date forward">✅</button>' +
        '<button class="icon-btn" data-aact="dismiss" title="Dismiss until next due">✕</button></div></div>';
    }).join("");
    var foot = '<div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center">' +
      '<span class="muted small">' + (overdue ? overdue + " overdue · " : "") + (alerts.length - overdue) + " upcoming</span>" +
      '<button class="link-btn" id="alerts-goto">Manage recurring →</button></div>';
    panel.innerHTML = head + rows + foot;
  }

  function toggleAlertsPanel(force) {
    var panel = $("#alerts-panel"), btn = $("#alerts-btn");
    var show = (force === undefined) ? panel.classList.contains("hidden") : force;
    if (show) { renderAlertsPanel(); panel.classList.remove("hidden"); btn.setAttribute("aria-expanded", "true"); }
    else { panel.classList.add("hidden"); btn.setAttribute("aria-expanded", "false"); }
  }

  function handleAlertClick(e) {
    // Keep clicks inside the panel from reaching the outside-click closer — re-rendering
    // the panel detaches the clicked node, which would otherwise be read as "outside".
    e.stopPropagation();
    if (e.target.id === "alerts-dismiss-all") { S.dismissAllAlerts(); renderAlertsPanel(); updateAlertsBadge(); return; }
    if (e.target.id === "alerts-goto") { toggleAlertsPanel(false); ui.view = "recurring"; window.scrollTo(0, 0); render(); return; }
    var item = e.target.closest(".alert-item"); if (!item) return;
    var btn = e.target.closest("[data-aact]"); if (!btn) return;
    var key = item.getAttribute("data-key"), id = item.getAttribute("data-id");
    var aact = btn.getAttribute("data-aact");
    var st = S.getState();
    if (aact === "dismiss") {
      S.dismissAlert(key); renderAlertsPanel(); updateAlertsBadge();
    } else if (aact === "log") {
      var r = st.recurring.find(function (x) { return x.id === id; });
      if (!r) return;
      st.transactions.push({ id: S.uid(), type: r.type, amount: r.amount, date: r.nextDate, categoryId: r.categoryId, accountId: r.accountId, note: r.name + " (recurring)" });
      r.nextDate = S.addToDate(r.nextDate, r.frequency);
      S.save();
      toast("Logged " + S.fmtMoney(r.amount, { currency: S.accountCurrency(r.accountId) }) + " · next due " + r.nextDate, "success");
      buildMonthPicker(); render(); renderAlertsPanel();
    }
  }

  /* ---------- Desktop (browser) notifications ---------- */
  var swReg = null;

  function notifySupported() { return typeof window !== "undefined" && "Notification" in window; }
  function notifyPermission() { return notifySupported() ? window.Notification.permission : "unsupported"; }

  function initNotifications() {
    if (!notifySupported()) return;
    // A service worker (only over http/https, not file://) lets notifications
    // render while the tab is backgrounded and handles click-to-focus.
    try {
      if (navigator.serviceWorker && location.protocol !== "file:") {
        navigator.serviceWorker.register("sw.js").then(function (reg) { swReg = reg; }).catch(function () {});
      }
    } catch (e) { /* ignore */ }
    // Re-check when the user comes back to the tab, or once an hour while open.
    document.addEventListener("visibilitychange", function () { if (!document.hidden) runNotificationCheck(); });
    window.addEventListener("focus", runNotificationCheck);
    setInterval(runNotificationCheck, 60 * 60 * 1000);
  }

  function showSystemNotification(title, body, tag) {
    var opts = { body: body, tag: tag, renotify: false };
    try {
      if (swReg && swReg.showNotification) swReg.showNotification(title, opts);
      else new window.Notification(title, opts);
      return true;
    } catch (e) { return false; }
  }

  // Notify (once per occurrence) about bills the user hasn't seen yet.
  function runNotificationCheck() {
    var st = S.getState();
    if (!st.settings.notifyEnabled) return;
    if (notifyPermission() !== "granted") return;
    var pending = S.pendingNotifications();
    if (!pending.length) return;

    if (pending.length === 1) {
      var a = pending[0];
      var acct = S.accountById(a.accountId);
      var when = a.days < 0 ? (Math.abs(a.days) + " days overdue")
        : (a.days === 0 ? "due today" : "due in " + a.days + " days");
      showSystemNotification(
        a.status === "overdue" ? "Bill overdue" : "Bill due soon",
        a.name + " — " + S.fmtMoney(a.amount, { currency: S.accountCurrency(a.accountId) }) +
          " " + when + (acct ? " (" + acct.name + ")" : ""),
        "fintrack-" + a.key
      );
    } else {
      var overdue = pending.filter(function (p) { return p.status === "overdue"; }).length;
      var names = pending.slice(0, 4).map(function (p) { return p.name; }).join(", ") + (pending.length > 4 ? "…" : "");
      showSystemNotification(
        pending.length + " bills need attention" + (overdue ? " (" + overdue + " overdue)" : ""),
        names, "fintrack-summary"
      );
    }
    S.markNotified(pending.map(function (p) { return p.key; }));
  }

  function requestNotifyPermission(cb) {
    var done = false;
    function handle(perm) { if (done) return; done = true; cb(perm); }
    try {
      var ret = window.Notification.requestPermission(handle);   // legacy callback form
      if (ret && typeof ret.then === "function") ret.then(handle); // modern promise form
    } catch (e) { handle("denied"); }
  }

  function enableNotifications() {
    if (!notifySupported()) { toast("This browser doesn't support notifications.", "error"); return; }
    requestNotifyPermission(function (perm) {
      if (perm === "granted") {
        S.getState().settings.notifyEnabled = true; S.save();
        toast("Desktop notifications enabled.", "success");
        runNotificationCheck();
      } else {
        toast("Notification permission " + perm + ".", "error");
      }
      render();
    });
  }

  function handleRootClick(e) {
    var btn = e.target.closest("[data-act]"); if (!btn) return;
    var container = btn.closest("[data-id]"); if (!container) return;
    var id = container.getAttribute("data-id");
    var act = btn.getAttribute("data-act");
    var st = S.getState();

    if (ui.view === "transactions") {
      var tx = st.transactions.find(function (x) { return x.id === id; });
      if (act === "edit") (tx.type === "transfer" ? transferModal : txModal)(tx);
      else confirmModal((tx.type === "transfer" ? "Delete this transfer?" : "Delete this transaction?"), function () {
        st.transactions = st.transactions.filter(function (x) { return x.id !== id; });
        S.save(); toast("Deleted.", "success"); render();
      });
    } else if (ui.view === "categories") {
      var cat = st.categories.find(function (x) { return x.id === id; });
      if (act === "edit-cat") categoryModal(cat);
      else deleteCategory(cat);
    } else if (ui.view === "goals") {
      var g = st.goals.find(function (x) { return x.id === id; });
      if (act === "edit-goal") goalModal(g);
      else if (act === "fund-goal") goalFundsModal(g);
      else confirmModal("Delete the “" + escHtml(g.name) + "” goal?", function () {
        st.goals = st.goals.filter(function (x) { return x.id !== id; });
        S.save(); toast("Goal deleted.", "success"); render();
      });
    } else if (ui.view === "budgets") {
      var b = st.budgets.find(function (x) { return x.id === id; });
      if (act === "edit-budget") budgetModal(b);
      else confirmModal("Delete this budget?", function () {
        st.budgets = st.budgets.filter(function (x) { return x.id !== id; });
        S.save(); toast("Deleted.", "success"); render();
      });
    } else if (ui.view === "recurring") {
      var r = st.recurring.find(function (x) { return x.id === id; });
      if (act === "edit") recurringModal(r);
      else if (act === "toggle") { r.active = !r.active; S.save(); toast(r.active ? "Resumed." : "Paused.", "success"); render(); }
      else if (act === "auto") {
        r.autoPost = !r.autoPost; S.save();
        var caught = r.autoPost ? S.catchUpRecurring(r, S.todayISO()) : 0;
        if (caught) S.save();
        toast(r.autoPost ? ("Auto-posting on" + (caught ? " — posted " + caught + " due payment(s)." : ".")) : "Auto-posting off.", "success");
        buildMonthPicker(); render();
      }
      else if (act === "post") {
        st.transactions.push({ id: S.uid(), type: r.type, amount: r.amount, date: r.nextDate, categoryId: r.categoryId, accountId: r.accountId, note: r.name + " (recurring)" });
        r.nextDate = S.addToDate(r.nextDate, r.frequency);
        S.save(); toast("Logged " + S.fmtMoney(r.amount, { currency: S.accountCurrency(r.accountId) }) + " · next due " + r.nextDate, "success"); buildMonthPicker(); render();
      } else if (act === "del") {
        confirmModal("Delete this recurring item?", function () {
          st.recurring = st.recurring.filter(function (x) { return x.id !== id; }); S.save(); toast("Deleted.", "success"); render();
        });
      }
    } else if (ui.view === "accounts") {
      var a = st.accounts.find(function (x) { return x.id === id; });
      if (act === "edit") accountModal(a);
      else if (act === "adjust-value") adjustValueModal(a);
      else confirmModal("Delete account \"" + escHtml(a.name) + "\"? Its transactions and transfers will also be removed.", function () {
        st.accounts = st.accounts.filter(function (x) { return x.id !== id; });
        st.transactions = st.transactions.filter(function (x) { return x.accountId !== id && x.toAccountId !== id; });
        st.recurring = st.recurring.filter(function (x) { return x.accountId !== id; });
        S.save(); toast("Account deleted.", "success"); buildMonthPicker(); render();
      });
    }
  }

  // Delete a category, reassigning anything that referenced it to another category of the same type.
  function deleteCategory(cat) {
    var st = S.getState();
    var fallback = st.categories.find(function (c) { return c.type === cat.type && c.id !== cat.id; });
    var txCount = st.transactions.filter(function (t) { return t.categoryId === cat.id; }).length;
    var recCount = st.recurring.filter(function (r) { return r.categoryId === cat.id; }).length;
    var budCount = st.budgets.filter(function (b) { return b.categoryId === cat.id; }).length;
    var inUse = txCount + recCount + budCount;

    if (inUse && !fallback) {
      toast("Add another " + cat.type + " category before deleting this one.", "error");
      return;
    }
    var msg = inUse
      ? "“" + escHtml(cat.name) + "” is used by " + txCount + " transaction(s) and " + recCount + " recurring item(s), which will be moved to “" + escHtml(fallback.name) + "”. Its budget will be removed."
      : "Delete the “" + escHtml(cat.name) + "” category?";
    confirmModal(msg, function () {
      if (inUse) {
        st.transactions.forEach(function (t) { if (t.categoryId === cat.id) t.categoryId = fallback.id; });
        st.recurring.forEach(function (r) { if (r.categoryId === cat.id) r.categoryId = fallback.id; });
        st.budgets = st.budgets.filter(function (b) { return b.categoryId !== cat.id; });
      }
      st.categories = st.categories.filter(function (c) { return c.id !== cat.id; });
      S.save(); toast("Category deleted.", "success"); render();
    });
  }

  function wireView() {
    if (ui.view === "transactions") {
      $("#tx-add").onclick = function () { txModal(); };
      $("#tx-transfer").onclick = function () { transferModal(); };
      $("#tx-search").oninput = function (e) { ui.txFilter.search = e.target.value; rerenderBody(); };
      $("#tx-type").onchange = function (e) { ui.txFilter.type = e.target.value; rerenderBody(); };
      $("#tx-cat").onchange = function (e) { ui.txFilter.category = e.target.value; rerenderBody(); };
    } else if (ui.view === "budgets") {
      if ($("#budget-add")) $("#budget-add").onclick = function () { budgetModal(); };
    } else if (ui.view === "goals") {
      $("#goal-add").onclick = function () { goalModal(); };
    } else if (ui.view === "recurring") {
      $("#rec-add").onclick = function () { recurringModal(); };
    } else if (ui.view === "accounts") {
      $("#acct-add").onclick = function () { accountModal(); };
    } else if (ui.view === "categories") {
      $("#cat-add").onclick = function () { categoryModal(); };
    } else if (ui.view === "reports") {
      $("#report-print").onclick = function () { window.print(); };
      $("#report-period").onclick = function (e) {
        var b = e.target.closest("[data-period]"); if (!b) return;
        ui.reportPeriod = b.getAttribute("data-period"); render();
      };
    } else if (ui.view === "settings") {
      wireSettings();
    }
  }

  function wireSettings() {
    var st = S.getState();
    $("#set-currency").onchange = function (e) { st.settings.baseCurrency = e.target.value; S.save(); toast("Base currency updated.", "success"); render(); };
    $("#set-leaddays").onchange = function (e) {
      var v = parseInt(e.target.value, 10);
      st.settings.alertLeadDays = (isNaN(v) || v < 0) ? 0 : Math.min(90, v);
      S.save(); toast("Alert window set to " + st.settings.alertLeadDays + " days.", "success"); render();
    };
    $all(".rate-input").forEach(function (inp) {
      inp.onchange = function () {
        var cur = inp.getAttribute("data-cur");
        var v = parseFloat(inp.value);
        st.settings.rates = st.settings.rates || {};
        st.settings.rates[cur] = (v > 0) ? v : 1;
        S.save(); toast("Rate for " + cur + " updated.", "success"); render();
      };
    });
    $("#theme-light").onclick = function () { applyTheme("light"); render(); };
    $("#theme-dark").onclick = function () { applyTheme("dark"); render(); };
    if ($("#notify-enable")) $("#notify-enable").onclick = enableNotifications;
    if ($("#notify-toggle")) $("#notify-toggle").onchange = function (e) {
      st.settings.notifyEnabled = e.target.checked; S.save();
      toast(e.target.checked ? "Bill notifications on." : "Bill notifications off.", "success");
      if (e.target.checked) runNotificationCheck();
      render();
    };
    if ($("#notify-test")) $("#notify-test").onclick = function () {
      var ok = showSystemNotification("FinTrack", "This is a test notification — you're all set.", "fintrack-test");
      toast(ok ? "Test notification sent." : "Couldn't show a notification.", ok ? "success" : "error");
    };
    $("#export-data").onclick = exportData;
    $("#import-data").onclick = function () { $("#import-file").click(); };
    $("#import-file").onchange = importData;
    $("#import-csv").onclick = function () { $("#import-csv-file").click(); };
    $("#import-csv-file").onchange = importCSV;
    $("#export-csv").onclick = exportCSV;
    $("#download-template").onclick = downloadTemplate;
    $("#load-demo").onclick = function () {
      confirmModal("Load demo data? This replaces everything currently stored.", function () {
        S.loadDemoData(); applyTheme(S.getState().settings.theme); ui.month = S.monthKey(S.todayISO()); buildMonthPicker(); toast("Demo data loaded.", "success"); render();
      }, { yesLabel: "Load", danger: false });
    };
    $("#reset-data").onclick = function () {
      confirmModal("Erase ALL data permanently? This cannot be undone.", function () {
        S.replaceState(S.defaultState()); applyTheme("light"); ui.month = S.monthKey(S.todayISO()); buildMonthPicker(); toast("All data erased.", "success"); render();
      });
    };
  }

  function downloadFile(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    a.click(); URL.revokeObjectURL(url);
  }

  function exportData() {
    downloadFile(JSON.stringify(S.getState(), null, 2), "fintrack-backup-" + S.todayISO() + ".json", "application/json");
    toast("Backup downloaded.", "success");
  }

  /* ---------- CSV export / template / import ---------- */
  var CSV_HEADERS = ["date", "type", "amount", "category", "account", "note"];

  function txToRow(t) {
    var c = S.categoryById(t.categoryId), a = S.accountById(t.accountId);
    if (t.type === "transfer") {
      var to = S.accountById(t.toAccountId);
      return { date: t.date, type: "transfer", amount: t.amount, category: "", account: (a ? a.name : "") + " > " + (to ? to.name : ""), note: t.note || "" };
    }
    if (t.type === "adjust") {
      return { date: t.date, type: "adjust", amount: t.amount, category: "", account: a ? a.name : "", note: t.note || "" };
    }
    return { date: t.date, type: t.type, amount: t.amount, category: c ? c.name : "", account: a ? a.name : "", note: t.note || "" };
  }

  function exportCSV() {
    var rows = S.getState().transactions.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(txToRow);
    if (!rows.length) return toast("No transactions to export.", "error");
    downloadFile(S.toCSV(CSV_HEADERS, rows), "fintrack-transactions-" + S.todayISO() + ".csv", "text/csv");
    toast("Transactions exported.", "success");
  }

  function downloadTemplate() {
    var sample = [
      { date: S.todayISO(), type: "expense", amount: "42.50", category: "Groceries", account: "Checking", note: "Example row — delete me" },
      { date: S.todayISO(), type: "income", amount: "1500", category: "Salary", account: "Checking", note: "" }
    ];
    downloadFile(S.toCSV(CSV_HEADERS, sample), "fintrack-template.csv", "text/csv");
    toast("Template downloaded.", "success");
  }

  function importCSV(e) {
    var file = e.target.files[0]; if (!file) return;
    e.target.value = "";   // allow re-importing the same file later
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var result = buildImportFromCSV(reader.result);
        if (!result.txs.length) { toast("No valid rows found in that CSV.", "error"); return; }
        var parts = ["Import <strong>" + result.txs.length + "</strong> transaction(s)?"];
        if (result.skipped) parts.push(result.skipped + " row(s) will be skipped (bad date/amount).");
        if (result.newCats.length) parts.push("New categories: " + result.newCats.map(escHtml).join(", ") + ".");
        if (result.newAccts.length) parts.push("New accounts: " + result.newAccts.map(escHtml).join(", ") + ".");
        confirmModal(parts.join("<br>"), function () {
          var st = S.getState();
          result.addCats.forEach(function (c) { st.categories.push(c); });
          result.addAccts.forEach(function (a) { st.accounts.push(a); });
          result.txs.forEach(function (t) { st.transactions.push(t); });
          S.save(); buildMonthPicker(); toast("Imported " + result.txs.length + " transaction(s).", "success"); render();
        }, { title: "Confirm CSV import", yesLabel: "Import", danger: false });
      } catch (err) {
        toast("Import failed: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }

  // Pure-ish: parse CSV text and resolve categories/accounts (creating staged ones as needed).
  // Returns { txs, addCats, addAccts, newCats, newAccts, skipped } without mutating state.
  function buildImportFromCSV(text) {
    var st = S.getState();
    var objs = S.csvToObjects(text);
    var skipped = 0, txs = [];
    var addCats = [], addAccts = [], newCats = [], newAccts = [];

    // Working copies of name→record maps (include staged additions).
    var catMap = {}; st.categories.forEach(function (c) { catMap[c.type + "::" + c.name.toLowerCase()] = c; });
    var acctMap = {}; st.accounts.forEach(function (a) { acctMap[a.name.toLowerCase()] = a; });
    var defaultAcct = st.accounts[0];

    function resolveCategory(name, type) {
      name = (name || "").trim() || "Other";
      var key = type + "::" + name.toLowerCase();
      if (catMap[key]) return catMap[key].id;
      var rec = { id: S.uid(), name: name, type: type, color: PALETTE[(addCats.length + 3) % PALETTE.length] };
      catMap[key] = rec; addCats.push(rec); newCats.push(name + " (" + type + ")");
      return rec.id;
    }
    function resolveAccount(name) {
      name = (name || "").trim();
      if (!name) return defaultAcct ? defaultAcct.id : null;
      if (acctMap[name.toLowerCase()]) return acctMap[name.toLowerCase()].id;
      var rec = { id: S.uid(), name: name, type: "Bank", openingBalance: 0, currency: S.baseCurrency() };
      acctMap[name.toLowerCase()] = rec; addAccts.push(rec); newAccts.push(name);
      if (!defaultAcct) defaultAcct = rec;
      return rec.id;
    }

    objs.forEach(function (o) {
      var date = S.parseDateLoose(o.date);
      var rawAmount = S.parseAmountLoose(o.amount);
      if (!date || isNaN(rawAmount)) { skipped++; return; }
      var typeRaw = (o.type || "").toLowerCase();
      var type = typeRaw === "income" ? "income" : (typeRaw === "transfer" ? "transfer" : "expense");
      if (!typeRaw) type = rawAmount < 0 ? "expense" : "income";   // infer from sign when no type column
      if (type === "transfer") { skipped++; return; }              // transfers need two accounts; not supported via CSV
      var amount = Math.abs(rawAmount);
      if (!(amount > 0)) { skipped++; return; }
      txs.push({
        id: S.uid(), type: type, amount: amount, date: date,
        categoryId: resolveCategory(o.category, type),
        accountId: resolveAccount(o.account),
        note: (o.note || o.description || o.memo || "").trim()
      });
    });

    return { txs: txs, addCats: addCats, addAccts: addAccts, newCats: newCats, newAccts: newAccts, skipped: skipped };
  }

  function importData(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data.accounts || !data.transactions) throw new Error("Not a FinTrack backup.");
        S.replaceState(data);
        applyTheme(S.getState().settings.theme || "light");
        buildMonthPicker(); toast("Backup imported.", "success"); render();
      } catch (err) {
        toast("Import failed: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- escaping ---------- */
  function escHtml(s) { return String(s).replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; }); }
  function escAttr(s) { return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

  /* ---------- theme ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    var st = S.getState(); st.settings.theme = theme; S.save();
  }

  /* ============================================================
     RENDER
     ============================================================ */
  var TITLES = { dashboard: "Dashboard", transactions: "Transactions", budgets: "Budgets", goals: "Goals", recurring: "Recurring & Bills", accounts: "Accounts", categories: "Categories", reports: "Reports", settings: "Settings" };

  function rerenderBody() {
    // Lightweight re-render used by transaction filters (keeps toolbar inputs focused)
    var root = $("#view-root");
    var scrollY = window.scrollY;
    root.innerHTML = Views[ui.view]();
    wireView();
    window.scrollTo(0, scrollY);
  }

  function render() {
    $("#view-title").textContent = TITLES[ui.view];
    $all(".nav-item").forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-view") === ui.view); });
    $("#month-picker").style.display = (ui.view === "dashboard" || ui.view === "budgets" || ui.view === "transactions") ? "" : "none";
    buildMonthPicker();
    $("#view-root").innerHTML = Views[ui.view]();
    wireView();
    updateAlertsBadge();
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    S.load();
    applyTheme(S.getState().settings.theme || "light");
    installDelegation();
    initNotifications();

    // Auto-post any recurring items that have come due since the last visit.
    var autoSummary = S.runAutoPosts();

    $all(".nav-item").forEach(function (n) {
      n.onclick = function () { ui.view = n.getAttribute("data-view"); window.scrollTo(0, 0); render(); };
    });
    $("#quick-add").onclick = function () { txModal(); };
    $("#month-picker").onchange = function (e) { ui.month = e.target.value; render(); };
    $("#theme-toggle").onclick = function () {
      var next = (S.getState().settings.theme === "dark") ? "light" : "dark";
      applyTheme(next); render();
    };

    render();

    if (autoSummary.count) {
      toast("⚡ Auto-posted " + autoSummary.count + " recurring transaction(s): " + autoSummary.names.join(", "), "success");
    }

    // Fire desktop notifications for anything currently due (no-op unless enabled & permitted).
    runNotificationCheck();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
