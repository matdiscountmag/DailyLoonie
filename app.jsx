/* app.jsx — main React app */

const { useState, useEffect, useMemo, useRef } = React;

// ---------- helpers ----------
function fmtMoney(n) {
  if (n == null || !isFinite(n)) return '—';
  return '$' + n.toFixed(2);
}
function splitMoney(n) {
  if (n == null || !isFinite(n)) return { whole: '—', cents: '' };
  const s = n.toFixed(2);
  const [w, c] = s.split('.');
  return { whole: '$' + w, cents: '.' + c };
}
function bannerShort(b) {
  return ({
    'No Frills': 'NoFrills',
    'Loblaws': 'Loblaws',
    'Real Canadian Superstore': 'Superstore',
    'Independent City Market': 'Independent',
  })[b] || b;
}
function bannerAbbr(b) {
  return ({
    'No Frills': 'NF',
    'Loblaws': 'LB',
    'Real Canadian Superstore': 'RCSS',
    'Independent City Market': 'IND',
  })[b] || b.slice(0,3).toUpperCase();
}

// ---------- Star button ----------
const STAR_PATH = 'M8,1 L9.8,5.6 L14.7,5.8 L10.9,8.9 L12.1,13.7 L8,11 L3.9,13.7 L5.2,8.9 L1.3,5.8 L6.2,5.6Z';
function StarBtn({ pid, starred, onToggle }) {
  const on = starred.has(pid);
  return (
    <button
      className={`star-btn${on ? ' on' : ''}`}
      onClick={e => { e.stopPropagation(); onToggle(pid); }}
      aria-label={on ? 'Unstar' : 'Star'}
      title={on ? 'Unstar' : 'Star'}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d={STAR_PATH} />
      </svg>
    </button>
  );
}

// ---------- Price history chart setup ----------
const PH_COLORS = {
  'No Frills':                '#D4600A',
  'Loblaws':                  '#A52019',
  'Real Canadian Superstore': '#1B5EA6',
  'Independent City Market':  '#246B3A',
};
const PH_BANNER_ORDER = ['No Frills', 'Loblaws', 'Real Canadian Superstore', 'Independent City Market'];

const endLabelPlugin = {
  id: 'phEndLabels',
  afterDraw(chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = '500 13px system-ui,sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const items = [];
    chart.data.datasets.forEach((ds, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta.visible) return;
      let pt = null, val = null;
      for (let j = ds.data.length - 1; j >= 0; j--) {
        if (ds.data[j] != null) { pt = meta.data[j]; val = ds.data[j]; break; }
      }
      if (!pt) return;
      items.push({ x: pt.x, y: pt.y, color: ds.borderColor, abbr: ds.label, val });
    });
    if (!items.length) { ctx.restore(); return; }
    const totalBanners = items.length;
    const groups = [];
    items.forEach(item => {
      const g = groups.find(g => Math.abs(g.price - item.val) < 0.005);
      if (g) {
        g.abbrs.push(item.abbr);
        g.y = g.y + (item.y - g.y) / g.abbrs.length;
        g.x = Math.max(g.x, item.x);
      } else {
        groups.push({ price: item.val, abbrs: [item.abbr], y: item.y, x: item.x, singleColor: item.color });
      }
    });
    groups.sort((a, b) => a.y - b.y);
    const MIN_GAP = 14;
    for (let iter = 0; iter < 12; iter++) {
      for (let i = 1; i < groups.length; i++) {
        const a = groups[i - 1], b = groups[i];
        const overlap = MIN_GAP - (b.y - a.y);
        if (overlap > 0) { a.y -= overlap / 2; b.y += overlap / 2; }
      }
    }
    groups.forEach(({ x, y, abbrs, price, singleColor }) => {
      let label, color;
      if (abbrs.length === totalBanners) {
        label = `$${price.toFixed(2)} (All)`; color = '#888';
      } else if (abbrs.length === 1) {
        label = `$${price.toFixed(2)} (${abbrs[0]})`; color = singleColor;
      } else {
        label = `$${price.toFixed(2)} (${abbrs.join(', ')})`; color = '#666';
      }
      ctx.fillStyle = color;
      ctx.fillText(label, x + 6, y);
    });
    ctx.restore();
  }
};
Chart.register(endLabelPlugin);

