# deep-ancestry

Analyze a consumer DNA export in your browser and build an embeddable ancestry module for your site.

The tool accepts raw files from 23andMe, AncestryDNA, MyHeritage, Family Tree DNA, and Living DNA.
It computes runs of homozygosity, estimates maternal haplogroup from the available mitochondrial
markers, and summarizes chip coverage. You can add ancestry percentages and a paternal haplogroup
from your provider's report, then export a self-contained HTML module with population-genetic context
and citations.

Built by [Giovanni Carosso](https://gcarosso.bio). An example module is embedded on my
[About page](https://gcarosso.bio/about).

Analysis runs locally in the browser, without uploading your genetic data. The application uses
static HTML, CSS, and JavaScript, with no analytics or cookies. You can also run it offline.

![deep-ancestry](docs/screenshot.png)

## Design

I built deep-ancestry to make the evidence behind an ancestry report visible: which results come
from the raw genotypes, which depend on a provider's reference data, and where chip coverage limits
interpretation. Computed results include their supporting markers or analysis parameters. Ancestry
percentages entered from a consumer report remain labeled as the provider's estimates.

## Functionalities

| Analysis or output | Method and scope |
|---|---|
| **Runs of homozygosity and F<sub>ROH</sub>** | Detects long stretches of homozygous autosomal markers and reports their lengths and fraction of a fixed reference genome length. The segment distribution supports interpretation of recent and background relatedness; it does not establish a specific parental relationship. |
| **Maternal haplogroup** | Compares mitochondrial positions on the chip with a curated portion of the mtDNA phylogeny. Shows supporting markers, excluded branches, and branches the chip cannot distinguish. |
| **Chromosomal sex estimate and chip coverage** | Uses chrX heterozygosity and chrY call rate to estimate chromosomal sex, with an ambiguous result when the thresholds are not met. Summarizes the markers available on the array. |
| **Population-genetic context** | Combines provider-reported ancestry percentages and haplogroups with geography, published frequencies, dates, and citations from the bundled literature table. |
| **Embeddable module** | Exports a single HTML file containing styles and an ancestry section. The ROH view and maternal evidence table are optional. |

## ROH method

Sparse marker coverage can create apparent runs of homozygosity. A method based only on gaps
between heterozygous calls can span centromeres or other regions with few probes, inflating both
segment lengths and F<sub>ROH</sub>.

This implementation uses a PLINK-style sliding window of 50 SNPs, allowing one heterozygous call.
Retained runs must meet all four criteria:

- Length of at least 1 Mb.
- At least 100 SNPs.
- Density of at least 20 SNPs/Mb.
- A maximum gap of 1 Mb between consecutive markers.

The density and gap filters reduce false runs across poorly covered regions. F<sub>ROH</sub> is the
summed length of retained runs divided by a fixed GRCh37 autosomal length. The report also shows
the segment-length distribution, which provides context for interpreting the total. The tool's
relatedness categories are heuristic interpretations of that distribution.

## Limitations

- **Ancestry percentages require population reference data.** The repository does not include
  reference panels or estimate population ancestry from the raw file. Percentages are entered
  from your provider's report and labeled accordingly.
- **Paternal haplogroup is supplied by the user.** The tool does not classify Y haplogroups from
  consumer-array probes. It provides context for a haplogroup entered from an existing report.
- **Maternal resolution depends on marker coverage and tree coverage.** The bundled phylogeny
  contains selected branches rather than the full PhyloTree. Missing markers can prevent a
  specific assignment; an unassignable sample receives no call. Sequencing may support finer
  resolution than an array.
- **Haplogroups represent individual lines of descent.** Maternal and paternal haplogroups describe
  two lineages within a much larger family history, with limited information about overall ancestry.
- **ROH results depend on coverage, filters, and denominator.** Array gaps and analysis choices affect
  the result. Compare methods and segment distributions before comparing F<sub>ROH</sub> values
  across tools.
- **Geographic coverage is limited.** The map includes a European and Mediterranean coastline.
  Frequencies outside that frame are listed instead of plotted. For lineages outside the mapped
  area, a note replaces the map while the other views remain available.
- **Analysis scope excludes chromosome painting, health and trait prediction, and relative
  matching.** The tool is intended for personal exploration, not medical, diagnostic, forensic,
  or legal use.

## Privacy

Raw genetic data is read with `FileReader` and held in browser memory during the page view. The
application does not upload it or write it to persistent browser storage. Closing the tab ends
the session; exported files remain wherever you save them.

The application includes no analytics, third-party scripts, or externally hosted fonts. The
synthetic-sample button fetches `data/sample-23andme.txt` from the same host. Loading the hosted
page also requests its static assets; local analysis requires no external service.

The exported module contains the results you select for inclusion. Review it before publishing:
ROH results and haplogroup evidence can disclose information about relatives as well as yourself.

## Usage

**Hosted:** serve the repository through GitHub Pages or another static host. The included workflow
deploys `main` on push when GitHub Pages is configured for Actions.

**Local HTTP server:** this supports the synthetic-sample button as well as file imports.

```bash
git clone https://github.com/gcarosso/deep-ancestry
cd deep-ancestry
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.

**Local file:** open `index.html` directly. Browsers may block the sample button's request to a
sibling file under `file://`; drag `data/sample-23andme.txt` onto the drop zone to load it instead.
This route also works offline.

## Embedding the module

The downloaded file contains a `<style>` block and a `<section class="anc">` block. Paste both into
your page. The module uses CSS interactions (`:hover`, `:focus-visible`, and `:has`) and requires
no JavaScript, webfonts, or network requests. Interactive elements support keyboard navigation.

The module's CSS selectors are scoped under `.anc` to limit effects on the host page, though host
styles can still affect the module. Its dark background provides a consistent inset on light pages.

## Repository layout

```
index.html              application shell
assets/style.css        application styles
assets/data.js          mtDNA phylogeny fragment and literature table
assets/geo.js           coastline sketch and region gazetteer
assets/analyze.js       parsing, ROH, mtDNA classification, and sex inference
assets/render.js        module views, styles, and export
assets/app.js           interface wiring
data/sample-23andme.txt synthetic sample genome
tools/make_sample.py    sample generator
```

The module's styles live in `render.js`. The live preview and downloaded file use the same
rendered HTML string.

## Contributions

The literature and geography tables can be extended without changing the analysis code:

- **`LITERATURE` in `assets/data.js`:** haplogroup dates, frequencies, and citations. Use
  `precision: 'published'` for a specific figure from a named paper and `precision: 'estimate'`
  for a reported range. The module displays these categories differently. Include a citation
  for every entry.
- **`REGION_GEO` in `assets/geo.js`:** provider region names and map positions. Unmapped names
  appear in the module's caption. Additional coastlines can extend the geographic coverage.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
