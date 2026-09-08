/* ---------------------------------------------------------------------------
   render.js — builds the module. One code path produces both the live preview
   and the exported file, so what you see is exactly what you ship.
   --------------------------------------------------------------------------- */

const PAL = { orange:'#d95926', blue:'#3987e5', violet:'#9085e9', amber:'#c98500',
              green:'#199e70', neutral:'#4a4a45', bone:'#f2f2ee', grey:'#8a8880' };
const SERIES = [PAL.orange, PAL.blue, PAL.violet, PAL.amber, PAL.green];
const MAT_C = PAL.green, PAT_C = PAL.bone;

const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt = (n, d = 1) => Number(n).toFixed(d).replace(/\.0+$/, '');
const yrs = y => y >= 1000 ? fmt(y / 1000, 1) + ',000' : String(Math.round(y));
const yrLabel = y => (y >= 10000 ? Math.round(y / 1000) * 1000 : Math.round(y)).toLocaleString('en-US');
const prec = p => p === 'published' ? '' : '~';

/* ------------------------------------------------------------- composition */
function prepComposition(list) {
  const s = list.slice().sort((a, b) => b.pct - a.pct);
  const top = s.slice(0, 5), rest = s.slice(5);
  const bands = top.map((r, i) => ({ ...r, key: 'c' + i, color: SERIES[i] }));
  if (rest.length) {
    bands.push({ label: `Other (${rest.length} region${rest.length > 1 ? 's' : ''})`,
                 pct: rest.reduce((t, r) => t + r.pct, 0), key: 'cx', color: PAL.neutral, parts: rest });
  }
  return bands;
}

/* ------------------------------------------------------------ view 1: time */
const TL = { W:1040, H:322, axY:252, x0:40, x1:880, hi:1e5, lo:100, lane:{0:196, 1:128} };
const tlx = v => TL.x0 + (TL.x1 - TL.x0) *
  ((Math.log10(TL.hi) - Math.log10(Math.max(TL.lo, Math.min(TL.hi, v)))) / (Math.log10(TL.hi) - Math.log10(TL.lo)));
const TICKS = [[1e5,'100k'],[5e4,'50k'],[2e4,'20k'],[1e4,'10k'],[5e3,'5k'],[2e3,'2k'],
               [1e3,'1k'],[500,'500'],[200,'200'],[100,'100']];

function viewTime(st) {
  const nodes = [];
  const push = (kind, color, e, label) => {
    if (!e || !e.coalescence) return;
    const c = e.coalescence;
    nodes.push({ key: kind, color, label, value: c.precision === 'published'
        ? `${yrLabel(c.y)} y${c.lo ? ` (${yrLabel(c.lo)}–${yrLabel(c.hi)})` : ''}`
        : `~${yrLabel(c.y)} y`,
      y: c.y, lo: c.lo || c.y, hi: c.hi || c.y, entry: e, kindLabel: kind === 'mt' ? 'Maternal' : 'Paternal',
      note: e.note, sources: e.sources || [], scope: c.scope, precision: c.precision });
  };
  push('mt', MAT_C, st.mt && st.mt.entry, (st.mt && st.mt.display) || (st.mt && st.mt.label));
  push('y',  PAT_C, st.y  && st.y.entry,  (st.y && st.y.label));

  // lanes: separate only when the labels would collide
  if (nodes.length === 2 && Math.abs(tlx(nodes[0].y) - tlx(nodes[1].y)) < 260) nodes[1].lane = 1;
  nodes.forEach(n => { if (n.lane == null) n.lane = 0; });

  const o = [];
  o.push(`<svg class="tlsvg" viewBox="0 30 ${TL.W} ${TL.H - 30}" role="img" aria-label="Logarithmic timeline of lineage and context dates">`);
  // context anchors as faint rules
  ANCHORS.forEach((a, i) => {
    const x = tlx(a.y), ty = 46 + (i % 2) * 15, anch = x > TL.W * 0.62 ? 'end' : 'start';
    o.push(`<g class="node anchor" id="a-${a.id}" tabindex="0" role="button" aria-label="${esc(a.label)}, about ${yrLabel(a.y)} years ago">`);
    o.push(`<rect class="hit" x="${(x-70).toFixed(1)}" y="36" width="140" height="${TL.axY-36}"/>`);
    o.push(`<line class="grule" x1="${x.toFixed(1)}" y1="${ty + 4}" x2="${x.toFixed(1)}" y2="${TL.axY}"/>`);
    o.push(`<text class="alab" x="${(anch === 'end' ? x - 5 : x + 5).toFixed(1)}" y="${ty}" text-anchor="${anch}">${esc(a.label.toUpperCase())}</text>`);
    o.push('</g>');
  });
  // axis
  o.push(`<line class="ax" x1="${TL.x0}" y1="${TL.axY}" x2="${TL.x1}" y2="${TL.axY}"/>`);
  TICKS.forEach(([v, l]) => {
    const x = tlx(v);
    o.push(`<line class="tick" x1="${x.toFixed(1)}" y1="${TL.axY}" x2="${x.toFixed(1)}" y2="${TL.axY+6}"/>`);
    o.push(`<text class="tk" x="${x.toFixed(1)}" y="${TL.axY+20}" text-anchor="middle">${l}</text>`);
  });
  o.push(`<text class="axcap" x="${TL.x0}" y="${TL.axY+44}">years before present &middot; log scale</text>`);
  o.push(`<g class="brk"><line x1="898" y1="${TL.axY+5}" x2="906" y2="${TL.axY-5}"/><line x1="908" y1="${TL.axY+5}" x2="916" y2="${TL.axY-5}"/></g>`);
  // present column
  const cx = 946, cw = 28, top = 100; let yy = top;
  st.bands.forEach(b => {
    const h = (TL.axY - top) * b.pct / 100;
    o.push(`<rect class="pcol" x="${cx}" y="${yy.toFixed(1)}" width="${cw}" height="${h.toFixed(1)}" fill="${b.color}"/>`);
    if (b.pct >= 10) o.push(`<text class="pcl" x="${cx+cw+7}" y="${(yy+h/2+3.2).toFixed(1)}" fill="${b.color}">${fmt(b.pct)}%</text>`);
    yy += h;
  });
  o.push(`<line class="tick" x1="${cx+cw/2}" y1="${TL.axY}" x2="${cx+cw/2}" y2="${TL.axY+6}"/>`);
  o.push(`<text class="tk tknow" x="${cx+cw/2}" y="${TL.axY+20}" text-anchor="middle">NOW</text>`);
  // lineage nodes
  nodes.forEach((n, i) => {
    const x = tlx(n.y), ly = TL.lane[n.lane], xl = tlx(n.hi), xh = tlx(n.lo);
    const anch = x > TL.W * 0.6 ? 'end' : 'start', tx = anch === 'end' ? x - 5 : x + 5;
    o.push(`<g class="node lineage" id="t-${n.key}" tabindex="0" role="button" aria-label="${esc(n.kindLabel)} lineage ${esc(n.label)}">`);
    o.push(`<rect class="hit" x="${Math.min(xl, x-70).toFixed(1)}" y="${ly-40}" width="${(Math.max(xh, x+70)-Math.min(xl, x-70)).toFixed(1)}" height="${TL.axY-ly+44}"/>`);
    o.push(`<g class="ci" stroke="${n.color}"><line x1="${xl.toFixed(1)}" y1="${ly-26}" x2="${xh.toFixed(1)}" y2="${ly-26}"/><line x1="${xl.toFixed(1)}" y1="${ly-31}" x2="${xl.toFixed(1)}" y2="${ly-21}"/><line x1="${xh.toFixed(1)}" y1="${ly-31}" x2="${xh.toFixed(1)}" y2="${ly-21}"/></g>`);
    o.push(`<line class="stem" x1="${x.toFixed(1)}" y1="${ly+26}" x2="${x.toFixed(1)}" y2="${TL.axY-3}" stroke="${n.color}"/>`);
    o.push(`<circle class="dot" cx="${x.toFixed(1)}" cy="${TL.axY}" r="4" fill="${n.color}"/>`);
    o.push(`<circle class="halo" cx="${x.toFixed(1)}" cy="${TL.axY}" r="9" stroke="${n.color}"/>`);
    o.push(`<text class="eb" x="${tx.toFixed(1)}" y="${ly}" text-anchor="${anch}" fill="${n.color}">${n.key==='mt'?'&#9792;':'&#9794;'} ${esc(n.label.toUpperCase())} COALESCES</text>`);
    o.push(`<text class="vl" x="${tx.toFixed(1)}" y="${ly+19}" text-anchor="${anch}">${esc(n.value)}</text>`);
    o.push('</g>');
  });
  o.push('</svg>');

  const cards = [`<div class="card card-def">Two kinds of mark. The faint vertical rules are shared
    context — events every genome sits downstream of. The bright markers are your two lineages, with
    their published confidence intervals drawn as bars, and the column at the right is your
    composition today. <span class="hint">Hover or tab through a marker.</span></div>`];
  ANCHORS.forEach(a => cards.push(`<div class="card card-a-${a.id}"><span class="ck" style="color:${PAL.grey}">${esc(a.label.toUpperCase())} &middot; ~${yrLabel(a.y)} Y</span>${a.note}${a.sources.length?`<span class="cite">${a.sources.map(esc).join(' &middot; ')}</span>`:''}</div>`));
  nodes.forEach(n => cards.push(`<div class="card card-t-${n.key}"><span class="ck" style="color:${n.color}">${n.key==='mt'?'&#9792; MATERNAL':'&#9794; PATERNAL'} &middot; ${esc(n.label)}</span>${n.scope?`<b>${esc(n.value)}</b> — ${esc(n.scope)}. `:''}${n.note}${n.precision!=='published'?' <i>This date is a widely reported range rather than a single published figure; treat it as approximate.</i>':''}${n.sources.length?`<span class="cite">${n.sources.map(esc).join(' &middot; ')}</span>`:''}</div>`));
  return { html: `<div class="tl">${o.join('')}<div class="cards">${cards.join('')}</div></div>`,
           keys: ['def', ...ANCHORS.map(a => 'a-' + a.id), ...nodes.map(n => 't-' + n.key)], scope: 'tl' };
}