// ---------- PriceHistoryTooltip ----------
function PriceHistoryTooltip({ product, weeks, anchorRect, onClose }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const datasets = PH_BANNER_ORDER.map(banner => {
      const series = product.series[banner] || [];
      const data = series.map(s => (s.entry && s.entry.price != null) ? s.entry.price : null);
      if (!data.some(v => v != null)) return null;
      const lastIdx = data.reduce((acc, v, i) => v != null ? i : acc, -1);
      return {
        label: bannerAbbr(banner),
        data,
        borderColor: PH_COLORS[banner],
        backgroundColor: PH_COLORS[banner],
        borderWidth: 2,
        tension: 0.35,
        cubicInterpolationMode: 'monotone',
        spanGaps: false,
        pointRadius: data.map((_, i) => i === lastIdx ? 3 : 0),
        pointHoverRadius: data.map(() => 4),
        hitRadius: 10,
      };
    }).filter(Boolean);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels: weeks.map(w => w.key), datasets },
      options: {
        responsive: false,
        animation: false,
        layout: { padding: { left: 4, right: 82, top: 6, bottom: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}` } }
        },
        scales: { x: { display: false }, y: { display: false } }
      }
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [product, weeks]);

  let style = {};
  if (anchorRect) {
    let left = anchorRect.right + 10;
    let top = anchorRect.top - 10;
    if (left + 300 > window.innerWidth - 8) left = anchorRect.left - 310;
    if (top + 160 > window.innerHeight - 8) top = window.innerHeight - 168;
    if (top < 8) top = 8;
    style = { left: left + 'px', top: top + 'px' };
  }

  return (
    <div className="ph-tooltip" style={style}>
      <div className="ph-hd">
        <div className="ph-title">{product.title}</div>
        <button className="ph-close" onClick={onClose}>✕</button>
      </div>
      <canvas ref={canvasRef} width="272" height="120" />
    </div>
  );
}

// ---------- Sparkline ----------
function Sparkline({ series, cheapest }) {
  const pts = series.filter(s => s.entry && s.entry.price != null).map(s => s.entry.price);
  if (pts.length < 2) return null;
  const min = Math.min(...pts), max = Math.max(...pts);
  const range = max - min || 1;
  const W = 64, H = 16, pad = 1;
  const step = pts.length > 1 ? (W - pad*2) / (pts.length - 1) : 0;
  const coords = pts.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (H - pad*2) * (1 - (v - min) / range);
    return [x, y];
  });
  const d = coords.map(([x,y], i) => (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1)).join(' ');
  const last = coords[coords.length-1];
  const stroke = cheapest ? 'var(--accent)' : 'var(--ink-3)';
  return (
    <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke={stroke} strokeWidth="1" />
      <circle cx={last[0]} cy={last[1]} r="1.6" fill={stroke} />
    </svg>
  );
}

// ---------- Price Cell ----------
function PriceCell({ entry, prevEntry, isCheapest, series }) {
  if (!entry || entry.price == null) {
    return <div className="na">—</div>;
  }
  const { whole, cents } = splitMoney(entry.price);
  const onSale = entry.wasPrice != null && entry.wasPrice > entry.price;
  let trend = null;
  if (prevEntry && prevEntry.price != null) {
    const d = entry.price - prevEntry.price;
    if (Math.abs(d) >= 0.01) {
      const pct = (d / prevEntry.price) * 100;
      const dir = d > 0 ? 'up' : 'down';
      const arrow = d > 0 ? '↑' : '↓';
      trend = <div className={`trend ${dir}`}>{arrow} {Math.abs(pct).toFixed(0)}%</div>;
    }
  }
  return (
    <>
      <div className={`price ${onSale ? 'onsale' : ''} ${isCheapest ? 'cheapest' : ''}`}>
        {whole}<span className="cents">{cents}</span>
      </div>
      {onSale && <div className="was">{fmtMoney(entry.wasPrice)}</div>}
      {entry.unitPrice != null && entry.unitBasis && (
        <div className="unit">{fmtMoney(entry.unitPrice)}/{entry.unitBasis}</div>
      )}
      {entry.dealType && (
        <div className={`deal-tag ${entry.dealType.toLowerCase()}`}>
          {entry.dealType === 'MULTI' ? (entry.dealText || 'MULTI') : entry.dealType}
        </div>
      )}
      {entry.dealType === 'MULTI' && entry.dealText && entry.dealType !== 'MULTI' && (
        <div className="deal-expiry">{entry.dealText}</div>
      )}
      {entry.dealExpiry && (
        <div className="deal-expiry">exp {GroceryData.fmtShort(entry.dealExpiry)}</div>
      )}
      {trend}
      <Sparkline series={series} cheapest={isCheapest} />
    </>
  );
}

// ---------- Compare Table ----------
function CompareTable({ model, filter, search, cart, onToggle, sort, starred, onStarToggle }) {
  const { banners, products } = model;
  const [tsOpen, setTsOpen] = useState(true);
  const [toOpen, setToOpen] = useState(true);

  let visible = products.slice();
  if (search) {
    const q = search.toLowerCase();
    visible = visible.filter(p =>
      (p.title||'').toLowerCase().includes(q) ||
      (p.brand||'').toLowerCase().includes(q)
    );
  }
  if (filter === 'onsale') {
    visible = visible.filter(p => banners.some(b => {
      const e = p.current[b]; return e && e.dealType;
    }));
  } else if (filter === 'dropped') {
    visible = visible.filter(p => p.bestDrop);
  } else if (banners.includes(filter)) {
    visible = visible.filter(p => p.current[filter] && p.current[filter].price != null);
  }

  // sort
  if (sort === 'savings') {
    visible.sort((a,b) => {
      const ax = Math.max(a.bestDrop?.pct || 0, a.bestSale?.pct || 0);
      const bx = Math.max(b.bestDrop?.pct || 0, b.bestSale?.pct || 0);
      return bx - ax;
    });
  } else if (sort === 'price') {
    visible.sort((a,b) => (a.cheapestPrice ?? 1e9) - (b.cheapestPrice ?? 1e9));
  } else if (sort === 'name') {
    visible.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  }

  const hasGroups = starred.size > 0;
  const starredList = hasGroups ? visible.filter(p => starred.has(p.productId)) : [];
  const otherList   = hasGroups ? visible.filter(p => !starred.has(p.productId)) : visible;

  function renderRow(p) {
    return (
      <tr key={p.productId}>
        <td className="prod-cell">
          <div className="prod-hd">
            <StarBtn pid={p.productId} starred={starred} onToggle={onStarToggle} />
            <div>
              <div className="prod-name">{p.title}</div>
              <div className="prod-meta">
                {p.brand && <span className="brand">{p.brand}</span>}
                <span>{p.size}{p.unit ? ' · ' + p.unit : ''}</span>
              </div>
              <button
                className={`add-btn ${cart[p.productId] ? 'added' : ''}`}
                onClick={() => onToggle(p.productId)}
                title={cart[p.productId] ? 'Remove from cart' : 'Add to cart'}
              >
                {cart[p.productId] ? '✓' : '+'}
              </button>
            </div>
          </div>
        </td>
        {banners.map(b => (
          <td key={b} className="banner-cell">
            <PriceCell
              entry={p.current[b]}
              prevEntry={p.previous[b]}
              isCheapest={p.cheapestBanner === b}
              series={p.series[b]}
            />
          </td>
        ))}
      </tr>
    );
  }

  function renderGroupHdr(label, count, open, onToggle) {
    return (
      <tr className="group-hdr-row" key={`hdr-${label}`}>
        <td colSpan={banners.length + 1}>
          <button className={`group-hdr${open ? ' open' : ''}`} onClick={onToggle}>
            <span>{label} <span className="group-count">({count})</span></span>
            <span className="group-chev">▾</span>
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className="compare-wrap">
      <table className="compare">
        <thead>
          <tr>
            <th className="prod-cell">Product</th>
            {banners.map(b => (
              <th key={b} className="banner-col">{bannerShort(b)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasGroups ? (
            <>
              {renderGroupHdr('★ Starred', starredList.length, tsOpen, () => setTsOpen(o => !o))}
              {tsOpen && starredList.map(renderRow)}
              {renderGroupHdr('Other', otherList.length, toOpen, () => setToOpen(o => !o))}
              {toOpen && otherList.map(renderRow)}
            </>
          ) : (
            visible.map(renderRow)
          )}
          {!visible.length && (
            <tr><td colSpan={banners.length + 1} style={{padding: '40px', textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic'}}>No products match.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Deals view ----------
function DealsView({ model }) {
  const { products, banners } = model;

  // Biggest % drop vs last week
  const byDropPct = products.filter(p => p.bestDrop).sort((a,b) => b.bestDrop.pct - a.bestDrop.pct);
  // Biggest $ drop
  const byDropAmt = products.filter(p => p.bestDrop).sort((a,b) => b.bestDrop.amt - a.bestDrop.amt);
  // Biggest sale this week (was -> price)
  const bySale = products.filter(p => p.bestSale).sort((a,b) => b.bestSale.pct - a.bestSale.pct);

  const featured = byDropPct[0] || bySale[0];
  const total_sales = products.filter(p =>
    banners.some(b => p.current[b] && p.current[b].dealType === 'SALE')
  ).length;

  // Combined ranked list: max of drop% vs sale%
  const ranked = products
    .map(p => {
      const best = [p.bestDrop, p.bestSale].filter(Boolean).sort((a,b) => b.pct - a.pct)[0];
      return best ? { p, best, kind: best === p.bestSale ? 'sale' : 'drop' } : null;
    })
    .filter(Boolean)
    .sort((a,b) => b.best.pct - a.best.pct)
    .slice(0, 20);

  return (
    <>
      <div className="section-lede">
        <h2>This week's marquee</h2>
        <p>The three loudest moves across all four banners. Percentages compare either the in-store sale against its own regular price, or this week's price against last week's.</p>
      </div>

      <div className="deals-lead">
        {featured && (
          <div className="deal-feature">
            <div className="kicker">Lead story</div>
            <div className="headline"><em>{featured.title}</em></div>
            <div className="deck">
              Biggest swing this week — at {bannerShort(featured.bestDrop?.banner || featured.bestSale?.banner)},
              down {fmtMoney((featured.bestDrop || featured.bestSale).amt)} from previous.
            </div>
            <div className="stat">
              <span className="big">−{Math.round((featured.bestDrop || featured.bestSale).pct * 100)}%</span>
              <span className="label">vs {featured.bestDrop ? 'last week' : 'regular'}</span>
            </div>
          </div>
        )}
        {byDropAmt[0] && (
          <div className="deal-feature">
            <div className="kicker">Biggest dollar cut</div>
            <div className="headline"><em>{byDropAmt[0].title}</em></div>
            <div className="deck">Absolute price drop leads the list at {bannerShort(byDropAmt[0].bestDrop.banner)}.</div>
            <div className="stat">
              <span className="big">−{fmtMoney(byDropAmt[0].bestDrop.amt)}</span>
              <span className="label">saved</span>
            </div>
          </div>
        )}
        <div className="deal-feature">
          <div className="kicker">By the numbers</div>
          <div className="headline" style={{fontSize:'24px'}}>{total_sales} items <em>on sale</em> this week, tracked across {banners.length} banners.</div>
          <div className="stat">
            <span className="big">{bySale.length}</span>
            <span className="label">promo tags active</span>
          </div>
        </div>
      </div>

      <div className="section-lede">
        <h2>Full leaderboard</h2>
        <p>Top 20 movers, ranked by percent off — whether that's a sale against list or a week-over-week change.</p>
      </div>

      <ol className="deals-list">
        {ranked.map(({p, best, kind}, i) => {
          const entry = p.current[best.banner];
          const prev = kind === 'sale' ? null : p.previous[best.banner];
          const wasAmt = kind === 'sale' ? entry?.wasPrice : prev?.price;
          return (
            <li className="deal-row" key={p.productId}>
              <div>
                <div className="name"><span className="rank">{String(i+1).padStart(2,'0')}</span>{p.title}</div>
                <div className="sub">
                  <span className="banner">{bannerShort(best.banner)}</span>
                  <span className="sep">·</span>
                  <span>{kind === 'sale' ? 'on sale' : 'down wk/wk'}</span>
                  {p.brand && <><span className="sep">·</span><span>{p.brand}</span></>}
                </div>
              </div>
              <div className="right">
                <div className="savings-pct">−{Math.round(best.pct * 100)}%</div>
                <div className="prices">
                  {wasAmt != null && <span className="was">{fmtMoney(wasAmt)}</span>} {fmtMoney(entry.price)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ---------- Cart Builder ----------
const PICKER_ORDER = ['No Frills', 'Real Canadian Superstore', 'Loblaws', 'Independent City Market'];

function CartView({ model, cart, setCart, manualChoices, setManualChoices, mode, setMode, onClear, starred, onStarToggle }) {
  const { products, banners } = model;
  const MIN_CART = 30;
  const [collapsed, setCollapsed] = useState(new Set());
  const [historyPid, setHistoryPid] = useState(null);
  const [historyAnchorRect, setHistoryAnchorRect] = useState(null);
  const [csOpen, setCsOpen] = useState(true);
  const [coOpen, setCoOpen] = useState(true);

  function toggleCollapse(banner) {
    setCollapsed(prev => { const n = new Set(prev); n.has(banner) ? n.delete(banner) : n.add(banner); return n; });
  }

  function openHistory(pid, e) {
    e.stopPropagation();
    if (historyPid === pid) { setHistoryPid(null); setHistoryAnchorRect(null); return; }
    setHistoryPid(pid);
    setHistoryAnchorRect(e.currentTarget.getBoundingClientRect());
  }

  function closeHistory() { setHistoryPid(null); setHistoryAnchorRect(null); }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closeHistory(); }
    function onDoc(e) {
      if (!e.target.closest('.ph-tooltip') && !e.target.closest('.cart-hist-btn')) closeHistory();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDoc);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onDoc); };
  }, []);

  const cartProducts = useMemo(() =>
    products.filter(p => cart[p.productId] > 0).map(p => ({ p, qty: cart[p.productId] }))
  , [products, cart]);

  function setQty(pid, q) {
    const n = Math.max(0, Math.min(99, q|0));
    const next = {...cart};
    if (n === 0) delete next[pid]; else next[pid] = n;
    setCart(next);
  }

  function chooseBanner(pid, banner) {
    setManualChoices({...manualChoices, [pid]: banner});
  }

  // For each cart product, determine which banner it lands in
  function resolvedBanner(p) {
    if (mode === 'manual' && manualChoices[p.productId]) {
      const e = p.current[manualChoices[p.productId]];
      if (e && e.price != null) return manualChoices[p.productId];
    }
    return p.cheapestBanner;
  }

  // Build auto split: for each item, cheapest banner; then collapse sub-$30 banners into next-cheapest fallback
  function computeSplit() {
    const itemPlacements = cartProducts.map(({p, qty}) => {
      // options
      const options = banners.map(b => ({ banner: b, price: p.current[b]?.price })).filter(o => o.price != null);
      options.sort((a,b) => a.price - b.price);
      return { p, qty, options };
    }).filter(x => x.options.length);

    // Initial assignment
    const assigned = {};
    itemPlacements.forEach(x => {
      let target;
      if (mode === 'manual' && manualChoices[x.p.productId]) {
        const mb = manualChoices[x.p.productId];
        if (x.options.some(o => o.banner === mb)) target = mb;
      }
      target = target || x.options[0].banner;
      (assigned[target] = assigned[target] || []).push(x);
    });

    if (mode === 'auto') {
      // Collapse sub-$30 buckets into cheapest alternative
      let changed = true; let guard = 0;
      while (changed && guard++ < 8) {
        changed = false;
        for (const banner of Object.keys(assigned)) {
          const items = assigned[banner];
          if (!items) continue;
          const subtotal = items.reduce((s, x) => s + x.options.find(o => o.banner === banner).price * x.qty, 0);
          if (subtotal < MIN_CART && subtotal > 0) {
            // Try to move all to a single other banner that would now (or already does) exceed $30
            // Compute cost delta for moving everything to each alternative
            const alts = {};
            for (const x of items) {
              for (const o of x.options) {
                if (o.banner === banner) continue;
                alts[o.banner] = (alts[o.banner] || 0) + o.price * x.qty;
              }
            }
            // Prefer alternative banner that already has items (to merge), then cheapest alt
            const candidates = Object.entries(alts).map(([b, cost]) => {
              const existing = (assigned[b] || []).reduce((s, x) => s + x.options.find(o => o.banner === b).price * x.qty, 0);
              return { b, cost, existing, combined: cost + existing };
            }).filter(c => c.combined >= MIN_CART || assigned[c.b]); // allowable if it brings another bucket over, or joins existing
            candidates.sort((a,b) => (b.existing - a.existing) || (a.cost - b.cost));
            if (candidates.length) {
              const target = candidates[0].b;
              assigned[target] = (assigned[target] || []).concat(items);
              delete assigned[banner];
              changed = true;
              break;
            }
          }
        }
      }
    }

    // Build buckets sorted by subtotal desc
    const buckets = Object.entries(assigned).map(([banner, items]) => {
      const subtotal = items.reduce((s, x) => s + x.options.find(o => o.banner === banner).price * x.qty, 0);
      return { banner, items, subtotal };
    }).sort((a,b) => b.subtotal - a.subtotal);

    const total = buckets.reduce((s,b) => s + b.subtotal, 0);

    // compute naive single-banner-each cost to show savings
    const naiveMaxBanner = banners.find(b => products.some(p => p.current[b])); // any
    let naiveCost = 0;
    itemPlacements.forEach(x => {
      // sum at first banner with price
      const e = x.options[0];
      naiveCost += e.price * x.qty;
    });
    // naive = sum of cheapest regardless of minimum (best-case, ignoring min)
    // savings = comparing auto split total vs all-in-one-cheapest banner
    // compute "all at single cheapest banner"
    let singleBannerBest = Infinity;
    for (const b of banners) {
      let cost = 0; let ok = true;
      for (const x of itemPlacements) {
        const opt = x.options.find(o => o.banner === b);
        if (!opt) { ok = false; break; }
        cost += opt.price * x.qty;
      }
      if (ok && cost < singleBannerBest) singleBannerBest = cost;
    }
    const savingsVsSingle = isFinite(singleBannerBest) ? singleBannerBest - total : 0;

    return { buckets, total, savingsVsSingle };
  }

  const { buckets, total, savingsVsSingle } = useMemo(computeSplit, [cartProducts, banners, mode, manualChoices]);

  return (
    <div className="cart-layout">
      <div>
        <div className="section-lede">
          <h2>Your cart in pieces</h2>
          <p>Add items below. Prices load from the current week's data. In <em>auto</em> mode we route each item to its cheapest banner, then collapse any cart under the ${MIN_CART} minimum into a merged cart. In <em>manual</em> mode you pick the banner yourself.</p>
        </div>

        <div className="cart-picker">
          {(() => {
            function renderProduct(p) {
              const qty = cart[p.productId] || 0;
              const opts = model.banners.map(b => ({ b, price: p.current[b]?.price }))
                .filter(o => o.price != null)
                .sort((a, b) => {
                  const ia = PICKER_ORDER.indexOf(a.b), ib = PICKER_ORDER.indexOf(b.b);
                  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                });
              if (!opts.length) return null;
              const cheapestPrice = Math.min(...opts.map(o => o.price));
              const chosen = manualChoices[p.productId] || p.cheapestBanner;
              return (
                <div className="cart-product" key={p.productId}>
                  <div className="info">
                    <div className="cart-prod-hd">
                      <StarBtn pid={p.productId} starred={starred} onToggle={onStarToggle} />
                      <div>
                        <div className="name">{p.title}{p.brand ? ` · ${p.brand}` : ''}</div>
                        <div className="banners">
                          {opts.map(({b, price}) => {
                            const isCheapest = price === cheapestPrice;
                            const premium = !isCheapest ? price - cheapestPrice : 0;
                            return (
                              <span
                                key={b}
                                className={`opt ${chosen === b ? 'chosen' : ''} ${isCheapest ? 'cheapest' : ''}`}
                                onClick={() => mode === 'manual' ? chooseBanner(p.productId, b) : null}
                                style={{cursor: mode === 'manual' ? 'pointer' : 'default'}}
                              >
                                {bannerAbbr(b)} <span className="p">{fmtMoney(price)}</span>
                                {premium > 0.005 && <span className="opt-premium">+{fmtMoney(premium)}</span>}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    className={`cart-hist-btn${historyPid === p.productId ? ' on' : ''}`}
                    onClick={e => openHistory(p.productId, e)}
                    title="Price history"
                  >
                    <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="0.5,11.5 3.5,6.5 6.5,9 9.5,2.5 12.5,5.5"/>
                    </svg>
                  </button>
                  <div className={`qty-stepper ${qty === 0 ? 'zero' : ''}`}>
                    <button onClick={() => setQty(p.productId, qty - 1)}>−</button>
                    <span className="q">{qty}</span>
                    <button onClick={() => setQty(p.productId, qty + 1)}>+</button>
                  </div>
                </div>
              );
            }

            const hasGroups = starred.size > 0;
            if (!hasGroups) return products.map(renderProduct);

            const starredProds = products.filter(p => starred.has(p.productId));
            const otherProds   = products.filter(p => !starred.has(p.productId));
            return (
              <>
                <button className={`group-hdr${csOpen ? ' open' : ''}`} onClick={() => setCsOpen(o => !o)}>
                  <span>★ Starred <span className="group-count">({starredProds.length})</span></span>
                  <span className="group-chev">▾</span>
                </button>
                <div className={`cart-group-body${csOpen ? '' : ' closed'}`}>
                  {starredProds.map(renderProduct)}
                </div>
                <button className={`group-hdr${coOpen ? ' open' : ''}`} onClick={() => setCoOpen(o => !o)}>
                  <span>Other <span className="group-count">({otherProds.length})</span></span>
                  <span className="group-chev">▾</span>
                </button>
                <div className={`cart-group-body${coOpen ? '' : ' closed'}`}>
                  {otherProds.map(renderProduct)}
                </div>
              </>
            );
          })()}
        </div>
        {historyPid && (() => {
          const hp = products.find(x => x.productId === historyPid);
          return hp ? <PriceHistoryTooltip product={hp} weeks={model.weeks} anchorRect={historyAnchorRect} onClose={closeHistory} /> : null;
        })()}
      </div>

      <div className="cart-summary">
        <div className="summary-header">
          <div className="grand">{fmtMoney(total)}</div>
          {cartProducts.length > 0 && (
            <button className="clear-cart-btn" onClick={onClear}>Clear cart</button>
          )}
        </div>

        <div className="mode-toggle">
          <button className={mode === 'auto' ? 'active' : ''} onClick={() => setMode('auto')}>Auto split</button>
          <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>Manual</button>
        </div>

        {cartProducts.length === 0 ? (
          <div className="empty-cart">
            Empty cart.
            <div className="hint">Add items from the table →</div>
          </div>
        ) : (
          <div className="cart-split">
            {buckets.map(({banner, items, subtotal}) => {
              const okMin = subtotal >= MIN_CART;
              const isCollapsed = collapsed.has(banner);
              return (
                <div className={`split-bucket ${okMin ? 'ok' : 'warn'}${isCollapsed ? ' collapsed' : ''}`} key={banner}>
                  <div className="head" onClick={() => toggleCollapse(banner)}>
                    <span className="banner-name">{bannerShort(banner)}</span>
                    <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                      <span className="subtotal">{fmtMoney(subtotal)}</span>
                      <span className="bucket-toggle">{isCollapsed ? '+' : '−'}</span>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <>
                      <ul>
                        {items.map(({p, qty, options}) => {
                          const e = options.find(o => o.banner === banner);
                          const cheapest = options[0];
                          const premium = (banner !== cheapest.banner) ? (e.price - cheapest.price) * qty : 0;
                          return (
                            <li key={p.productId}>
                              <span className="nm">{qty}× {p.title}</span>
                              <span className="n">
                                {fmtMoney(e.price * qty)}
                                {premium > 0.005 && (
                                  <span className="item-premium">+{fmtMoney(premium)} vs {bannerAbbr(cheapest.banner)}</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      {okMin ? (
                        <div className="ok-msg">Meets ${MIN_CART} minimum</div>
                      ) : (
                        <div className="gap-msg">${(MIN_CART - subtotal).toFixed(2)} short of minimum</div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {savingsVsSingle > 0.01 && (
              <div className="savings-note">
                Splitting saves <span className="amt">{fmtMoney(savingsVsSingle)}</span> over buying everything from a single cheapest banner.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- App shell ----------
function App() {
  const [model, setModel] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState('cart');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dailyloonie_cart_v1') || '{}'); }
    catch { return {}; }
  });
  const [manualChoices, setManualChoices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dailyloonie_manual_v1') || '{}'); }
    catch { return {}; }
  });
  const [mode, setMode] = useState(() => localStorage.getItem('dailyloonie_mode_v1') || 'auto');
  const [starred, setStarred] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dailyloonie_starred_v1') || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    GroceryData.loadData().then(setModel).catch(e => { console.error(e); setErr(String(e)); });
  }, []);

  useEffect(() => { localStorage.setItem('dailyloonie_cart_v1', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('dailyloonie_manual_v1', JSON.stringify(manualChoices)); }, [manualChoices]);
  useEffect(() => { localStorage.setItem('dailyloonie_mode_v1', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('dailyloonie_starred_v1', JSON.stringify([...starred])); }, [starred]);

  function toggleCart(pid) {
    setCart(c => {
      const next = {...c};
      if (next[pid]) delete next[pid]; else next[pid] = 1;
      return next;
    });
  }

  function clearCart() {
    setCart({});
    setManualChoices({});
  }

  function toggleStar(pid) {
    setStarred(s => {
      const n = new Set(s);
      n.has(pid) ? n.delete(pid) : n.add(pid);
      return n;
    });
  }

  if (err) return <div className="page"><div className="error">Couldn't load data — {err}<br/>Tip: serve this page over http (not file://), since it fetches CSV at runtime.</div></div>;
  if (!model) return <div className="page"><div className="loading">Loading this week's prices…</div></div>;

  const { banners, products, currentWeek } = model;
  const cartCount = Object.values(cart).reduce((s,n) => s+n, 0);

  // filter chips counts
  const counts = {
    all: products.length,
    onsale: products.filter(p => banners.some(b => p.current[b] && p.current[b].dealType)).length,
    dropped: products.filter(p => p.bestDrop).length,
  };
  banners.forEach(b => {
    counts[b] = products.filter(p => p.current[b] && p.current[b].price != null).length;
  });

  return (
    <div className="page">
      <header className="masthead">
        <div className="title h-display">Daily <em>Loonie</em></div>
        <div className="meta">
          <span className="label">Week of</span>
          <div className="edition">{currentWeek ? currentWeek.date.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' }) : ''}</div>
          <div style={{marginTop: 6}}>{banners.length} banners · {products.length} products tracked</div>
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === 'cart' ? 'active' : ''}`} onClick={() => setTab('cart')}>
          Cart builder <span className="count">{cartCount}</span>
        </button>
        <button className={`tab ${tab === 'compare' ? 'active' : ''}`} onClick={() => setTab('compare')}>
          Compare <span className="count">{products.length}</span>
        </button>
        <button className={`tab ${tab === 'deals' ? 'active' : ''}`} onClick={() => setTab('deals')}>
          Best deals <span className="count">{counts.onsale}</span>
        </button>
      </nav>

      {tab === 'compare' && (
        <>
          <div className="compare-toolbar">
            <div className="search">
              <input
                type="text"
                placeholder="Search products, brands…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="name">Sort: alphabetical</option>
              <option value="price">Sort: cheapest first</option>
              <option value="savings">Sort: biggest savings</option>
            </select>
          </div>
          <div className="chip-row" style={{marginBottom: '20px'}}>
            <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All<span className="n">{counts.all}</span></button>
            <button className={`chip ${filter === 'onsale' ? 'active' : ''}`} onClick={() => setFilter('onsale')}>On sale<span className="n">{counts.onsale}</span></button>
            <button className={`chip ${filter === 'dropped' ? 'active' : ''}`} onClick={() => setFilter('dropped')}>Price dropped<span className="n">{counts.dropped}</span></button>
            {banners.map(b => (
              <button key={b} className={`chip ${filter === b ? 'active' : ''}`} onClick={() => setFilter(b)}>
                {bannerShort(b)}<span className="n">{counts[b]}</span>
              </button>
            ))}
          </div>
          <CompareTable model={model} filter={filter} search={search} cart={cart} onToggle={toggleCart} sort={sort} starred={starred} onStarToggle={toggleStar} />
        </>
      )}

      {tab === 'deals' && <DealsView model={model} />}

      {tab === 'cart' && (
        <CartView
          model={model}
          cart={cart}
          setCart={setCart}
          onClear={clearCart}
          manualChoices={manualChoices}
          setManualChoices={setManualChoices}
          mode={mode}
          setMode={setMode}
          starred={starred}
          onStarToggle={toggleStar}
        />
      )}

      <div className="footer-note">
        <span>Daily Loonie — weekly price index for the Loblaws family</span>
        <span>Data refreshed every Monday · {model.weeks.length} weeks on record</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
