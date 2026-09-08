/* ---------------------------------------------------------------------------
   analyze.js — parsing and computation. Runs entirely in the browser.

   Nothing here uploads, fetches, or stores anything. The file is read with
   FileReader, held in memory for the length of the session, and dropped when the
   tab closes.
   --------------------------------------------------------------------------- */

const CHR_LEN_37 = { // GRCh37/hg19, the build every consumer raw export uses
  1:249250621, 2:243199373, 3:198022430, 4:191154276, 5:180915260, 6:171115067,
  7:159138663, 8:146364022, 9:141213431, 10:135534747, 11:135006516, 12:133851895,
  13:115169878, 14:107349540, 15:102531392, 16:90354753, 17:81195210, 18:78077248,
  19:59128983, 20:63025520, 21:48129895, 22:51304566, X:155270560, Y:59373566,
};
const AUTOSOME_BP = (() => { let t = 0; for (let c = 1; c <= 22; c++) t += CHR_LEN_37[c]; return t; })();

/* ------------------------------------------------------------------ format */
function detectFormat(head) {
  const h = head.slice(0, 60000);
  if (/^#\s*rsid\s+chromosome\s+position\s+genotype/mi.test(h) || /23andMe/i.test(h)) return '23andme';
  if (/AncestryDNA/i.test(h) || /^rsid\s+chromosome\s+position\s+allele1\s+allele2/mi.test(h)) return 'ancestry';
  if (/MyHeritage/i.test(h) || /^"?RSID"?\s*,\s*"?CHROMOSOME"?/mi.test(h)) return 'myheritage';
  if (/Family\s*Tree\s*DNA|FTDNA/i.test(h)) return 'ftdna';
  if (/LivingDNA/i.test(h)) return 'livingdna';
  // fall back on shape
  const line = h.split('\n').find(l => l && !l.startsWith('#') && !/^rsid/i.test(l)) || '';
  if (line.includes(',')) return 'myheritage';
  const cols = line.split(/\t/).length;
  if (cols >= 5) return 'ancestry';
  return '23andme';
}
const FORMAT_NAME = {
  '23andme':'23andMe', ancestry:'AncestryDNA', myheritage:'MyHeritage',
  ftdna:'Family Tree DNA', livingdna:'Living DNA',
};

function normChrom(c) {
  c = String(c).trim().toUpperCase().replace(/^CHR/, '');
  if (c === '23') return 'X';
  if (c === '24') return 'Y';
  if (c === '25') return 'X';          // pseudoautosomal, treated as X
  if (c === '26' || c === 'M' || c === 'MT') return 'MT';
  return c;
}

/* --------------------------------------------------------------- the parser
   Chunked so a 25 MB file does not freeze the tab. onProgress(0..1).           */
function parseRaw(text, onProgress) {
  return new Promise((resolve) => {
    const fmt = detectFormat(text);
    const lines = text.split('\n');
    const N = lines.length;

    const auto = {};                       // chrom -> {pos:[], het:[]}
    for (let c = 1; c <= 22; c++) auto[c] = { pos: [], het: [] };
    const xg = { called: 0, het: 0 };
    const yg = { total: 0, called: 0 };
    const mt = new Map();                  // rCRS position -> allele
    let total = 0, called = 0, i = 0;
    let minPos38 = 0, sawChr = false;

    const step = () => {
      const end = Math.min(i + 60000, N);
      for (; i < end; i++) {
        const raw = lines[i];
        if (!raw || raw.charCodeAt(0) === 35) continue;   // '#'
        let f;
        if (fmt === 'myheritage' || fmt === 'ftdna') {
          f = raw.replace(/"/g, '').split(',');
        } else {
          f = raw.split(/\t/);
          if (f.length < 4) f = raw.trim().split(/\s+/);
        }
        if (f.length < 4) continue;
        if (f[0] === 'rsid' || f[0] === 'RSID') continue;

        const chrom = normChrom(f[1]);
        const pos = +f[2];
        if (!pos) continue;
        let gt;
        if (fmt === 'ancestry' && f.length >= 5) gt = (f[3] + f[4]).toUpperCase();
        else gt = String(f[3]).trim().toUpperCase();
        gt = gt.replace(/[^ACGTDI-]/g, '');
        total++;
        const nocall = !gt || gt.includes('-') || gt.includes('0') || gt === '';
        if (!nocall) called++;

        if (chrom === 'MT') {
          if (!nocall && /^[ACGT]/.test(gt)) mt.set(pos, gt[0]);
        } else if (chrom === 'Y') {
          yg.total++; if (!nocall) yg.called++;
        } else if (chrom === 'X') {
          if (!nocall && gt.length === 2 && /^[ACGT]{2}$/.test(gt)) {
            xg.called++; if (gt[0] !== gt[1]) xg.het++;
          }
        } else {
          const c = +chrom;
          if (c >= 1 && c <= 22 && !nocall && gt.length === 2 && /^[ACGT]{2}$/.test(gt)) {
            auto[c].pos.push(pos);
            auto[c].het.push(gt[0] === gt[1] ? 0 : 1);
            if (pos > CHR_LEN_37[c]) minPos38++;
            sawChr = true;
          }
        }
      }
      onProgress && onProgress(i / N);
      if (i < N) setTimeout(step, 0);
      else resolve({ fmt, formatName: FORMAT_NAME[fmt], auto, xg, yg, mt, total, called,
                     offBuild: minPos38, hasAutosomes: sawChr });
    };
    step();
  });
}

/* --------------------------------------------------------- runs of homozygosity
   PLINK-style. The two filters that matter are the density floor and the maximum
   gap: without them, centromeres and other probe deserts read as enormous
   homozygous runs, and F_ROH comes out roughly eight times too high.            */
const ROH = { WIN: 50, MAX_HET: 1, MIN_BP: 1e6, MIN_SNP: 100, MIN_DENSITY: 20, MAX_GAP: 1e6, THRESH: 0.05 };

function callROH(auto) {
  const segs = [];
  const perChrom = {};
  for (let c = 1; c <= 22; c++) {
    const pos = auto[c].pos, het = auto[c].het, n = pos.length;
    perChrom[c] = { n, segs: [] };
    if (n < ROH.WIN + 1) continue;
    const W = ROH.WIN, starts = n - W + 1;
    const homWin = new Uint8Array(starts);
    let run = 0;
    for (let k = 0; k < W; k++) run += het[k];
    homWin[0] = run <= ROH.MAX_HET ? 1 : 0;
    for (let s = 1; s < starts; s++) {
      run += het[s + W - 1] - het[s - 1];
      homWin[s] = run <= ROH.MAX_HET ? 1 : 0;
    }
    const pre = new Int32Array(starts + 1);
    for (let s = 0; s < starts; s++) pre[s + 1] = pre[s] + homWin[s];

    const inRoh = new Uint8Array(n);
    for (let idx = 0; idx < n; idx++) {
      const lo = Math.max(0, idx - W + 1), hi = Math.min(starts - 1, idx);
      if (hi < lo) continue;
      const cnt = pre[hi + 1] - pre[lo];
      inRoh[idx] = (cnt / (hi - lo + 1)) > ROH.THRESH ? 1 : 0;
    }
    let s = -1;
    const flush = (a, b) => {
      if (a < 0 || b <= a) return;
      const span = pos[b] - pos[a] + 1, nSnp = b - a + 1;
      const dens = nSnp / (span / 1e6);
      if (span >= ROH.MIN_BP && nSnp >= ROH.MIN_SNP && dens >= ROH.MIN_DENSITY) {
        const seg = { chrom: c, start: pos[a], end: pos[b], bp: span, nSnp, density: dens };
        segs.push(seg); perChrom[c].segs.push(seg);
      }
    };
    for (let idx = 0; idx < n; idx++) {
      if (inRoh[idx]) {
        if (s < 0) s = idx;
        else if (pos[idx] - pos[idx - 1] > ROH.MAX_GAP) { flush(s, idx - 1); s = idx; }
      } else { flush(s, idx - 1); s = -1; }
    }
    flush(s, n - 1);
  }
  segs.sort((a, b) => b.bp - a.bp);
  const totalBp = segs.reduce((t, s) => t + s.bp, 0);
  const band = (lo, hi) => segs.filter(s => s.bp >= lo && (hi ? s.bp < hi : true));
  return {
    segs, perChrom, count: segs.length, totalBp,
    fRoh: totalBp / AUTOSOME_BP,
    longest: segs[0] ? segs[0].bp : 0,
    b1_2: band(1e6, 2e6).length, b2_4: band(2e6, 4e6).length,
    b4_8: band(4e6, 8e6).length, b8: band(8e6, 0).length,
    params: ROH,
  };
}

/* Interpretation ladder. Deliberately conservative — segment LENGTH carries the
   information, not the total, because a shared ancestor n generations back leaves
   segments of characteristic size. */
function interpretROH(r) {
  const f = r.fRoh;
  if (r.b8 >= 5 || f > 0.045) return {
    key:'close', head:'Consistent with closely related parents',
    body:'Multiple long segments above 8 Mb with a high total. A first-cousin union sits near '
       + 'F_ROH 0.0625; half-first-cousin or closer relationships produce this pattern. Long '
       + 'segments mean a recent shared ancestor, because recombination has not yet had time to '
       + 'break them up.' };
  if (r.b4_8 + r.b8 >= 2 || f > 0.02) return {
    key:'distant', head:'Consistent with a shared ancestor a few generations back',
    body:'Some segments over 4 Mb. Second- or third-cousin parents leave a handful of long runs '
       + 'without the heavy total of a closer union. Family history is usually the faster way to '
       + 'confirm this than more genetics.' };
  if (f > 0.01) return {
    key:'endogamy', head:'No recent consanguinity, elevated background relatedness',
    body:'No long segments, but the short 1–2 Mb burden sits above a typical outbred European '
       + '(roughly 0.5–1%). That is the signature of endogamy — many distant shared ancestors '
       + 'rather than one recent one — and it is what populations with a historical founder '
       + 'bottleneck or strong regional marriage patterns look like.' };
  return {
    key:'outbred', head:'No recent consanguinity, unremarkable background',
    body:'Short total, no long segments. Your parents were not related in any genealogically '
       + 'recent sense and your ancestry does not carry a strong endogamy signal.' };
}

/* ------------------------------------------------------------ sex inference */
function inferSex(xg, yg) {
  const xHet = xg.called ? xg.het / xg.called : 0;
  const yCall = yg.total ? yg.called / yg.total : 0;
  let sex = 'unknown', why;
  if (yg.total < 100) { why = 'Too few Y probes on this chip to judge.'; }
  else if (yCall > 0.5 && xHet < 0.02) { sex = 'male'; why = `chrY called at ${(yCall*100).toFixed(0)}% and chrX heterozygosity ${(xHet*100).toFixed(2)}%.`; }
  else if (yCall < 0.2 && xHet > 0.10) { sex = 'female'; why = `chrY largely uncalled (${(yCall*100).toFixed(0)}%) and chrX heterozygosity ${(xHet*100).toFixed(1)}%.`; }
  else { why = `Ambiguous: chrY ${(yCall*100).toFixed(0)}% called, chrX heterozygosity ${(xHet*100).toFixed(1)}%.`; }
  return { sex, xHet, yCall, why, yCalled: yg.called, yTotal: yg.total };
}

/* --------------------------------------------------- mitochondrial haplogroup */
function classifyMt(mt) {
  const evidence = [], excluded = [];
  let node = MT_TREE, path = [];
  const evalNode = (nd) => {
    let der = 0, anc = 0, nocall = 0;
    const rows = nd.markers.map(m => {
      const call = mt.get(m.pos);
      let state;
      if (!call) { state = 'nocall'; nocall++; }
      else if (call === m.der) { state = 'derived'; der++; }
      else if (call === m.anc) { state = 'ancestral'; anc++; }
      else { state = 'other'; nocall++; }
      return { pos: m.pos, anc: m.anc, der: m.der, call: call || null, state };
    });
    return { der, anc, nocall, rows };
  };

  while (node.children && node.children.length) {
    const scored = node.children.map(ch => ({ ch, r: evalNode(ch) }));
    const ok = scored.filter(s => s.r.anc === 0 && s.r.der >= (s.ch.min || 1));
    scored.forEach(s => {
      if (s.r.anc > 0) excluded.push({ name: s.ch.name, reason:
        `ancestral at ${s.r.rows.filter(x=>x.state==='ancestral').map(x=>x.pos).join(', ')}` });
    });
    if (!ok.length) break;
    ok.sort((a, b) => b.r.der - a.r.der);
    const win = ok[0];
    path.push(win.ch.name);
    evidence.push({ name: win.ch.name, rows: win.r.rows, note: win.ch.note || '' });
    node = win.ch;
  }

  // how many further branches exist that we could not test
  const untestable = [];
  if (node.children) node.children.forEach(ch => {
    const r = evalNode(ch);
    if (r.der === 0 && r.anc === 0) untestable.push(ch.name);
  });

  return {
    call: path.length ? path[path.length - 1] : null,
    display: path.length ? path[path.length - 1] + (node.children && node.children.length ? '*' : '') : null,
    path, evidence, excluded, untestable,
    covered: mt.size,
  };
}

/* --------------------------------------------------------- haplogroup lookup
   Resolve a user-entered or computed label down to the nearest curated entry:
   H3a1b -> H3 -> H;  R-M269 / R1b1a1a2 -> R1b-M269.                              */
const Y_ALIASES = {
  'R-M269':'R1b-M269','R1B':'R1b-M269','R1B1A1A2':'R1b-M269','R1B1B2':'R1b-M269',
  'R-M198':'R1a-M198','R1A':'R1a-M198','R-M417':'R1a-M198','R1A1A':'R1a-M198',
  'I-M253':'I1-M253','I1':'I1-M253','I-M423':'I2a-M423','I2A1B':'I2a-M423','I2A':'I2a-M423',
  'E-M215':'E-V13','E-M78':'E-V13','E1B1B1A1B1A':'E-V13','E-L618':'E-V13',
  'E-M81':'E-M81','E1B1B1B1A':'E-M81','E-M2':'E-M2','E1B1A':'E-M2',
  'J-M172':'J2-M172','J2':'J2-M172','J-M267':'J1-M267','J1':'J1-M267',
  'G-P15':'G2a-P15','G2A':'G2a-P15','G-M201':'G2a-P15','G2':'G2a-P15',
  'N-M231':'N-M231','N1C':'N-M231','N-M178':'N-M231','N-TAT':'N-M231',
  'Q-M242':'Q-M242','Q':'Q-M242','T-M70':'T-M70','T':'T-M70',
  'O-M175':'O-M175','O':'O-M175','C-M130':'C-M130','C':'C-M130',
};
function lookupHaplogroup(label, kind) {
  if (!label) return null;
  const table = LITERATURE[kind];
  let s = String(label).trim();
  if (kind === 'y') {
    const key = s.toUpperCase().replace(/[\s_]/g, '');
    if (Y_ALIASES[key]) s = Y_ALIASES[key];
  }
  if (table[s]) return { entry: table[s], exact: true, resolvedFrom: s };
  // progressive trim: H3a1 -> H3a -> H3 -> H  |  R1b-M269 -> R1b -> R1
  let t = s.replace(/\*$/, '');
  while (t.length) {
    if (table[t]) return { entry: table[t], exact: false, resolvedFrom: t };
    const up = t.toUpperCase().replace(/[\s_]/g,'');
    if (kind === 'y' && Y_ALIASES[up] && table[Y_ALIASES[up]])
      return { entry: table[Y_ALIASES[up]], exact: false, resolvedFrom: Y_ALIASES[up] };
    t = t.slice(0, -1);
  }
  return null;
}

/* ----------------------------------------------------------------- composition
   Percentages cannot be computed from a raw file — that needs labelled reference
   panels. They are pasted in from the provider's own report. This parses the text
   people actually copy out of 23andMe, AncestryDNA and MyHeritage.               */
function parseComposition(text) {
  const out = [];
  const seen = new Set();
  text.split('\n').forEach(line => {
    const l = line.replace(/\t/g, ' ').trim();
    if (!l) return;
    let m = l.match(/^(.+?)[\s.:–—-]*?(\d{1,3}(?:\.\d+)?)\s*%\s*$/)      // "Italian 33.8%"
         || l.match(/^(\d{1,3}(?:\.\d+)?)\s*%\s*[\s.:–—-]*(.+?)$/);      // "33.8% Italian"
    if (!m) return;
    let label, pct;
    if (/^\d/.test(m[1])) { pct = parseFloat(m[1]); label = m[2]; } else { label = m[1]; pct = parseFloat(m[2]); }
    label = label.replace(/[–—·|]+$/,'').replace(/\s{2,}/g,' ').trim();
    if (!label || !isFinite(pct) || pct <= 0 || pct > 100) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, pct });
  });
  return out;
}
