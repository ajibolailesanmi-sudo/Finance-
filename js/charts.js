/* ============================================================
   charts.js — dependency-free SVG charts (donut, bars, line)
   Each function returns an SVG markup string.
   ============================================================ */
(function (global) {
  "use strict";

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  // ---- Donut chart ----
  // data: [{ label, value, color }]
  function donut(data, opts) {
    opts = opts || {};
    var size = opts.size || 200;
    var stroke = opts.stroke || 26;
    var r = (size - stroke) / 2;
    var cx = size / 2, cy = size / 2;
    var circ = 2 * Math.PI * r;
    var total = data.reduce(function (s, d) { return s + d.value; }, 0);

    if (total <= 0) {
      return '<div class="empty"><div class="big">🍩</div>No spending yet this month.</div>';
    }

    var offset = 0;
    var segs = data.filter(function (d) { return d.value > 0; }).map(function (d) {
      var frac = d.value / total;
      var len = frac * circ;
      var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + d.color +
        '" stroke-width="' + stroke + '" stroke-dasharray="' + len + ' ' + (circ - len) +
        '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')">' +
        '<title>' + esc(d.label) + ': ' + (frac * 100).toFixed(1) + '%</title></circle>';
      offset += len;
      return seg;
    }).join("");

    var center = '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" font-size="12" fill="var(--muted)">Total</text>' +
      '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">' +
      esc(opts.centerLabel || "") + '</text>';

    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" style="max-width:' + size + 'px;display:block;margin:auto">' +
      segs + center + '</svg>';
  }

  // ---- Grouped bar chart (income vs expense per month) ----
  // series: [{ label, income, expense }]
  function barsIncomeExpense(series, opts) {
    opts = opts || {};
    var w = opts.width || 560, h = opts.height || 220;
    var padL = 44, padB = 26, padT = 12, padR = 8;
    var plotW = w - padL - padR, plotH = h - padB - padT;
    var max = Math.max(1, Math.max.apply(null, series.map(function (s) { return Math.max(s.income, s.expense); })));
    var groupW = plotW / series.length;
    var barW = Math.min(18, groupW / 3);

    function y(v) { return padT + plotH - (v / max) * plotH; }

    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var gv = max * g / 4;
      var gy = y(gv);
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="var(--border)" stroke-width="1"/>';
      grid += '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + Store.fmtMoney(gv, { compact: true }) + '</text>';
    }

    var bars = series.map(function (s, i) {
      var x0 = padL + i * groupW + groupW / 2;
      var inc = '<rect x="' + (x0 - barW - 2) + '" y="' + y(s.income) + '" width="' + barW + '" height="' + (plotH + padT - y(s.income)) + '" rx="3" fill="var(--income)"><title>' + esc(s.label) + ' income: ' + Store.fmtMoney(s.income) + '</title></rect>';
      var exp = '<rect x="' + (x0 + 2) + '" y="' + y(s.expense) + '" width="' + barW + '" height="' + (plotH + padT - y(s.expense)) + '" rx="3" fill="var(--expense)"><title>' + esc(s.label) + ' expense: ' + Store.fmtMoney(s.expense) + '</title></rect>';
      var lbl = '<text x="' + x0 + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + esc(s.label) + '</text>';
      return inc + exp + lbl;
    }).join("");

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%">' + grid + bars + '</svg>';
  }

  // ---- Line / area chart (net worth trend) ----
  // points: [{ label, value }]
  function line(points, opts) {
    opts = opts || {};
    var w = opts.width || 560, h = opts.height || 220;
    var padL = 50, padB = 26, padT = 12, padR = 10;
    var plotW = w - padL - padR, plotH = h - padB - padT;
    if (!points.length) return '<div class="empty">No data.</div>';

    var vals = points.map(function (p) { return p.value; });
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    if (min === max) { max = min + 1; }
    var pad = (max - min) * 0.1;
    min -= pad; max += pad;

    function x(i) { return padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW); }
    function y(v) { return padT + plotH - ((v - min) / (max - min)) * plotH; }

    var grid = "";
    for (var g = 0; g <= 4; g++) {
      var gv = min + (max - min) * g / 4;
      var gy = y(gv);
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="var(--border)" stroke-width="1"/>';
      grid += '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + Store.fmtMoney(gv, { compact: true }) + '</text>';
    }

    var d = points.map(function (p, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.value).toFixed(1); }).join(" ");
    var area = "M" + x(0).toFixed(1) + " " + (padT + plotH) + " " +
      points.map(function (p, i) { return "L" + x(i).toFixed(1) + " " + y(p.value).toFixed(1); }).join(" ") +
      " L" + x(points.length - 1).toFixed(1) + " " + (padT + plotH) + " Z";

    var dots = points.map(function (p, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="3" fill="var(--primary)"><title>' + esc(p.label) + ': ' + Store.fmtMoney(p.value) + '</title></circle>';
    }).join("");

    var labels = points.map(function (p, i) {
      return '<text x="' + x(i).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + esc(p.label) + '</text>';
    }).join("");

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%">' +
      grid +
      '<path d="' + area + '" fill="var(--primary)" opacity="0.12"/>' +
      '<path d="' + d + '" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + '</svg>';
  }

  global.Charts = { donut: donut, barsIncomeExpense: barsIncomeExpense, line: line };
})(window);