/* ------------------------------------------------------------- view 2: map */
const MAP = { W:700, H:524, s:24.15, pad:7 };
const Px = (lon, lat) => [ (lon - FRAME.lon0) * FRAME.k * MAP.s, (FRAME.lat1 - lat) * MAP.s + MAP.pad ];
const inFrame = (lon, lat) => lon >= FRAME.lon0 && lon <= FRAME.lon1 && lat >= FRAME.lat0 && lat <= FRAME.lat1;
const dpath = (pts, close) => 'M' + pts.map(p => { const q = Px(p[0], p[1]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' L') + (close ? ' Z' : '');
function bez(a, b, bow) {
  const [x1,y1] = Px(a[0],a[1]), [x2,y2] = Px(b[0],b[1]);
  const mx=(x1+x2)/2, my=(y1+y2)/2, dx=x2-x1, dy=y2-y1;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx-dy*bow).toFixed(1)},${(my+dx*bow).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}
const regionPoint = label => {
  const k = String(label).toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z& ]/g,'').replace(/\s+/g,' ').trim();
  if (REGION_GEO[k]) return REGION_GEO[k];
  const keys = Object.keys(REGION_GEO).sort((a,b)=>b.length-a.length);
  for (const kk of keys) if (k.includes(kk)) return REGION_GEO[kk];
  return null;
};

const anchorFor = x => x < 110 ? 'start' : x > MAP.W - 110 ? 'end' : 'middle';
const ax = x => x < 110 ? 6 : x > MAP.W - 110 ? MAP.W - 6 : x;

