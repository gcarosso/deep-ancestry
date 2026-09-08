/* ---------------------------------------------------------------------------
   data.js — the curated science layer.

   Two tables:
     MT_TREE      mitochondrial phylogeny fragment, rCRS-referenced, used to
                  assign a maternal haplogroup from array calls.
     LITERATURE   per-haplogroup dating, published frequencies and citations,
                  used to draw the deep-time and geography views.

   Both are deliberately small and fully sourced. An entry with no citation does
   not belong here. See CONTRIBUTING.md — adding a haplogroup is a data-only PR.
   --------------------------------------------------------------------------- */

/* ----------------------------------------------------------------- mtDNA tree
   Every marker is {pos, anc, der}. rCRS is itself an H2a2a1 sequence, so for the
   deepest nodes the DERIVED state is the one rCRS carries: haplogroup H is
   confirmed by the ABSENCE of 2706G and 7028T, not by a positive difference.
   That inversion is the single most common bug in hand-rolled mt classifiers.

   `min` is how many of a node's markers must be called and derived to accept it.
   Nodes list only well-established defining positions.                          */
const MT_TREE = {
  id: 'rCRS-root', name: 'root', markers: [], min: 0, children: [

    { id:'M', name:'M', min:2, note:'Macrohaplogroup M — Asia, Oceania, the Americas.',
      markers:[{pos:489,anc:'T',der:'C'},{pos:10400,anc:'C',der:'T'},
               {pos:14783,anc:'T',der:'C'},{pos:15043,anc:'G',der:'A'}],
      children:[
        { id:'C', name:'C', min:2, markers:[{pos:13263,anc:'A',der:'G'},{pos:14318,anc:'T',der:'C'}],
          note:'Siberia and the Americas.' },
        { id:'D', name:'D', min:1, markers:[{pos:4883,anc:'C',der:'T'},{pos:5178,anc:'C',der:'A'}],
          note:'East Asia, Siberia, the Americas.' },
      ]},

    { id:'N', name:'N', min:3, note:'Macrohaplogroup N — the out-of-Africa branch behind most of Eurasia.',
      markers:[{pos:8701,anc:'G',der:'A'},{pos:9540,anc:'C',der:'T'},
               {pos:10398,anc:'G',der:'A'},{pos:10873,anc:'C',der:'T'},
               {pos:15301,anc:'G',der:'A'}],
      children:[

        { id:'A', name:'A', min:2, markers:[{pos:663,anc:'A',der:'G'},{pos:1736,anc:'A',der:'G'},
            {pos:4824,anc:'A',der:'G'},{pos:8794,anc:'C',der:'T'}],
          note:'East Asia and the Americas.' },
        { id:'I', name:'I', min:2, markers:[{pos:10034,anc:'T',der:'C'},{pos:16129,anc:'G',der:'A'},
            {pos:16391,anc:'G',der:'A'}], note:'Northern and eastern Europe at low frequency.' },
        { id:'W', name:'W', min:3, markers:[{pos:1243,anc:'T',der:'C'},{pos:3505,anc:'A',der:'G'},
            {pos:5046,anc:'G',der:'A'},{pos:8251,anc:'G',der:'A'},{pos:11674,anc:'C',der:'T'},
            {pos:11947,anc:'A',der:'G'}], note:'Europe, the Caucasus, South Asia.' },
        { id:'X', name:'X', min:2, markers:[{pos:6221,anc:'T',der:'C'},{pos:6371,anc:'C',der:'T'},
            {pos:13966,anc:'A',der:'G'},{pos:14470,anc:'T',der:'C'}],
          note:'Scattered across Europe, the Near East, and northern North America.',
          children:[{ id:'X2', name:'X2', min:1, markers:[{pos:1719,anc:'G',der:'A'},{pos:8393,anc:'C',der:'T'}] }]},

        { id:'R', name:'R', min:2, note:'Branch of N carrying most European lineages.',
          markers:[{pos:12705,anc:'T',der:'C'},{pos:16223,anc:'T',der:'C'}],
          children:[

            { id:'JT', name:'JT', min:2, markers:[{pos:4216,anc:'T',der:'C'},{pos:11251,anc:'A',der:'G'},
                {pos:15452,anc:'C',der:'A'},{pos:16126,anc:'T',der:'C'}],
              children:[
                { id:'J', name:'J', min:2, markers:[{pos:10398,anc:'A',der:'G'},{pos:12612,anc:'A',der:'G'},
                    {pos:13708,anc:'G',der:'A'},{pos:16069,anc:'C',der:'T'}],
                  children:[
                    { id:'J1', name:'J1', min:1, markers:[{pos:3010,anc:'G',der:'A'}]},
                    { id:'J2', name:'J2', min:1, markers:[{pos:7476,anc:'C',der:'T'},{pos:150,anc:'C',der:'T'}]},
                  ]},
                { id:'T', name:'T', min:3, markers:[{pos:709,anc:'G',der:'A'},{pos:1888,anc:'G',der:'A'},
                    {pos:4917,anc:'A',der:'G'},{pos:8697,anc:'G',der:'A'},{pos:10463,anc:'T',der:'C'},
                    {pos:13368,anc:'G',der:'A'},{pos:14905,anc:'G',der:'A'},{pos:15607,anc:'A',der:'G'},
                    {pos:15928,anc:'G',der:'A'}],
                  children:[
                    { id:'T1', name:'T1', min:1, markers:[{pos:12633,anc:'C',der:'A'}]},
                    { id:'T2', name:'T2', min:1, markers:[{pos:11812,anc:'A',der:'G'},{pos:14233,anc:'A',der:'G'}]},
                  ]},
              ]},

            { id:'U', name:'U', min:2, markers:[{pos:11467,anc:'A',der:'G'},{pos:12308,anc:'A',der:'G'},
                {pos:12372,anc:'G',der:'A'}],
              children:[
                { id:'K', name:'K', min:2, markers:[{pos:9055,anc:'G',der:'A'},{pos:11299,anc:'T',der:'C'},
                    {pos:16224,anc:'T',der:'C'},{pos:16311,anc:'T',der:'C'}],
                  children:[
                    { id:'K1', name:'K1', min:1, markers:[{pos:1189,anc:'T',der:'C'},{pos:14798,anc:'T',der:'C'}]},
                    { id:'K2', name:'K2', min:1, markers:[{pos:9716,anc:'T',der:'C'}]},
                  ]},
                { id:'U5', name:'U5', min:2, markers:[{pos:3197,anc:'T',der:'C'},{pos:9477,anc:'G',der:'A'},
                    {pos:13617,anc:'T',der:'C'},{pos:16270,anc:'C',der:'T'}],
                  children:[
                    { id:'U5a', name:'U5a', min:1, markers:[{pos:14793,anc:'A',der:'G'}]},
                    { id:'U5b', name:'U5b', min:1, markers:[{pos:7768,anc:'A',der:'G'},{pos:5656,anc:'A',der:'G'}]},
                  ]},
                { id:'U4', name:'U4', min:2, markers:[{pos:4646,anc:'T',der:'C'},{pos:11332,anc:'C',der:'T'},
                    {pos:15693,anc:'T',der:'C'}]},
                { id:'U2', name:'U2', min:1, markers:[{pos:1811,anc:'A',der:'G'},{pos:15907,anc:'A',der:'G'}]},
                { id:'U3', name:'U3', min:1, markers:[{pos:16343,anc:'A',der:'G'}]},
                { id:'U1', name:'U1', min:1, markers:[{pos:6026,anc:'G',der:'A'},{pos:285,anc:'C',der:'T'}]},
              ]},

            { id:'R0', name:'R0', min:1, markers:[{pos:73,anc:'G',der:'A'}],
              children:[
                { id:'HV', name:'HV', min:1, markers:[{pos:14766,anc:'T',der:'C'}],
                  children:[
                    { id:'V', name:'V', min:1, markers:[{pos:4580,anc:'G',der:'A'}]},
                    { id:'H', name:'H', min:2, markers:[{pos:2706,anc:'G',der:'A'},{pos:7028,anc:'T',der:'C'}],
                      note:'The commonest European maternal haplogroup. rCRS is itself an H sequence '
                         + '(H2a2a1), so H is confirmed by the absence of the ancestral alleles.',
                      children:[
                        { id:'H1', name:'H1', min:1, markers:[{pos:3010,anc:'G',der:'A'}]},
                        { id:'H3', name:'H3', min:1, markers:[{pos:6776,anc:'T',der:'C'}]},
                        { id:'H5', name:'H5', min:1, markers:[{pos:456,anc:'C',der:'T'}]},
                        { id:'H6', name:'H6', min:1, markers:[{pos:16362,anc:'T',der:'C'},{pos:239,anc:'T',der:'C'}]},
                        { id:'H7', name:'H7', min:1, markers:[{pos:4793,anc:'A',der:'G'}]},
                      ]},
                  ]},
              ]},
          ]},
      ]},
]};

