/* ============================================================
   data.js — CSV / MD loader + data model
   ============================================================ */

(function () {
  'use strict';

  // ---------- CSV parsing (handles quotes, commas in quotes) ----------
  function parseCSV(text) {
    const rows = [];
    let i = 0, field = '', row = [], inQ = false;
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i+1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      } else {
        if (c === '"') { inQ = true; i++; continue; }
        if (c === ',') { row.push(field); field = ''; i++; continue; }
        if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
        if (c === '\r') { i++; continue; }
        field += c; i++; continue;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return [];
    const header = rows[0].map(h => h.trim());
    return rows.slice(1).filter(r => r.length > 1 || (r.length === 1 && r[0].trim())).map(r => {
      const o = {};
      header.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
      return o;
    });
  }

  // ---------- products.md parser ----------
  function parseProductsMD(text) {
    const products = {};
    const lines = text.split('\n');
    // We want rows with | Brand | Product | Size | Unit | Product ID |
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('|') || !line.endsWith('|')) continue;
      const cells = line.slice(1, -1).split('|').map(s => s.trim());
      if (cells.length < 5) continue;
      const [brand, product, size, unit, pid] = cells;
      // skip header and separator rows
      if (pid === 'Product ID' || /^-+$/.test(pid) || !pid) continue;
      if (!/\d/.test(pid)) continue;
      products[pid] = { brand: brand === '—' ? '' : brand, product, size, unit, productId: pid };
    }
    return products;
  }

  // ---------- date utils ----------
  function parseMDY(s) {
    if (!s) return null;
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(+m[3], +m[1]-1, +m[2]);
  }
  function fmtShort(d) {
    if (!d) return '';
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  }

  // ---------- build data model ----------
  function buildModel(priceRows, productMeta) {
    // Filter out Amazon per user instruction
    priceRows = priceRows.filter(r => (r.banner || '').toLowerCase() !== 'amazon');

    // Collect all banners
    const bannerSet = new Set();
    priceRows.forEach(r => r.banner && bannerSet.add(r.banner));
    const banners = Array.from(bannerSet).sort((a,b) => {
      // Prioritize No Frills first (user preference)
      const order = ['No Frills', 'Loblaws', 'Real Canadian Superstore', 'Independent City Market'];
      const ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    // Collect weeks
    const weekSet = new Set();
    priceRows.forEach(r => r.week_start && weekSet.add(r.week_start));
    const weeks = Array.from(weekSet).map(w => ({ key: w, date: parseMDY(w) }))
      .filter(w => w.date)
      .sort((a,b) => a.date - b.date);
    const currentWeek = weeks[weeks.length - 1];
    const prevWeek = weeks[weeks.length - 2] || null;

    // Build products map keyed by product_id
    const productsById = {};
    priceRows.forEach(r => {
      const pid = r.product_id;
      if (!pid) return;
      if (!productsById[pid]) {
        const meta = productMeta[pid] || {};
        productsById[pid] = {
          productId: pid,
          brand: (r.brand && r.brand.trim()) || meta.brand || '',
          title: meta.product || cleanTitle(r.title),
          size: meta.size || r.package_size || '',
          unit: meta.unit || (r.unit_price_basis ? 'per ' + r.unit_price_basis : ''),
          rawTitle: r.title,
          byBanner: {},    // banner -> { weekKey -> entry }
        };
      }
      const p = productsById[pid];
      if (!p.byBanner[r.banner]) p.byBanner[r.banner] = {};
      const price = parseFloat(r.price);
      const wasPrice = parseFloat(r.was_price);
      const unitPrice = parseFloat(r.unit_price);
      p.byBanner[r.banner][r.week_start] = {
        price: isFinite(price) ? price : null,
        wasPrice: isFinite(wasPrice) ? wasPrice : null,
        unitPrice: isFinite(unitPrice) ? unitPrice : null,
        unitBasis: r.unit_price_basis || '',
        dealType: r.deal_type || '',
        dealText: r.deal_text || '',
        dealExpiry: parseMDY(r.deal_expiry),
        url: r.url || '',
        weekKey: r.week_start,
      };
    });

    // Compute, for each product: cheapestBanner this week, biggest drop, weekly series, etc.
    const products = Object.values(productsById);
    products.forEach(p => {
      // current prices per banner
      p.current = {};
      p.previous = {};
      banners.forEach(b => {
        const entries = p.byBanner[b] || {};
        p.current[b] = currentWeek ? entries[currentWeek.key] || null : null;
        p.previous[b] = prevWeek ? entries[prevWeek.key] || null : null;
      });

      // price series per banner (sorted by week)
      p.series = {};
      banners.forEach(b => {
        const entries = p.byBanner[b] || {};
        p.series[b] = weeks.map(w => ({
          weekKey: w.key,
          date: w.date,
          entry: entries[w.key] || null,
        }));
      });

      // cheapest banner for current week
      let min = Infinity, minBanner = null;
      banners.forEach(b => {
        const e = p.current[b];
        if (e && e.price != null && e.price < min) { min = e.price; minBanner = b; }
      });
      p.cheapestBanner = minBanner;
      p.cheapestPrice = isFinite(min) ? min : null;

      // biggest drop vs previous week (across banners)
      let bestDropPct = 0, bestDropAmt = 0, bestDropBanner = null;
      banners.forEach(b => {
        const cur = p.current[b], prev = p.previous[b];
        if (cur && prev && cur.price != null && prev.price != null && prev.price > 0 && cur.price < prev.price) {
          const pct = (prev.price - cur.price) / prev.price;
          if (pct > bestDropPct) {
            bestDropPct = pct;
            bestDropAmt = prev.price - cur.price;
            bestDropBanner = b;
          }
        }
      });
      p.bestDrop = bestDropBanner ? { banner: bestDropBanner, pct: bestDropPct, amt: bestDropAmt } : null;

      // biggest savings (was_price vs price this week)
      let bestSalePct = 0, bestSaleAmt = 0, bestSaleBanner = null;
      banners.forEach(b => {
        const cur = p.current[b];
        if (cur && cur.price != null && cur.wasPrice != null && cur.wasPrice > cur.price) {
          const pct = (cur.wasPrice - cur.price) / cur.wasPrice;
          if (pct > bestSalePct) {
            bestSalePct = pct;
            bestSaleAmt = cur.wasPrice - cur.price;
            bestSaleBanner = b;
          }
        }
      });
      p.bestSale = bestSaleBanner ? { banner: bestSaleBanner, pct: bestSalePct, amt: bestSaleAmt } : null;
    });

    return {
      banners,
      weeks,
      currentWeek,
      prevWeek,
      products,
      productsById,
    };
  }

  function cleanTitle(t) {
    if (!t) return '';
    // Trim after first comma if very long, otherwise just trim
    return t.trim();
  }

  // ---------- public loader ----------
  async function loadData() {
    const [csvText, mdText] = await Promise.all([
      fetch('data/prices.csv?_=' + Date.now()).then(r => { if (!r.ok) throw new Error('prices.csv ' + r.status); return r.text(); }),
      fetch('data/products.md?_=' + Date.now()).then(r => { if (!r.ok) throw new Error('products.md ' + r.status); return r.text(); }),
    ]);
    const priceRows = parseCSV(csvText);
    const productMeta = parseProductsMD(mdText);
    return buildModel(priceRows, productMeta);
  }

  window.GroceryData = { loadData, parseCSV, parseProductsMD, fmtShort };
})();