function viewMap(st) {
  const washes = [], offFrame = [], unplaced = [];
  st.bands.forEach(b => {
    if (b.key === 'cx') return;
    const p = regionPoint(b.label);
    if (!p) { unplaced.push(b); return; }
    if (!inFrame(p[0], p[1])) { offFrame.push({ ...b, p }); return; }
    washes.push({ ...b, p });
  });
  const lines = [];
  const addLine = (kind, color, side, hg) => {
    if (!hg || !hg.entry) return;
    const e = hg.entry, pts = (e.freqs || []).filter(f => inFrame(f.lon, f.lat));
    (e.freqs || []).filter(f => !inFrame(f.lon, f.lat)).forEach(f => offFrame.push({ label: `${side} ${e.label}: ${f.label} ${prec(f.precision)}${fmt(f.pct)}%`, external: true }));
    const org = e.origin && inFrame(e.origin.lon, e.origin.lat) ? e.origin : null;
    if (!pts.length && !org) return;
    let orgLabel = e.origin ? e.origin.label.toUpperCase() : '', orgFreq = '';
    if (org) pts.forEach(f => {
      if (Math.abs(f.lon - org.lon) < 0.6 && Math.abs(f.lat - org.lat) < 0.6) {
        f.atOrigin = true;
        orgFreq = `${esc(f.label)} ${prec(f.precision)}${fmt(f.pct)}%`;
      }
    });
    lines.push({ kind, color, side, entry: e, label: hg.display || hg.label, pts, org, orgLabel, orgFreq });
  };
  addLine('mt', MAT_C, 'Maternal', st.mt);
  addLine('y',  PAT_C, 'Paternal', st.y);

  if (!washes.length && !lines.length) {
    return { html: `<div class="mp nomap"><div class="empty"><b>Nothing to map.</b> None of your
      regions or lineage frequencies fall inside the European and Mediterranean frame this build
      ships. The other views are unaffected. Extending the coastline is a data-only contribution —
      see CONTRIBUTING.md.</div></div>`, keys: [], scope: 'mp', skip: true };
  }

  const o = [`<svg class="mapsvg" viewBox="0 0 ${MAP.W} ${MAP.H}" role="img" aria-label="Map of Europe and the Mediterranean showing ancestry regions and lineage paths">`];
  o.push('<defs>');
  washes.forEach(w => o.push(`<radialGradient id="gw${w.key}"><stop offset="0" stop-color="${w.color}" stop-opacity="0.5"/><stop offset="0.55" stop-color="${w.color}" stop-opacity="0.16"/><stop offset="1" stop-color="${w.color}" stop-opacity="0"/></radialGradient>`));
  o.push(`<clipPath id="mframe"><rect x="0" y="${MAP.pad}" width="${MAP.W}" height="${MAP.H - 2*MAP.pad}"/></clipPath></defs>`);
  o.push('<g clip-path="url(#mframe)"><g class="washes">');
  washes.forEach(w => { const [x,y] = Px(w.p[0], w.p[1]);
    o.push(`<circle class="wash" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(20*Math.sqrt(w.pct)).toFixed(1)}" fill="url(#gw${w.key})"/>`); });
  o.push('</g><g class="coast">');
  Object.keys(COAST).forEach(k => o.push(`<path d="${dpath(COAST[k], COAST_OPEN.indexOf(k) < 0)}"/>`));
  o.push('</g>');
  const placed = [];
  washes.forEach(w => {                       // labels, biggest share first, nudged clear
    const [x, y0] = Px(w.p[0], w.p[1]);
    const halfW = Math.max(30, w.label.length * 3.1);
    let y = y0, guard = 0;
    while (guard++ < 14 && placed.some(b => Math.abs(b.y - y) < 30 && Math.abs(b.x - x) < b.halfW + halfW))
      y += 32;
    placed.push({ x, y, halfW });
    w.ly = y;
  });
  washes.forEach(w => { const x = Px(w.p[0], w.p[1])[0], y = w.ly;
    o.push(`<g class="node region" id="m-${w.key}" tabindex="0" role="button" aria-label="${esc(w.label)}, ${fmt(w.pct)} percent">`);
    o.push(`<circle class="hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(20*Math.sqrt(w.pct)*0.72, 26).toFixed(1)}"/>`);
    o.push(`<text class="rl" x="${ax(x).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="${anchorFor(x)}" fill="${w.color}">${esc(w.label.toUpperCase())}</text>`);
    o.push(`<text class="rp" x="${ax(x).toFixed(1)}" y="${(y+16).toFixed(1)}" text-anchor="${anchorFor(x)}" fill="${w.color}">${fmt(w.pct)}%</text></g>`); });
  lines.forEach(L => {
    o.push(`<g class="node lin" id="m-${L.kind}" tabindex="0" role="button" aria-label="${esc(L.side)} lineage ${esc(L.label)}">`);
    if (L.org) L.pts.forEach((f, i) => {
      const bow = (f.lon >= L.org.lon ? 1 : -1) * (0.16 + 0.05 * i);
      o.push(`<path class="lnk" d="${bez([L.org.lon,L.org.lat],[f.lon,f.lat], bow)}" stroke="${L.color}"/>`);
    });
    L.pts.forEach(f => { const [x, y0] = Px(f.lon, f.lat);
      if (f.atOrigin) return;                       // folded into the origin label
      const halfW = Math.max(26, (f.label.length + 6) * 2.6);
      let y = y0 + 16, guard = 0;
      while (guard++ < 10 && placed.some(b => Math.abs(b.y - y) < 15 && Math.abs(b.x - x) < b.halfW + halfW)) y += 16;
      placed.push({ x, y, halfW });
      o.push(`<circle class="lp" cx="${x.toFixed(1)}" cy="${y0.toFixed(1)}" r="3" fill="${L.color}"/>`);
      o.push(`<text class="fq" x="${ax(x).toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchorFor(x)}" fill="${L.color}">${esc(f.label)} ${prec(f.precision)}${fmt(f.pct)}%</text>`); });
    if (L.org) { const [x,y] = Px(L.org.lon, L.org.lat);
      o.push(`<circle class="lo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${L.color}"/>`);
      o.push(`<text class="fq fqo" x="${ax(x).toFixed(1)}" y="${(y-14).toFixed(1)}" text-anchor="${anchorFor(x)}" fill="${L.color}">${L.kind==='mt'?'&#9792;':'&#9794;'} ${esc(L.label)} &middot; ${L.orgLabel}</text>`);
      if (L.orgFreq) o.push(`<text class="fq" x="${ax(x).toFixed(1)}" y="${(y+18).toFixed(1)}" text-anchor="${anchorFor(x)}" fill="${L.color}">${L.orgFreq}</text>`); }
    o.push('</g>');
  });
  o.push('</g></svg>');

  const cards = [`<div class="card card-def">Diffuse fill is a share of your genome. A line is a single
    lineage — one ancestor per generation, traced back without recombination. Different kinds of claim,
    drawn differently on purpose. Every frequency shown is a published one.
    <span class="hint">Hover a wash or a lineage.</span></div>`];
  washes.forEach(w => cards.push(`<div class="card card-m-${w.key}"><span class="ck" style="color:${w.color}">${esc(w.label.toUpperCase())} &middot; ${fmt(w.pct)}%</span>Your provider's estimate for this region, placed at its approximate centre. The wash is scaled by share, not by any claim about borders — regional assignment inside a continent is the weakest part of the method.</div>`));
  lines.forEach(L => cards.push(`<div class="card card-m-${L.kind}"><span class="ck" style="color:${L.color}">${L.kind==='mt'?'&#9792; MATERNAL':'&#9794; PATERNAL'} &middot; ${esc(L.label)}</span>${L.entry.note}${L.entry.sources && L.entry.sources.length?`<span class="cite">${L.entry.sources.map(esc).join(' &middot; ')}</span>`:''}</div>`));

  let foot = '';
  if (offFrame.length || unplaced.length) {
    const bits = [];
    if (offFrame.length) bits.push('Outside the mapped frame: ' + offFrame.map(f => esc(f.external ? f.label : f.label)).join(' &middot; ') + '.');
    if (unplaced.length) bits.push('No map position on file for: ' + unplaced.map(u => esc(u.label)).join(' &middot; ') + '.');
    foot = `<div class="mapfoot">${bits.join(' ')} Listed rather than dropped — see CONTRIBUTING.md.</div>`;
  }
  return { html: `<div class="mp"><div class="mapwrap">${o.join('')}${foot}</div><div class="cards">${cards.join('')}</div></div>`,
           keys: ['def', ...washes.map(w => 'm-' + w.key), ...lines.map(L => 'm-' + L.kind)], scope: 'mp' };
}