/* --------------------------------------------------------------- literature
   Dating, published frequencies and citations, keyed by haplogroup.

   precision:'published'  a specific figure from the named paper. Rendered plainly.
   precision:'estimate'   a directional range widely reported but not traceable to one
                          figure. Rendered muted and prefixed "~". Never treat as a datum.

   Coordinates place a frequency on the map. Points outside the mapped frame are
   listed in the caption instead of being dropped silently.                        */
const LITERATURE = {

  /* ------------------------------------------------------------------ mtDNA */
  mt: {
    'H': { label:'H', kind:'mt',
      coalescence:{y:22000, lo:18000, hi:26000, precision:'estimate'},
      origin:{lon:38.0, lat:37.0, label:'Near East / South Caucasus'},
      freqs:[{lon:2.0,lat:47.0,label:'Europe overall',pct:42,precision:'estimate'}],
      note:'The commonest maternal haplogroup in Europe, carried by roughly four in ten '
         + 'Europeans. It arrived from the Near East before the Last Glacial Maximum and '
         + 'expanded through several independent post-glacial subclades, which is why H '
         + 'on its own says very little — the subclade is where the information is.',
      sources:['Achilli et al., Am J Hum Genet 75:910 (2004)',
               'Torroni et al., Trends Genet 22:339 (2006)'] },

    'H1': { label:'H1', kind:'mt',
      coalescence:{y:12000, lo:9000, hi:15000, precision:'estimate'},
      origin:{lon:-2.0, lat:43.3, label:'Franco-Cantabrian refuge'},
      freqs:[{lon:-2.0,lat:43.3,label:'Basque country',pct:27,precision:'estimate'},
             {lon:-8.3,lat:42.6,label:'Galicia',pct:19,precision:'estimate'}],
      note:'With H3, one of the two clades Achilli and colleagues read as the signature of '
         + 'the post-glacial re-expansion out of the Franco-Cantabrian refuge. It peaks in '
         + 'Iberia and thins toward the east and north.',
      sources:['Achilli et al., Am J Hum Genet 75:910 (2004)'] },

    'H3': { label:'H3', kind:'mt',
      coalescence:{y:11000, lo:9600, hi:12400, precision:'published'},
      origin:{lon:-2.0, lat:43.3, label:'Franco-Cantabrian refuge'},
      freqs:[{lon:-2.0,lat:43.3,label:'Basques',pct:13.9,precision:'published'},
             {lon:9.0,lat:40.0,label:'Sardinia',pct:8.5,precision:'published'},
             {lon:-8.3,lat:42.6,label:'Galicia',pct:8.3,precision:'published'},
             {lon:22.0,lat:39.5,label:'mainland Greece',pct:1.3,precision:'published'},
             {lon:26.5,lat:38.4,label:'Aegean',pct:0.4,precision:'published'}],
      note:'Dated to 11.0 ± 1.4 thousand years and read as a marker of the post-glacial '
         + 'expansion out of the Franco-Cantabrian refuge. It peaks in the southwest and '
         + 'declines steeply eastward. Note that H makes up 23% of Ashkenazi maternal lineages, '
         + '39% of those in H1 or H3, on lineages argued to have been assimilated in the Italian '
         + 'peninsula around 2,000 years ago — so in a genome with both Southern European and '
         + 'Ashkenazi ancestry, H3 cannot distinguish the two.',
      sources:['Achilli et al., Am J Hum Genet 75:910 (2004)',
               'Costa et al., Nat Commun 4:2543 (2013)'] },

    'V': { label:'V', kind:'mt',
      coalescence:{y:13000, lo:10000, hi:16000, precision:'estimate'},
      origin:{lon:-2.0, lat:43.3, label:'Franco-Cantabrian refuge'},
      freqs:[{lon:25.0,lat:68.5,label:'Saami',pct:40,precision:'estimate'},
             {lon:-2.0,lat:43.3,label:'Basques / Cantabria',pct:12,precision:'estimate'}],
      note:'A third post-glacial clade from the same refuge, with a striking secondary peak '
         + 'among the Saami of northern Fennoscandia.',
      sources:['Torroni et al., Am J Hum Genet 69:844 (2001)'] },

    'U5': { label:'U5', kind:'mt',
      coalescence:{y:30000, lo:25000, hi:35000, precision:'estimate'},
      origin:{lon:15.0, lat:48.0, label:'Europe'},
      freqs:[{lon:25.0,lat:68.5,label:'Saami (U5b1b)',pct:48,precision:'estimate'},
             {lon:15.0,lat:48.0,label:'Europe overall',pct:10,precision:'estimate'}],
      note:'The oldest maternal lineage specific to Europe. Ancient DNA from Mesolithic '
         + 'hunter-gatherer burials is dominated by U lineages, U5 above all — so a modern U5 '
         + 'carrier sits on the continent’s pre-farming maternal line.',
      sources:['Bramanti et al., Science 326:137 (2009)',
               'Achilli et al., Am J Hum Genet 76:883 (2005)'] },

    'U4': { label:'U4', kind:'mt', coalescence:{y:25000, lo:20000, hi:30000, precision:'estimate'},
      origin:{lon:35.0, lat:55.0, label:'Eastern Europe / Western Siberia'}, freqs:[],
      note:'A hunter-gatherer-associated sister clade of U5, commonest today in eastern Europe '
         + 'and western Siberia.', sources:['Malyarchuk et al., Ann Hum Genet 72:241 (2008)'] },

    'K': { label:'K', kind:'mt',
      coalescence:{y:20000, lo:16000, hi:24000, precision:'estimate'},
      origin:{lon:40.0, lat:38.0, label:'Near East'},
      freqs:[{lon:19.0,lat:50.0,label:'Ashkenazi (K1a1b1a, K1a9, K2a2a)',pct:32,precision:'published'}],
      note:'A branch of U. Three K founder lineages account for roughly 32% of Ashkenazi maternal '
         + 'lineages — part of the four-founder pattern Behar and colleagues described, which '
         + 'together carry about 40% of Ashkenazi mtDNA. Separately, the Tyrolean Iceman was K1f.',
      sources:['Behar et al., Am J Hum Genet 78:487 (2006)',
               'Ermini et al., Curr Biol 18:1687 (2008)'] },

    'J': { label:'J', kind:'mt', coalescence:{y:30000, lo:25000, hi:35000, precision:'estimate'},
      origin:{lon:42.0, lat:36.0, label:'Near East'},
      freqs:[{lon:10.0,lat:48.0,label:'Europe overall',pct:11,precision:'estimate'}],
      note:'Near Eastern in origin and spread widely into Europe; subclade J1c in particular is '
         + 'associated with the Neolithic farming expansion.',
      sources:['Pala et al., Am J Hum Genet 90:915 (2012)'] },

    'T': { label:'T', kind:'mt', coalescence:{y:28000, lo:22000, hi:34000, precision:'estimate'},
      origin:{lon:42.0, lat:36.0, label:'Near East'},
      freqs:[{lon:10.0,lat:48.0,label:'Europe overall',pct:9,precision:'estimate'}],
      note:'Sister clade to J, likewise Near Eastern and likewise carried into Europe with farming.',
      sources:['Pala et al., Am J Hum Genet 90:915 (2012)'] },

    'X': { label:'X', kind:'mt', coalescence:{y:30000, lo:24000, hi:36000, precision:'estimate'},
      origin:{lon:42.0, lat:38.0, label:'Near East'}, freqs:[],
      note:'Thinly spread across Europe, the Near East and North Africa. The X2a branch is one of '
         + 'the founding maternal lineages of the Americas, which made X a favourite of '
         + 'trans-Atlantic pseudo-history; the branches are deeply separate and the resemblance '
         + 'is nomenclature, not ancestry.',
      sources:['Reidla et al., Am J Hum Genet 73:1178 (2003)'] },

    'I': { label:'I', kind:'mt', coalescence:{y:25000, lo:20000, hi:30000, precision:'estimate'},
      origin:{lon:40.0, lat:40.0, label:'Near East / Caucasus'}, freqs:[],
      note:'A low-frequency European and Near Eastern clade, nowhere common.', sources:[] },

    'W': { label:'W', kind:'mt', coalescence:{y:24000, lo:19000, hi:29000, precision:'estimate'},
      origin:{lon:45.0, lat:38.0, label:'Near East / South Asia'}, freqs:[],
      note:'Low frequency across Europe, the Caucasus and South Asia.', sources:[] },

    'A': { label:'A', kind:'mt', coalescence:{y:30000, lo:25000, hi:40000, precision:'estimate'},
      origin:{lon:105.0, lat:50.0, label:'East Asia'}, freqs:[],
      note:'One of the five founding maternal haplogroups of the Americas, alongside B, C, D and X2a.',
      sources:['Tamm et al., PLoS ONE 2:e829 (2007)'] },
    'C': { label:'C', kind:'mt', coalescence:{y:30000, lo:24000, hi:38000, precision:'estimate'},
      origin:{lon:100.0, lat:55.0, label:'Siberia'}, freqs:[],
      note:'A founding maternal haplogroup of the Americas, and common across Siberia.',
      sources:['Tamm et al., PLoS ONE 2:e829 (2007)'] },
    'D': { label:'D', kind:'mt', coalescence:{y:32000, lo:26000, hi:40000, precision:'estimate'},
      origin:{lon:105.0, lat:52.0, label:'East Asia / Siberia'}, freqs:[],
      note:'A founding maternal haplogroup of the Americas; also widespread in East Asia.',
      sources:['Tamm et al., PLoS ONE 2:e829 (2007)'] },

    'M': { label:'M', kind:'mt', coalescence:{y:50000, lo:42000, hi:60000, precision:'estimate'},
      origin:{lon:70.0, lat:22.0, label:'South Asia'}, freqs:[],
      note:'One of the two macrohaplogroups descending from L3 that carry every non-African '
         + 'maternal lineage. M dominates South and East Asia.', sources:[] },
    'N': { label:'N', kind:'mt', coalescence:{y:55000, lo:45000, hi:65000, precision:'estimate'},
      origin:{lon:45.0, lat:25.0, label:'Arabia / Near East'}, freqs:[],
      note:'The other macrohaplogroup out of Africa, and the root of nearly every European '
         + 'maternal lineage.', sources:[] },
    'R': { label:'R', kind:'mt', coalescence:{y:52000, lo:44000, hi:62000, precision:'estimate'},
      origin:{lon:50.0, lat:28.0, label:'Southwest Asia'}, freqs:[],
      note:'The branch of N that carries H, V, U, K, J and T — most of Europe.', sources:[] },
  },

  /* ---------------------------------------------------------------- Y-DNA */
  y: {
    'E-V13': { label:'E-V13', kind:'y',
      coalescence:{y:2354, lo:1522, hi:3186, precision:'published',
                   scope:'local common ancestor in Sicily and southern Italy'},
      origin:{lon:20.6, lat:42.3, label:'Southern Balkans'},
      freqs:[{lon:20.9,lat:42.6,label:'Kosovo Albanians',pct:45.6,precision:'published'},
             {lon:21.4,lat:41.6,label:'Macedonian Albanians',pct:34.4,precision:'published'},
             {lon:15.3,lat:38.4,label:'Sicily & southern Italy',pct:9.5,precision:'published'}],
      note:'The commonest E-M215 subclade in Europe, peaking emphatically in the Balkans. Its '
         + 'southern-Italian common ancestor dates to the Iron Age or Roman period, which points '
         + 'to arrival from the southern Balkans rather than deep local continuity. Most E-V13 men '
         + 'carry no known downstream mutation and are simply E-V13*; going below V13 needs '
         + 'sequencing, not an array.',
      sources:['Sarno et al., PLoS ONE 9:e96074 (2014)',
               'Cruciani et al., Mol Biol Evol 24:1300 (2007)'] },

    'R1b-M269': { label:'R1b-M269', kind:'y',
      coalescence:{y:6000, lo:4500, hi:8000, precision:'estimate'},
      origin:{lon:45.0, lat:48.0, label:'Pontic-Caspian steppe'},
      freqs:[{lon:-2.0,lat:43.3,label:'Basques',pct:87,precision:'estimate'},
             {lon:-8.0,lat:53.4,label:'Ireland',pct:81,precision:'estimate'},
             {lon:2.3,lat:46.5,label:'France',pct:58,precision:'estimate'},
             {lon:19.0,lat:52.0,label:'Poland',pct:12,precision:'estimate'}],
      note:'The most common paternal lineage in western Europe, and one of the clearest signals of '
         + 'the Bronze Age steppe migration: ancient-DNA work found the arrival of steppe ancestry '
         + 'in Britain coincided with a near-complete turnover of the male line. Frequency falls '
         + 'steeply from the Atlantic toward the east.',
      sources:['Olalde et al., Nature 555:190 (2018)',
               'Myres et al., Eur J Hum Genet 19:95 (2011)'] },

    'R1a-M198': { label:'R1a-M198', kind:'y',
      coalescence:{y:5500, lo:4000, hi:7000, precision:'estimate'},
      origin:{lon:50.0, lat:50.0, label:'Pontic-Caspian steppe'},
      freqs:[{lon:19.0,lat:52.0,label:'Poland',pct:56,precision:'estimate'},
             {lon:37.0,lat:55.0,label:'Russia',pct:46,precision:'estimate'},
             {lon:20.5,lat:44.8,label:'Balkans',pct:15,precision:'estimate'}],
      note:'The eastern counterpart to R1b-M269, dominant in Slavic-speaking Europe and also '
         + 'common in South Asia. Both expanded out of the steppe in the third millennium BCE.',
      sources:['Haak et al., Nature 522:207 (2015)',
               'Underhill et al., Eur J Hum Genet 23:124 (2015)'] },

    'I1-M253': { label:'I1-M253', kind:'y',
      coalescence:{y:4600, lo:3500, hi:5800, precision:'estimate'},
      origin:{lon:14.0, lat:59.0, label:'Scandinavia'},
      freqs:[{lon:15.0,lat:62.0,label:'Sweden',pct:37,precision:'estimate'},
             {lon:9.0,lat:56.0,label:'Denmark',pct:34,precision:'estimate'},
             {lon:-1.5,lat:53.0,label:'England',pct:14,precision:'estimate'}],
      note:'A young, star-like Scandinavian lineage: nearly all living I1 men descend from a common '
         + 'ancestor only a few thousand years back, the signature of a rapid founder expansion.',
      sources:['Rootsi et al., Am J Hum Genet 75:128 (2004)'] },

    'I2a-M423': { label:'I2a-M423', kind:'y',
      coalescence:{y:2500, lo:1800, hi:3500, precision:'estimate'},
      origin:{lon:18.5, lat:44.0, label:'Western Balkans'},
      freqs:[{lon:17.8,lat:44.0,label:'Bosnia & Herzegovina',pct:50,precision:'estimate'},
             {lon:20.5,lat:44.8,label:'Serbia',pct:34,precision:'estimate'}],
      note:'A Balkan lineage with a very recent expansion, often called the "Dinaric" cluster.',
      sources:['Rootsi et al., Eur J Hum Genet 12:673 (2004)'] },

    'J2-M172': { label:'J2-M172', kind:'y',
      coalescence:{y:20000, lo:15000, hi:25000, precision:'estimate'},
      origin:{lon:40.0, lat:38.0, label:'Anatolia / northern Fertile Crescent'},
      freqs:[{lon:23.7,lat:38.0,label:'Greece',pct:22,precision:'estimate'},
             {lon:15.0,lat:38.5,label:'Southern Italy',pct:22,precision:'estimate'},
             {lon:35.0,lat:39.0,label:'Anatolia',pct:24,precision:'estimate'}],
      note:'Associated with the Neolithic expansion out of the northern Fertile Crescent and later '
         + 'with Bronze Age Mediterranean movement. Common right across the northern Mediterranean.',
      sources:['Semino et al., Am J Hum Genet 74:1023 (2004)'] },

    'J1-M267': { label:'J1-M267', kind:'y',
      coalescence:{y:18000, lo:12000, hi:24000, precision:'estimate'},
      origin:{lon:44.0, lat:33.0, label:'Fertile Crescent / Arabia'},
      freqs:[{lon:45.0,lat:15.5,label:'Yemen',pct:72,precision:'estimate'},
             {lon:51.2,lat:25.3,label:'Qatar',pct:58,precision:'estimate'}],
      note:'Dominant on the Arabian peninsula. The Cohen Modal Haplotype, associated with the '
         + 'Jewish priestly line, sits within J1 (subclade J1c3/P58).',
      sources:['Hammer et al., Hum Genet 126:707 (2009)',
               'Chiaroni et al., Eur J Hum Genet 18:348 (2010)'] },

    'G2a-P15': { label:'G2a-P15', kind:'y',
      coalescence:{y:15000, lo:11000, hi:20000, precision:'estimate'},
      origin:{lon:44.0, lat:41.5, label:'South Caucasus / eastern Anatolia'},
      freqs:[{lon:43.5,lat:42.0,label:'Georgia',pct:30,precision:'estimate'},
             {lon:9.0,lat:40.0,label:'Sardinia',pct:12,precision:'estimate'}],
      note:'The dominant paternal lineage of early European farmers — the Tyrolean Iceman was G2a '
         + '— largely replaced across Europe by the later steppe expansions and now surviving at '
         + 'high frequency mainly in the Caucasus and on Sardinia.',
      sources:['Keller et al., Nat Commun 3:698 (2012)',
               'Lacan et al., PNAS 108:9788 (2011)'] },

    'E-M81': { label:'E-M81', kind:'y',
      coalescence:{y:2500, lo:1800, hi:3500, precision:'estimate'},
      origin:{lon:-5.0, lat:32.0, label:'Northwest Africa'},
      freqs:[{lon:-6.0,lat:32.0,label:'Moroccan Berbers',pct:70,precision:'estimate'},
             {lon:-3.0,lat:35.5,label:'Northwest Africa overall',pct:55,precision:'estimate'}],
      note:'The characteristic Berber paternal lineage of the Maghreb, with a very recent expansion.',
      sources:['Arredi et al., Am J Hum Genet 75:338 (2004)'] },

    'N-M231': { label:'N-M231', kind:'y',
      coalescence:{y:20000, lo:15000, hi:25000, precision:'estimate'},
      origin:{lon:105.0, lat:52.0, label:'Northeast Asia'},
      freqs:[{lon:25.0,lat:62.0,label:'Finland (N1c)',pct:59,precision:'estimate'},
             {lon:25.0,lat:56.5,label:'Baltic',pct:40,precision:'estimate'}],
      note:'Expanded westward across northern Eurasia from Siberia; dominant in Finland and the '
         + 'Baltic and strongly associated with Uralic-speaking populations.',
      sources:['Rootsi et al., Eur J Hum Genet 15:204 (2007)'] },

    'Q-M242': { label:'Q-M242', kind:'y',
      coalescence:{y:25000, lo:20000, hi:32000, precision:'estimate'},
      origin:{lon:100.0, lat:52.0, label:'Central Siberia'}, freqs:[],
      note:'The principal founding paternal lineage of the Americas, and present across Siberia '
         + 'and Central Asia.', sources:['Battaglia et al., Eur J Hum Genet 21:1039 (2013)'] },

    'T-M70': { label:'T-M70', kind:'y', coalescence:{y:20000, lo:14000, hi:26000, precision:'estimate'},
      origin:{lon:45.0, lat:33.0, label:'Near East'}, freqs:[],
      note:'Uncommon everywhere, scattered from the Horn of Africa to the Mediterranean and South Asia.',
      sources:[] },
    'O-M175': { label:'O-M175', kind:'y', coalescence:{y:30000, lo:24000, hi:38000, precision:'estimate'},
      origin:{lon:110.0, lat:28.0, label:'East Asia'}, freqs:[],
      note:'The dominant paternal lineage of East and Southeast Asia.', sources:[] },
    'C-M130': { label:'C-M130', kind:'y', coalescence:{y:45000, lo:35000, hi:55000, precision:'estimate'},
      origin:{lon:100.0, lat:35.0, label:'Asia'}, freqs:[],
      note:'An ancient lineage spread from Australia to Siberia and the Americas.', sources:[] },
    'E-M2': { label:'E-M2', kind:'y', coalescence:{y:20000, lo:15000, hi:28000, precision:'estimate'},
      origin:{lon:10.0, lat:8.0, label:'West Africa'}, freqs:[],
      note:'The dominant paternal lineage of sub-Saharan Africa, carried across the continent by the '
         + 'Bantu expansion.', sources:['Cruciani et al., Am J Hum Genet 70:1197 (2002)'] },
  },
};

