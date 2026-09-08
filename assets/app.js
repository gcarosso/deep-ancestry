/* ---------------------------------------------------------------------------
   app.js — UI wiring. No network calls anywhere in this file except the optional
   fetch of the bundled sample file, which fails harmlessly when the page is
   opened from disk.
   --------------------------------------------------------------------------- */
(function () {
  const $ = s => document.querySelector(s);
  const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
  const show = (id, on) => { const n = $(id); if (n) n.hidden = !on; };

  let RESULT = null;   // parsed + computed
  let LAST = null;     // last built module

  /* ------------------------------------------------------------- file input */
  const drop = $('#drop'), fileInput = $('#file');
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', e => e.target.files[0] && handleFile(e.target.files[0]));
  ['dragenter','dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });

  $('#try').addEventListener('click', () => {
    fetch('data/sample-23andme.txt')
      .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.text(); })
      .then(t => runAnalysis(t, 'sample-23andme.txt'))
      .catch(() => fail('Could not load the sample. Browsers block reading local files from a page '
        + 'opened off disk, which is a security feature, not a bug. Drag <code>data/sample-23andme.txt</code> '
        + 'from the repo onto the drop zone instead, or serve the folder with <code>python3 -m http.server</code>.'));
  });

  function fail(msg) {
    let e = $('#err'); if (!e) { e = el('div', 'err'); e.id = 'err'; drop.after(e); }
    e.innerHTML = msg; drop.classList.remove('busy'); show('#prog', false);
  }

  function handleFile(f) {
    if (/\.zip$/i.test(f.name)) return fail('That is a zip. Unzip it first and drop the <code>.txt</code> or <code>.csv</code> inside — unzipping in the browser would mean shipping a library for no good reason.');
    const r = new FileReader();
    drop.classList.add('busy'); show('#prog', true); $('#progtxt').textContent = 'reading file…';
    r.onerror = () => fail('The browser could not read that file.');
    r.onload = () => runAnalysis(r.result, f.name);
    r.readAsText(f);
  }

  function runAnalysis(text, name) {
    const e = $('#err'); if (e) e.remove();
    drop.classList.add('busy'); show('#prog', true);
    $('#progtxt').textContent = 'parsing…';
    parseRaw(text, p => { $('#progbar').style.width = (p * 92).toFixed(1) + '%'; })
      .then(parsed => {
        if (!parsed.hasAutosomes) throw new Error('no autosomal genotypes found');
        $('#progtxt').textContent = 'calling runs of homozygosity…';
        $('#progbar').style.width = '96%';
        return new Promise(res => setTimeout(() => {
          const roh = callROH(parsed.auto);
          res({ parsed, roh, rohInterp: interpretROH(roh),
                sex: inferSex(parsed.xg, parsed.yg), mt: classifyMt(parsed.mt), name });
        }, 30));
      })
      .then(r => { RESULT = r; $('#progbar').style.width = '100%'; setTimeout(showReport, 80); })
      .catch(err => fail('That file did not parse as a raw genotype export ('
        + String(err.message || err) + '). Expected the unmodified download from 23andMe, AncestryDNA, '
        + 'MyHeritage, Family Tree DNA or Living DNA — four or five tab- or comma-separated columns, '
        + 'one variant per line.'));
  }

  /* ---------------------------------------------------------------- report */
  function cell(k, v, n, cls) {
    return `<div class="cell${cls && cls.wide ? ' wide' : ''}"><span class="k">${k}</span>
      <span class="v${cls && cls.tone ? ' ' + cls.tone : ''}">${v}</span>
      ${n ? `<span class="n">${n}</span>` : ''}</div>`;
  }

  function showReport() {
    const { parsed, roh, rohInterp, sex, mt } = RESULT;
    const callRate = parsed.total ? (parsed.called / parsed.total * 100) : 0;
    const nAuto = Object.keys(parsed.auto).reduce((t, c) => t + parsed.auto[c].pos.length, 0);
    const cards = [
      cell('Provider', parsed.formatName, `${parsed.total.toLocaleString()} variants &middot; ${callRate.toFixed(1)}% called &middot; ${nAuto.toLocaleString()} usable autosomal`),
      cell('Chromosomal sex', sex.sex === 'unknown' ? 'undetermined' : sex.sex, sex.why,
           { tone: sex.sex === 'unknown' ? 'amber' : '' }),
      cell('Maternal haplogroup', mt.display || 'not called',
           mt.display ? `${mt.path.join(' &rarr; ')} &middot; ${mt.covered.toLocaleString()} mitochondrial positions called`
                      : `only ${mt.covered.toLocaleString()} mitochondrial positions on this chip`,
           { tone: mt.display ? 'green' : 'amber' }),
      cell('chrY probes', parsed.yg.total ? `${parsed.yg.called.toLocaleString()}` : '0',
           parsed.yg.total ? `of ${parsed.yg.total.toLocaleString()} on the chip. Y haplogroups are not called here — enter yours below.` : 'no Y chromosome in this file'),
      cell('F<sub>ROH</sub>', (roh.fRoh * 100).toFixed(2) + '%',
           `${roh.count} segments &ge;1 Mb &middot; ${(roh.totalBp/1e6).toFixed(1)} Mb total &middot; longest ${(roh.longest/1e6).toFixed(1)} Mb &middot; ${roh.b4_8 + roh.b8} above 4 Mb`,
           { tone: rohInterp.key === 'outbred' ? 'green' : rohInterp.key === 'endogamy' ? 'amber' : 'orange' }),
      cell(rohInterp.head, '', rohInterp.body, { wide: true }),
    ];
    $('#chipcards').innerHTML = cards.join('');

    $('#mtcall').value = mt.display || '';
    $('#mthelp').innerHTML = mt.display
      ? `Called from your file. ${mt.excluded.length} branch${mt.excluded.length === 1 ? '' : 'es'} excluded on ancestral calls.`
        + (mt.untestable.length ? ` Deeper branches (${mt.untestable.slice(0,6).join(', ')}${mt.untestable.length>6?'…':''}) have no marker on this chip.` : '')
      : 'No assignment was possible from the mitochondrial positions on this chip. Enter it from your report if you have one.';

    const dl = $('#ylist');
    dl.innerHTML = Object.keys(LITERATURE.y).map(k => `<option value="${k}"></option>`).join('');
    $('#yhelp').innerHTML = parsed.yg.called > 100
      ? '23andMe calls this &ldquo;Paternal haplogroup&rdquo;. Your file has a Y chromosome, so you have one.'
      : 'This file has little or no Y chromosome data, so there may be no paternal line to enter.';

    show('#screen-drop', false); show('#screen-report', true);
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------- composition */
  const compBox = $('#comp');
  compBox.addEventListener('input', renderComp);
  function currentComposition() { return parseComposition(compBox.value); }
  function renderComp() {
    const list = currentComposition();
    const bands = prepComposition(list);
    const colorOf = l => { const b = bands.find(b => b.label === l); return b ? b.color : '#4a4a45'; };
    const sum = list.reduce((t, r) => t + r.pct, 0);
    const out = $('#compout');
    out.innerHTML = list.map(r => `<span class="chip"><i style="background:${colorOf(r.label)}"></i><b>${r.pct}%</b> ${r.label}</span>`).join('')
      + (list.length ? `<span class="chip${Math.abs(sum-100) > 2 ? ' bad' : ''}">total ${sum.toFixed(1)}%</span>` : '');
    $('#build').disabled = false;
  }

  /* --------------------------------------------------------------- build */
  function buildState() {
    const { parsed, roh, rohInterp, mt } = RESULT;
    const mtLabel = ($('#mtcall').value || '').trim() || mt.display;
    const yLabel  = ($('#ycall').value || '').trim();
    const mtRes = mtLabel ? lookupHaplogroup(mtLabel.replace(/\*$/,''), 'mt') : null;
    const yRes  = yLabel  ? lookupHaplogroup(yLabel, 'y') : null;
    return {
      title: $('#ttl').value || 'More about me',
      eyebrow: $('#eyb').value || 'Ancestry',
      composition: currentComposition(),
      mt: mtLabel ? { label: mtLabel.replace(/\*$/,''), display: mtLabel, entry: mtRes && mtRes.entry,
                      computed: mtLabel === mt.display, evidence: mt.evidence,
                      excluded: mt.excluded, untestable: mt.untestable } : null,
      y: yLabel ? { label: yLabel, entry: yRes && yRes.entry } : null,
      roh, rohInterp,
      include: { roh: $('#incRoh').checked, evidence: $('#incEvi').checked },
    };
  }

  $('#build').addEventListener('click', () => {
    const st = buildState();
    if (!st.composition.length && !st.mt && !st.y) {
      return alert('Nothing to draw yet — paste your composition, or enter a haplogroup.');
    }
    LAST = st;
    const m = buildModule(st);
    const host = $('#preview');
    host.innerHTML = '';
    const s = document.createElement('style'); s.textContent = m.css;
    host.appendChild(s);
    host.insertAdjacentHTML('beforeend', m.html);
    const notes = [];
    if (st.mt && !st.mt.entry) notes.push(`No curated literature entry for <b>${st.mt.label}</b> yet, so its map path and date are omitted. Adding one is a data-only pull request.`);
    if (st.y && !st.y.entry) notes.push(`No curated literature entry for <b>${st.y.label}</b> yet, so its map path and date are omitted.`);
    if (notes.length) host.insertAdjacentHTML('afterbegin', `<div class="err">${notes.join('<br/>')}</div>`);
    show('#screen-report', false); show('#screen-out', true);
    window.scrollTo(0, 0);
  });

  $('#dl').addEventListener('click', () => {
    const blob = new Blob([exportFile(LAST)], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ancestry.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $('#copy').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(exportFile(LAST)); e.target.textContent = 'Copied'; }
    catch { e.target.textContent = 'Copy blocked — use download'; }
    setTimeout(() => { e.target.textContent = 'Copy HTML'; }, 1800);
  });
  $('#back').addEventListener('click', () => { show('#screen-out', false); show('#screen-report', true); window.scrollTo(0,0); });
  $('#reset').addEventListener('click', () => {
    RESULT = null; fileInput.value = '';
    drop.classList.remove('busy'); show('#prog', false); $('#progbar').style.width = '0';
    show('#screen-report', false); show('#screen-out', false); show('#screen-drop', true);
    window.scrollTo(0, 0);
  });
})();