/* ----------------------------------------------------------- view 3: strip */
function viewStrip(st) {
  const o = ['<div class="st">'];
  const lin = (side, sym, color, hg, tail) => hg && (hg.display || hg.label)
    ? `<div class="lin${side==='Paternal'?' linr':''}"><span class="lk" style="color:${color}">${sym} ${side.toUpperCase()} LINE</span><span class="lv">${esc(hg.display || hg.label)}</span><span class="ln">${tail}</span></div>`
    : `<div class="lin${side==='Paternal'?' linr':''}"><span class="lk" style="color:${PAL.grey}">${sym} ${side.toUpperCase()} LINE</span><span class="lv dim">not determined</span><span class="ln">${side==='Paternal'?'No Y chromosome in this data, or no haplogroup entered.':'No maternal haplogroup could be assigned.'}</span></div>`;
  const mtTail = st.mt && st.mt.entry
    ? `mother&rsquo;s mother&rsquo;s mother&rsquo;s&hellip; ${st.mt.entry.coalescence ? (st.mt.entry.coalescence.precision==='published' ? `coalesced ${yrLabel(st.mt.entry.coalescence.y)} years ago.` : `coalesced roughly ${yrLabel(st.mt.entry.coalescence.y)} years ago.`) : ''} ${st.mt.computed ? 'Called from your own mitochondrial genotypes.' : 'As entered.'}`
    : 'mother&rsquo;s mother&rsquo;s mother&rsquo;s&hellip;';
  const yTail = st.y && st.y.entry
    ? `father&rsquo;s father&rsquo;s father&rsquo;s&hellip; ${st.y.entry.coalescence ? (st.y.entry.coalescence.precision==='published' ? `common ancestor ${yrLabel(st.y.entry.coalescence.y)} years ago.` : `expanded roughly ${yrLabel(st.y.entry.coalescence.y)} years ago.`) : ''} As entered from your provider&rsquo;s report.`
    : 'father&rsquo;s father&rsquo;s father&rsquo;s&hellip;';
  o.push('<div class="lins">');
  o.push(lin('Maternal', '&#9792;', MAT_C, st.mt, mtTail));
  o.push('<div class="linmid">Two lines above &mdash; one ancestor per generation each.<br/>The bar below is all of them.</div>');
  o.push(lin('Paternal', '&#9794;', PAT_C, st.y, yTail));
  o.push('</div><div class="bar">');
  st.bands.forEach(b => o.push(`<div class="seg${b.key==='cx'?' seg-x':''}${b.pct<6?' seg-tiny':''}" id="s-${b.key}" tabindex="0" role="button" style="flex:${b.pct};--c:${b.color}" aria-label="${esc(b.label)}, ${fmt(b.pct)} percent"><span class="sv">${fmt(b.pct)}%</span><span class="sl">${esc(b.label)}</span></div>`));
  o.push('</div>');
  const other = st.bands.find(b => b.key === 'cx');
  if (other) {
    o.push(`<div class="tier"><div class="tbar" style="flex:${100-other.pct}"></div><div class="tsub" style="flex:${other.pct}">`);
    other.parts.forEach((p, i) => o.push(`<div class="tseg tseg${Math.min(i,2)}" style="flex:${p.pct};--c:${PAL.neutral}"></div>`));
    o.push('</div></div>');
    o.push(`<div class="tnote"><b>Grouped as other</b> &mdash; ${other.parts.map(p => `${esc(p.label)} ${fmt(p.pct)}%`).join(' &middot; ')}.</div>`);
  }
  const cards = [`<div class="card card-def">One bar, one genome. Widths are your provider's estimates,
    not this tool's: assigning ancestry to a region needs labelled reference panels, which a raw file
    does not contain. The confidence intervals behind these numbers are wider than the decimal places
    imply. <span class="hint">Hover a band.</span></div>`];
  st.bands.forEach(b => cards.push(`<div class="card card-s-${b.key}"><span class="ck" style="color:${b.color}">${esc(b.label.toUpperCase())} &middot; ${fmt(b.pct)}%</span>${b.parts
    ? 'The bands your provider placed below the top five, grouped so the chart stays readable: ' + b.parts.map(p => `${esc(p.label)} ${fmt(p.pct)}%`).join(', ') + '.'
    : 'As reported by your provider. Regional assignment within a continent is the hardest case in the method, so read neighbouring bands as a soft boundary rather than a line.'}</div>`));
  o.push(`<div class="cards">${cards.join('')}</div></div>`);
  return { html: o.join(''), keys: ['def', ...st.bands.map(b => 's-' + b.key)], scope: 'st' };
}