/* Shared deep-time anchors drawn on every timeline, so a single lineage always has
   a scale to sit against. */
const ANCHORS = [
  { id:'ooa', label:'Out of Africa', y:60000, lo:50000, hi:70000, precision:'estimate',
    note:'The dispersal that carries every non-African lineage, macrohaplogroups M and N included.',
    sources:['Nielsen et al., Nature 541:302 (2017)'] },
  { id:'nean', label:'Neanderthal admixture', y:55000, lo:47000, hi:65000, precision:'estimate',
    note:'Interbreeding in the Near East, leaving roughly 1.5–2% Neanderthal ancestry in every '
       + 'genome outside Africa. Not computable from an array — your provider’s percentile is '
       + 'the number to use.',
    sources:['Sankararaman et al., PLoS Genet 8:e1002947 (2012)'] },
  { id:'lgm', label:'Last Glacial Maximum', y:21000, lo:19000, hi:26500, precision:'published',
    note:'The ice sheets at their greatest extent. European populations contracted into southern '
       + 'refugia; nearly every post-glacial European lineage expansion dates to the recovery from it.',
    sources:['Clark et al., Science 325:710 (2009)'] },
  { id:'neo', label:'Neolithic farming reaches Europe', y:8500, lo:8000, hi:9000, precision:'estimate',
    note:'Farmers out of Anatolia, carrying a distinct ancestry and largely distinct paternal lineages, '
       + 'spread across Europe over roughly two millennia.',
    sources:['Mathieson et al., Nature 528:499 (2015)'] },
  { id:'steppe', label:'Steppe expansion into Europe', y:4800, lo:4500, hi:5000, precision:'estimate',
    note:'The Yamnaya-related migration that reshaped European ancestry and, in places, almost '
       + 'entirely replaced the male line.',
    sources:['Haak et al., Nature 522:207 (2015)', 'Olalde et al., Nature 555:190 (2018)'] },
];
