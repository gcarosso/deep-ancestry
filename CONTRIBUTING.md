# Contributing

The most useful contributions are data, not code.

## Adding a haplogroup to the literature table

`assets/data.js`, in `LITERATURE.mt` or `LITERATURE.y`. One entry:

```js
'U5b': {
  label: 'U5b', kind: 'mt',
  coalescence: { y: 24000, lo: 20000, hi: 28000, precision: 'estimate' },
  origin: { lon: 10.0, lat: 47.0, label: 'Europe' },
  freqs: [
    { lon: 25.0, lat: 68.5, label: 'Saami', pct: 48, precision: 'estimate' },
  ],
  note: 'One or two sentences a non-specialist can read, saying what this lineage is and what it '
      + 'is evidence of. Say what is uncertain.',
  sources: ['Author et al., Journal 12:345 (2020)'],
},
```

Rules, in order of importance:

1. **Every figure needs a citation.** An entry with an empty `sources` array and a number in it
   will not be merged. If you cannot point at the paper, leave the field out — the tool renders
   fine with `freqs: []` and with no `coalescence`.
2. **`precision` is not decoration.** Use `'published'` only for a specific figure stated in the
   cited paper — the kind you could quote with a page number. Use `'estimate'` for a range that is
   widely reported but not traceable to one figure. Estimates render muted and prefixed `~` so a
   reader can tell them apart at a glance. Marking an estimate as published is the one change that
   would genuinely damage this tool.
3. **Write the `note` for a curious adult, not a geneticist**, and say what the lineage does *not*
   prove. The tool's whole posture is that limits are part of the result.
4. Coordinates go where the *population* is, not where a modern capital is.

## Adding a region to the gazetteer

`REGION_GEO` in `assets/geo.js`: a lowercase provider region name to `[lon, lat]`. Match the
provider's exact wording; matching is case- and punctuation-insensitive with a longest-prefix
fallback. Unmapped names are listed in the module's caption, so a missing entry degrades visibly
rather than silently.

## Extending the mtDNA tree

`MT_TREE` in `assets/data.js`. Each node lists only **well-established defining positions** as
`{pos, anc, der}` in rCRS coordinates, plus `min`, the number that must be called and derived to
accept the node.

The trap: **rCRS is itself an H2a2a1 sequence.** For the deepest nodes the *derived* state is the
one the reference carries — haplogroup H is confirmed by the absence of 2706G and 7028T, not by any
positive difference. Getting this backwards produces a classifier that confidently calls everyone
into the wrong macrohaplogroup. Test against `data/sample-23andme.txt`, which should call H3.

A node is accepted only when **no** defining position is ancestral. Prefer fewer, solid markers
over more, shaky ones: an unassignable sample gets no call, which is the correct output.

## Code changes

No build step, no dependencies, no framework, and it should stay that way — the ability to read the
whole thing and run it offline is a feature of a tool that handles genetic data.

- No network calls. Ever. A pull request that adds a fetch, a font CDN, an analytics beacon or a
  third-party script will be closed regardless of what it does.
- The module's CSS lives in `render.js` so the preview and the export cannot drift. Keep it there.
- Test with `python3 -m http.server` and the bundled sample before opening a PR.

## Reporting a scientific error

Open an issue with the citation. Wrong science is the most serious class of bug in this repository
and takes priority over everything else.