/* -------------------------------------------------- view 4: genome structure */
function viewROH(st) {
  const r = st.roh, itp = st.rohInterp;
  const W = 1040, rowH = 20, H = 22 * rowH + 34;
  const maxLen = CHR_LEN_37[1], x0 = 34, x1 = W - 10;
  const o = [`<svg class="rohsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Runs of homozygosity by chromosome">`];
  for (let c = 1; c <= 22; c++) {
    const y = 12 + (c - 1) * rowH;
    const w = (x1 - x0) * CHR_LEN_37[c] / maxLen;
    o.push(`<text class="chl" x="${x0-8}" y="${y+4}" text-anchor="end">${c}</text>`);
    o.push(`<rect class="chbar" x="${x0}" y="${y-4}" width="${w.toFixed(1)}" height="8" rx="1"/>`);
    (r.perChrom[c] ? r.perChrom[c].segs : []).forEach(s => {
      const sx = x0 + (x1 - x0) * s.start / maxLen, sw = Math.max(1.5, (x1 - x0) * s.bp / maxLen);
      o.push(`<rect class="rohseg" x="${sx.toFixed(1)}" y="${y-5}" width="${sw.toFixed(1)}" height="10" rx="1"><title>chr${c}:${(s.start/1e6).toFixed(1)}–${(s.end/1e6).toFixed(1)} Mb · ${(s.bp/1e6).toFixed(1)} Mb · ${s.nSnp} SNPs</title></rect>`);
    });
  }
  o.push(`<text class="axcap" x="${x0}" y="${H-8}">chromosome length to scale &middot; marks are runs of homozygosity &ge;1 Mb</text>`);
  o.push('</svg>');
  const stat = (k, v, s) => `<div class="stat"><span class="sk">${k}</span><span class="svv">${v}</span>${s?`<span class="ss">${s}</span>`:''}</div>`;
  return { html: `<div class="rh">
    <div class="stats">
      ${stat('F<sub>ROH</sub>', (r.fRoh*100).toFixed(2) + '%', 'of the autosome in runs')}
      ${stat('Segments', String(r.count), '&ge;1 Mb')}
      ${stat('Total', (r.totalBp/1e6).toFixed(1) + ' Mb', '')}
      ${stat('Longest', (r.longest/1e6).toFixed(1) + ' Mb', '')}
      ${stat('&ge;4 Mb', String(r.b4_8 + r.b8), 'the discriminating band')}
    </div>
    ${o.join('')}
    <div class="verdict verdict-${itp.key}"><span class="ck">${esc(itp.head.toUpperCase())}</span>${itp.body}</div>
    <div class="method">Method: PLINK-style sliding window, ${r.params.WIN} SNPs, &le;${r.params.MAX_HET} heterozygote,
      merged runs kept at &ge;1 Mb, &ge;${r.params.MIN_SNP} SNPs, &ge;${r.params.MIN_DENSITY} SNPs/Mb, with a
      ${r.params.MAX_GAP/1e6} Mb maximum gap. The density floor and the gap cap are what keep centromeres out:
      an array has no probes there, and absence of heterozygous calls is not evidence of homozygosity.
      Without them this number comes out roughly eight times too high.</div>
  </div>`, keys: [], scope: 'rh' };
}

/* ---------------------------------------------------------------- module CSS
   Shared by the live preview and the exported file, so they cannot drift. */
const ANC_CSS = `
.anc{
  --bg:#070707; --p1:#0e0e0d; --p2:#141413; --p3:#1b1b19;
  --line:#282825; --soft:#1c1c1a;
  --tx:#f2f2ee; --t2:#a8a7a0; --t3:#6d6c66;
  --mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg); color:var(--tx); font-family:var(--sans);
  font-size:15px; line-height:1.62; -webkit-font-smoothing:antialiased;
  border:1px solid var(--line); border-radius:4px;
  padding:44px clamp(18px,4vw,52px) 34px; box-sizing:border-box;
  max-width:1180px; margin:0 auto; overflow:hidden;
  font-variant-numeric:tabular-nums;
}
.anc *{box-sizing:border-box;}
.anc .inner{max-width:1080px;margin:0 auto;}

/* --- type roles ------------------------------------------------------- */
.anc .eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--t3);margin:0 0 14px;}
.anc h2.t{font-family:var(--sans);font-size:clamp(27px,3.6vw,38px);line-height:1.04;font-weight:660;
  letter-spacing:-.026em;margin:0 0 18px;text-wrap:balance;color:var(--tx);}
.anc .deck{font-size:16px;line-height:1.6;color:var(--t2);max-width:64ch;margin:0 0 22px;}
.anc .deck b{color:var(--tx);font-weight:600;}
.anc .meta{display:flex;flex-wrap:wrap;gap:0 26px;font-family:var(--mono);font-size:11px;
  letter-spacing:.05em;color:var(--t3);padding:12px 0 0;border-top:1px solid var(--soft);}
.anc .meta b{color:var(--t2);font-weight:500;}

.anc section.mod{padding:44px 0 0;margin:44px 0 0;border-top:1px solid var(--line);}
.anc h3{font-family:var(--sans);font-size:21px;line-height:1.2;font-weight:640;letter-spacing:-.016em;
  margin:0 0 8px;color:var(--tx);display:flex;align-items:baseline;gap:12px;text-wrap:balance;}
.anc h3 .num{font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.16em;
  color:var(--t3);flex:0 0 auto;}
.anc .sub{font-size:14.5px;color:var(--t2);max-width:70ch;margin:0 0 26px;}

/* --- shared hover card slot ------------------------------------------- */
.anc .cards{display:grid;margin-top:20px;}
.anc .card{grid-area:1/1;opacity:0;pointer-events:none;transition:opacity .16s ease;
  font-size:14px;line-height:1.62;color:var(--t2);max-width:76ch;}
.anc .card b{color:var(--tx);font-weight:600;}
.anc .card i{color:var(--t2);}
.anc .card-def{opacity:1;}
.anc .ck{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.15em;
  margin-bottom:7px;}
.anc .hint{color:var(--t3);font-family:var(--mono);font-size:11px;letter-spacing:.04em;
  white-space:nowrap;}

/* --- module A: timeline ----------------------------------------------- */
.anc .tl{position:relative;}
.anc .tlsvg{width:100%;height:auto;display:block;overflow:visible;}
.anc .tlsvg .ax{stroke:#3a3a36;stroke-width:1;}
.anc .tlsvg .tick{stroke:#3a3a36;stroke-width:1;}
.anc .tlsvg .tk{font-family:var(--mono);font-size:9.5px;fill:#6d6c66;letter-spacing:.06em;}
.anc .tlsvg .tknow{fill:#a8a7a0;letter-spacing:.14em;}
.anc .tlsvg .axcap{font-family:var(--mono);font-size:9.5px;fill:#57564f;letter-spacing:.1em;
  text-transform:uppercase;}
.anc .tlsvg .brk line{stroke:#3a3a36;stroke-width:1;}
.anc .tlsvg .eb{font-family:var(--mono);font-size:10px;letter-spacing:.13em;opacity:.82;}
.anc .tlsvg .vl{font-family:var(--sans);font-size:13.5px;font-weight:600;fill:#f2f2ee;
  letter-spacing:-.005em;}
.anc .tlsvg .stem{stroke-width:1;opacity:.34;}
.anc .tlsvg .ci{stroke-width:1;opacity:.42;}
.anc .tlsvg .halo{fill:none;stroke-width:1;opacity:0;}
.anc .tlsvg .pcol{opacity:.9;}
.anc .tlsvg .pcl{font-family:var(--mono);font-size:9.5px;opacity:.85;}
.anc .tlsvg .hit{fill:transparent;}
.anc .node{cursor:default;}
.anc .node:focus{outline:none;}
.anc .tlsvg .node:is(:hover,:focus-visible) .eb{opacity:1;}
.anc .tlsvg .node:is(:hover,:focus-visible) .stem{opacity:.9;}
.anc .tlsvg .node:is(:hover,:focus-visible) .ci{opacity:1;}
.anc .tlsvg .node:is(:hover,:focus-visible) .halo{opacity:.55;}
.anc .tlsvg:has(.node:is(:hover,:focus-visible)) .node:not(:hover,:focus-visible){opacity:.42;}
.anc .tlsvg .node:focus-visible .vl{text-decoration:underline;text-underline-offset:3px;}

/* --- module B: map ---------------------------------------------------- */
.anc .mp{display:grid;grid-template-columns:minmax(0,700px) minmax(240px,1fr);gap:8px 34px;
  align-items:start;}
.anc .mapwrap{min-width:0;}
.anc .mapsvg{width:100%;height:auto;display:block;background:#0a0a09;border:1px solid var(--soft);
  border-radius:3px;}
.anc .mapsvg .coast path{fill:none;stroke:#33332e;stroke-width:1;stroke-linejoin:round;}
.anc .mapsvg .hit{fill:transparent;}
.anc .mapsvg .rl{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;opacity:.9;}
.anc .mapsvg .rp{font-family:var(--sans);font-size:14px;font-weight:650;letter-spacing:-.01em;opacity:.95;}
.anc .mapsvg .ajr{fill:none;stroke-width:1;stroke-dasharray:3 5;opacity:.6;}
.anc .mapsvg .lnk{fill:none;stroke-width:1.4;opacity:.72;}
.anc .mapsvg .lnkp{stroke-width:1.6;opacity:.85;}
.anc .mapsvg .lo{opacity:.95;}
.anc .mapsvg .fq{font-family:var(--mono);font-size:9px;letter-spacing:.07em;opacity:.85;}
.anc .mapsvg .fqo{font-size:9.5px;letter-spacing:.1em;opacity:1;}
.anc .mapsvg .wash{transition:opacity .18s ease;}
.anc .mapsvg:has(.node:is(:hover,:focus-visible)) .node:not(:hover,:focus-visible){opacity:.3;}
.anc .mapsvg:has(.lin:is(:hover,:focus-visible)) .washes{opacity:.35;}
.anc .mapsvg .region:is(:hover,:focus-visible) .rl{opacity:1;}
.anc .mapsvg .lin:is(:hover,:focus-visible) .lnk{opacity:1;stroke-width:2;}
.anc .mp .cards{grid-column:2;margin-top:0;}

/* --- module C: strip -------------------------------------------------- */
.anc .lins{display:grid;grid-template-columns:1fr auto 1fr;gap:18px 28px;align-items:end;
  margin-bottom:16px;}
.anc .lin{display:block;}
.anc .lin .lk{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.15em;
  margin-bottom:6px;}
.anc .lin .lv{display:block;font-family:var(--sans);font-size:24px;font-weight:660;
  letter-spacing:-.02em;color:var(--tx);line-height:1.1;margin-bottom:5px;}
.anc .lin .ln{display:block;font-size:13px;line-height:1.55;color:var(--t2);max-width:38ch;}
.anc .linr{text-align:right;}
.anc .linr .ln{margin-left:auto;}
.anc .linmid{font-family:var(--mono);font-size:9.5px;line-height:1.7;letter-spacing:.1em;
  text-transform:uppercase;color:var(--t3);text-align:center;padding-bottom:3px;}
.anc .bar{display:flex;height:62px;gap:2px;}
.anc .seg{position:relative;background:color-mix(in srgb,var(--c) 88%,#0a0a09);display:flex;
  flex-direction:column;justify-content:flex-end;padding:7px 9px;min-width:0;overflow:hidden;
  transition:opacity .16s ease;cursor:default;}
.anc .seg:focus{outline:none;}
.anc .seg .sv{font-family:var(--sans);font-size:16px;font-weight:680;letter-spacing:-.022em;
  color:#0a0a09;line-height:1;}
.anc .seg .sl{font-family:var(--mono);font-size:8.5px;letter-spacing:.09em;text-transform:uppercase;
  color:#0a0a09;opacity:.74;margin-top:5px;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;}
.anc .seg-be{background:#3d3d38;}
.anc .seg-be .sv{color:#e8e7e1;font-size:13px;}
.anc .seg-be .sl{display:none;}
.anc .bar:has(.seg:is(:hover,:focus-visible)) .seg:not(:hover,:focus-visible){opacity:.34;}
.anc .seg:focus-visible{outline:1px solid #f2f2ee;outline-offset:2px;}
.anc .tier{display:flex;gap:2px;margin-top:2px;height:11px;}
.anc .tbar{display:flex;gap:2px;}
.anc .tseg{background:var(--c);transition:opacity .16s ease;}
.anc .tseg0{opacity:.62;} .anc .tseg1{opacity:.4;} .anc .tseg2{opacity:.26;}
.anc .trest{border-top:1px solid var(--soft);}
.anc .st:has(#s-se:is(:hover,:focus-visible)) .tseg0{opacity:1;}
.anc .st:has(#s-se:is(:hover,:focus-visible)) .tseg1{opacity:.72;}
.anc .st:has(#s-se:is(:hover,:focus-visible)) .tseg2{opacity:.48;}
.anc .tnote{font-family:var(--mono);font-size:10px;line-height:1.7;letter-spacing:.045em;
  color:#57564f;margin-top:9px;}
.anc .tnote b{color:var(--t3);font-weight:500;letter-spacing:.1em;text-transform:uppercase;}

/* --- closing panels --------------------------------------------------- */
.anc .caveat{margin:44px 0 0;padding:26px 28px;background:var(--p1);border:1px solid var(--line);
  border-radius:3px;}
.anc .caveat h4{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--t2);margin:0 0 14px;font-weight:500;}
.anc .caveat ul{margin:0;padding:0;list-style:none;display:grid;gap:13px 40px;}
@media (min-width:900px){.anc .caveat ul{grid-template-columns:repeat(2,minmax(0,1fr));}
  .anc .caveat li{max-width:none;}}
.anc .caveat li{position:relative;padding-left:20px;font-size:14px;line-height:1.6;color:var(--t2);
  max-width:82ch;}
.anc .caveat li::before{content:"";position:absolute;left:0;top:.62em;width:9px;height:1px;
  background:#4e4d47;}
.anc .caveat li b{color:var(--tx);font-weight:600;}
.anc .src{margin:26px 0 0;padding-top:16px;border-top:1px solid var(--soft);
  font-family:var(--mono);font-size:10.5px;line-height:1.85;letter-spacing:.02em;color:#57564f;}
.anc .src b{color:var(--t3);font-weight:500;letter-spacing:.1em;text-transform:uppercase;
  display:block;margin-bottom:5px;font-size:9.5px;}

@media (max-width:940px){
  .anc .mp{grid-template-columns:minmax(0,1fr);}
  .anc .mp .cards{grid-column:1;margin-top:18px;}
  .anc .lins{grid-template-columns:1fr;gap:14px;}
  .anc .linr{text-align:left;}
  .anc .linr .ln{margin-left:0;}
  .anc .linmid{text-align:left;}
  .anc .bar{height:auto;flex-direction:column;}
  .anc .seg{flex:none !important;min-height:52px;justify-content:center;}
  .anc .seg .sl{white-space:normal;}
  .anc .tier{display:none;}
}
@media (prefers-reduced-motion:reduce){
  .anc *{transition:none !important;}
}

/* --- tool additions --------------------------------------------------- */
.anc .tlsvg .grule{stroke:#2e2e2a;stroke-width:1;stroke-dasharray:2 4;}
.anc .tlsvg .alab{font-family:var(--mono);font-size:9px;letter-spacing:.13em;fill:#5e5d57;}
.anc .tlsvg .anchor:is(:hover,:focus-visible) .grule{stroke:#6d6c66;stroke-dasharray:none;}
.anc .tlsvg .anchor:is(:hover,:focus-visible) .alab{fill:#a8a7a0;}
.anc .cite{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.05em;
  color:#57564f;margin-top:9px;}
.anc .lin .lv.dim{color:var(--t3);font-size:19px;}
.anc .seg-x{background:#3d3d38;}
.anc .seg-tiny .sl{display:none;}
.anc .seg-tiny .sv{font-size:13px;}
.anc .seg-x .sv{color:#e8e7e1;}
.anc .seg-x .sl{color:#e8e7e1;opacity:.7;}
.anc .tier .tsub{display:flex;gap:2px;}
.anc .tier .tbar{border-top:1px solid var(--soft);}
.anc .st:has(#s-cx:is(:hover,:focus-visible)) .tseg0{opacity:1;}
.anc .st:has(#s-cx:is(:hover,:focus-visible)) .tseg1{opacity:.72;}
.anc .st:has(#s-cx:is(:hover,:focus-visible)) .tseg2{opacity:.48;}
.anc .mapfoot{font-family:var(--mono);font-size:9.5px;line-height:1.75;letter-spacing:.04em;
  color:#57564f;margin-top:10px;}
.anc .nomap .empty{padding:26px 28px;background:var(--p1);border:1px solid var(--line);
  border-radius:3px;font-size:14px;color:var(--t2);max-width:78ch;}
.anc .nomap .empty b{color:var(--tx);}
.anc .rh .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
  gap:1px;background:var(--line);border:1px solid var(--line);border-radius:3px;
  margin-bottom:24px;overflow:hidden;}
.anc .rh .stat{background:var(--p1);padding:14px 16px;display:flex;flex-direction:column;gap:4px;}
.anc .rh .sk{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--t3);}
.anc .rh .svv{font-family:var(--sans);font-size:23px;font-weight:660;letter-spacing:-.024em;
  color:var(--tx);line-height:1.05;}
.anc .rh .ss{font-family:var(--mono);font-size:9px;letter-spacing:.06em;color:#57564f;}
.anc .rohsvg{width:100%;height:auto;display:block;}
.anc .rohsvg .chl{font-family:var(--mono);font-size:9px;fill:#57564f;}
.anc .rohsvg .chbar{fill:#1b1b19;}
.anc .rohsvg .rohseg{fill:#c98500;}
.anc .rohsvg .axcap{font-family:var(--mono);font-size:9.5px;fill:#57564f;letter-spacing:.09em;
  text-transform:uppercase;}
.anc .verdict{margin-top:22px;padding:20px 22px;background:var(--p1);border:1px solid var(--line);
  border-left:2px solid var(--t3);border-radius:3px;font-size:14px;line-height:1.62;color:var(--t2);
  max-width:80ch;}
.anc .verdict .ck{color:var(--tx);}
.anc .verdict-outbred{border-left-color:#199e70;}
.anc .verdict-endogamy{border-left-color:#c98500;}
.anc .verdict-distant{border-left-color:#d95926;}
.anc .verdict-close{border-left-color:#d95926;}
.anc .method{margin-top:16px;font-family:var(--mono);font-size:10px;line-height:1.85;
  letter-spacing:.03em;color:#57564f;max-width:100ch;}
`;

/* ------------------------------------------------------------ hover pairing */
function hoverRules(views) {
  const r = [];
  views.forEach(v => {
    if (!v || !v.keys || !v.keys.length) return;
    r.push(`.anc .${v.scope}:has(.node:is(:hover,:focus-visible)) .card-def{opacity:0;}`);
    if (v.scope === 'st') r.push(`.anc .st:has(.seg:is(:hover,:focus-visible)) .card-def{opacity:0;}`);
    v.keys.filter(k => k !== 'def').forEach(k => {
      r.push(`.anc .${v.scope}:has(#${k}:is(:hover,:focus-visible)) .card-${k}{opacity:1;}`);
    });
  });
  return r.join('\n');
}

/* -------------------------------------------------------------- the module */
function buildModule(st) {
  st.bands = prepComposition(st.composition || []);
  const vTime  = (st.bands.length || st.mt || st.y) ? viewTime(st) : null;
  const vMap   = st.bands.length || st.mt || st.y ? viewMap(st) : null;
  const vStrip = st.bands.length ? viewStrip(st) : null;
  const vRoh   = (st.roh && st.include.roh) ? viewROH(st) : null;

  const big = st.bands[0];
  const mtL = st.mt && (st.mt.display || st.mt.label), yL = st.y && st.y.label;
  const meta = [];
  if (mtL) meta.push(`<span><b>&#9792; ${esc(mtL)}</b> maternal &middot; mtDNA</span>`);
  if (yL)  meta.push(`<span><b>&#9794; ${esc(yL)}</b> paternal &middot; Y</span>`);
  if (big) meta.push(`<span><b>${fmt(big.pct)}%</b> ${esc(big.label)}</span>`);
  if (st.roh && st.include.roh) meta.push(`<span><b>${(st.roh.fRoh*100).toFixed(2)}%</b> F<sub>ROH</sub></span>`);

  const deck = st.deck || (() => {
    const bits = [];
    if (big) bits.push(`The largest share of my genome is <b>${esc(big.label)} at ${fmt(big.pct)}%</b>, across ${(st.composition||[]).length} regions my provider could name.`);
    if (mtL && yL) bits.push(`My maternal line is <b>${esc(mtL)}</b> and my paternal line <b>${esc(yL)}</b> — two lineages out of the thousands of ancestors behind those percentages.`);
    else if (mtL) bits.push(`My maternal line is <b>${esc(mtL)}</b> — one lineage out of the thousands of ancestors behind those percentages.`);
    bits.push('Three views below — when it happened, where it happened, how much of it there is.');
    return bits.join(' ');
  })();

  const sec = (n, eyebrow, num, title, sub, body) => body && !body.skip
    ? `<section class="mod"><div class="eyebrow">${eyebrow}</div><h3><span class="num">${num}</span>${title}</h3><p class="sub">${sub}</p>${body.html}</section>` : '';

  // maternal evidence, if we called it ourselves
  let evid = '';
  if (st.mt && st.mt.computed && st.include.evidence && st.mt.evidence && st.mt.evidence.length) {
    const rows = [];
    st.mt.evidence.forEach(e => e.rows.forEach(x => rows.push(
      `<tr><td>${e.name}</td><td>${x.pos}</td><td>${x.anc}&rarr;${x.der}</td><td>${x.call || '&mdash;'}</td><td class="st-${x.state}">${x.state}</td></tr>`)));
    evid = `<section class="mod"><div class="eyebrow">Evidence</div>
      <h3><span class="num">MATERNAL CALL</span>How the haplogroup was assigned</h3>
      <p class="sub">Every position the assignment rests on, read from the mitochondrial calls in the
      raw file. Note that the reference sequence is itself an H sequence, so for the deepest nodes the
      derived state is the one the reference carries.</p>
      <div class="tblwrap"><table class="evid"><thead><tr><th>Node</th><th>Position</th><th>Anc&rarr;Der</th><th>Your call</th><th>State</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>
      ${st.mt.excluded && st.mt.excluded.length ? `<p class="excl"><b>Excluded:</b> ${st.mt.excluded.slice(0,24).map(e=>esc(e.name)).join(', ')} — ancestral at a defining position.</p>` : ''}
      ${st.mt.untestable && st.mt.untestable.length ? `<p class="excl"><b>Not testable on this chip:</b> ${st.mt.untestable.map(esc).join(', ')}. A deeper call needs a mitochondrial sequence, which is cheap.</p>` : ''}
    </section>`;
  }

  const caveats = [
    `<li><b>A haplogroup traces one ancestor per generation out of thousands.</b> ${yL?`${esc(yL)} is your father&rsquo;s father&rsquo;s father&rsquo;s line; `:''}${mtL?`${esc(mtL)} is your mother&rsquo;s mother&rsquo;s mother&rsquo;s.`:''} Twelve generations back you had more than a thousand ancestors. A haplogroup says nothing about the rest of them.</li>`,
    `<li><b>The percentages are your provider&rsquo;s, not this tool&rsquo;s.</b> Assigning ancestry to a region requires labelled reference panels, which a raw genotype file does not contain. This tool visualises numbers you already had; it cannot check them, and within-continent assignment is the weakest part of the method.</li>`,
    `<li><b>An array sees only the positions on the chip.</b> Consumer arrays carry a few thousand mitochondrial and Y positions from the early 2010s, so a haplogroup resolves to the depth those markers allow and no further. Going deeper needs sequencing.</li>`,
  ];
  if (st.roh && st.include.roh) caveats.push(`<li><b>Runs of homozygosity describe your parents, not just you.</b> That is the one result here computed from your own genotypes alone — and it is also the most personal, which is why it is optional in what you publish.</li>`);

  const srcs = new Set();
  [st.mt, st.y].forEach(h => h && h.entry && (h.entry.sources || []).forEach(s => srcs.add(s)));
  ANCHORS.forEach(a => (a.sources || []).forEach(s => srcs.add(s)));

  const html = `<section class="anc" aria-label="Genetic ancestry">
<div class="inner">
<div class="eyebrow">${esc(st.eyebrow || 'Ancestry')}</div>
<h2 class="t">${esc(st.title || 'More about me')}</h2>
<p class="deck">${deck}</p>
${meta.length ? `<div class="meta">${meta.join('')}</div>` : ''}
${sec(1,'View one','DEEP TIME','When it happened','Your lineages on a logarithmic axis against the events every genome sits downstream of. Bars are published confidence intervals; where a date is soft the chart shows it as soft.',vTime)}
${sec(2,'View two','GEOGRAPHY','Where it happened','Diffuse fill is a share of the genome; a line is a single lineage. Different kinds of claim, drawn differently. Every percentage on the map is one somebody published. The coastline is a deliberate sketch, not a survey.',vMap)}
${sec(3,'View three','PROPORTION','How much of it there is','The autosomal genome as one bar. The two haplogroups sit above and apart, because they are not part of this measurement.',vStrip)}
${vRoh ? sec(4,'View four','GENOME STRUCTURE','What your own genotypes can prove on their own','Runs of homozygosity — stretches inherited identical from both parents. This is computed here from your raw data, not taken from any report, and segment length is what carries the information.',vRoh) : ''}
${evid}
<div class="caveat"><h4>What this does not say</h4><ul>${caveats.join('')}</ul></div>
<div class="src"><b>Sources</b>
Composition and haplogroup labels &mdash; your testing provider.<br/>
${[...srcs].map(s => esc(s)).join('<br/>\n')}<br/>
Built with <span class="tool">deep-ancestry</span> &mdash; runs entirely in the browser, uploads nothing.
</div>
</div>
</section>`;

  const css = ANC_CSS + '\n/* hover pairings */\n' + hoverRules([vTime, vMap, vStrip]) + `
.anc .tblwrap{overflow-x:auto;border:1px solid var(--line);border-radius:3px;}
.anc table.evid{border-collapse:collapse;width:100%;font-family:var(--mono);font-size:11px;}
.anc table.evid th{text-align:left;font-weight:500;letter-spacing:.12em;text-transform:uppercase;
  font-size:9px;color:var(--t3);padding:10px 14px;background:var(--p1);
  border-bottom:1px solid var(--line);position:sticky;top:0;}
.anc table.evid td{padding:7px 14px;color:var(--t2);border-bottom:1px solid var(--soft);}
.anc table.evid tr:last-child td{border-bottom:none;}
.anc table.evid .st-derived{color:#199e70;}
.anc table.evid .st-ancestral{color:#d95926;}
.anc table.evid .st-nocall,.anc table.evid .st-other{color:#57564f;}
.anc .excl{font-size:13px;line-height:1.6;color:var(--t2);margin:14px 0 0;max-width:82ch;}
.anc .excl b{color:var(--tx);font-weight:600;}
.anc .src .tool{color:var(--t2);}
`;
  return { css, html };
}

function exportFile(st) {
  const m = buildModule(st);
  return `<!--
  Ancestry module generated by deep-ancestry (https://github.com/${st.repo || 'you/deep-ancestry'}).
  Self-contained: no JavaScript, no webfonts, no network requests. All interaction is CSS.
  Every rule is scoped under .anc. Paste both blocks into your page.
-->
<style>
${m.css}</style>

${m.html}
`;
}
