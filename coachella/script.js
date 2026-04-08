/* ============================================================
   The Strikers of Coachella — A Visual Companion
   State machine + page rendering
   ============================================================ */

// ----- SVG snippets reused across pages -----------------------

const SVG_EAGLE = `
<svg class="eagle" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg" aria-label="Stepped eagle">
  <g fill="#c8102e">
    <!-- center vertical body -->
    <rect x="135" y="20" width="30" height="160"/>
    <!-- left wing steps -->
    <rect x="0"  y="60"  width="135" height="20"/>
    <rect x="20" y="80"  width="115" height="20"/>
    <rect x="40" y="100" width="95"  height="20"/>
    <rect x="60" y="120" width="75"  height="20"/>
    <rect x="80" y="140" width="55"  height="20"/>
    <!-- right wing steps -->
    <rect x="165" y="60"  width="135" height="20"/>
    <rect x="165" y="80"  width="115" height="20"/>
    <rect x="165" y="100" width="95"  height="20"/>
    <rect x="165" y="120" width="75"  height="20"/>
    <rect x="165" y="140" width="55"  height="20"/>
  </g>
</svg>
`;

const SVG_MAP = `
<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" aria-label="Coachella Valley map">
  <defs>
    <pattern id="grain" width="3" height="3" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.4" fill="#2b1a0e" opacity="0.25"/>
    </pattern>
  </defs>
  <!-- background -->
  <rect width="400" height="260" fill="#f1e3c4"/>
  <rect width="400" height="260" fill="url(#grain)"/>

  <!-- mountain ranges (textured ridges) -->
  <path d="M30,40 L70,18 L110,42 L160,16 L210,40 L260,18 L310,38 L360,20 L380,38 L380,70 L30,70 Z"
        fill="none" stroke="#5b3618" stroke-width="1.4"/>
  <text x="80" y="34" font-family="Special Elite, monospace" font-size="7" fill="#5b3618">SAN BERNARDINO MTS</text>

  <path d="M20,180 L60,160 L100,184 L140,158 L190,180 L230,158 L280,180 L320,160 L370,180"
        fill="none" stroke="#5b3618" stroke-width="1.4"/>
  <text x="40" y="200" font-family="Special Elite, monospace" font-size="7" fill="#5b3618">SANTA ROSA MTS</text>

  <!-- The valley floor — cross-hatched -->
  <path d="M80,80 L320,80 L300,160 L100,160 Z" fill="#e6d3a8" stroke="#8a5a2e" stroke-width="0.6" stroke-dasharray="2 2"/>

  <!-- Salton Sea -->
  <ellipse cx="290" cy="220" rx="60" ry="22" fill="#b8c5cc" stroke="#5b3618" stroke-width="0.8"/>
  <text x="262" y="223" font-family="Special Elite, monospace" font-size="7" fill="#2b1a0e">SALTON SEA</text>

  <!-- railroad line -->
  <line x1="40" y1="120" x2="380" y2="120" stroke="#2b1a0e" stroke-width="0.8" stroke-dasharray="6 3"/>
  <text x="340" y="115" font-family="Special Elite, monospace" font-size="6" fill="#2b1a0e">SOUTHERN PACIFIC</text>

  <!-- towns -->
  <g font-family="Special Elite, monospace" font-size="9" fill="#2b1a0e">
    <circle cx="120" cy="118" r="3.5" fill="#c8102e"/>
    <text x="128" y="121">Indio</text>

    <circle cx="155" cy="125" r="3.5" fill="#c8102e"/>
    <text x="163" y="128">Coachella</text>

    <circle cx="200" cy="135" r="3.5" fill="#c8102e"/>
    <text x="208" y="138">Thermal</text>

    <circle cx="245" cy="148" r="3.5" fill="#c8102e"/>
    <text x="253" y="151">Mecca</text>

    <circle cx="80" cy="100" r="3" fill="#c8102e"/>
    <text x="88" y="103">Palm Springs</text>
  </g>

  <!-- compass rose -->
  <g transform="translate(360,40)">
    <line x1="0" y1="-12" x2="0" y2="12" stroke="#2b1a0e" stroke-width="1"/>
    <line x1="-12" y1="0" x2="12" y2="0" stroke="#2b1a0e" stroke-width="1"/>
    <text x="-3" y="-15" font-family="Special Elite, monospace" font-size="8" fill="#2b1a0e">N</text>
  </g>
</svg>
`;

// ----- PHOTO HELPER -------------------------------------------
//
// Every image rendered through this helper is in the public domain.
// See CREDITS.md for full provenance.
//
// `cite` is a one-line attribution shown as a figcaption on every page
// the image appears.

function photo(file, alt, cite, opts = {}) {
  const cls = ['photo-figure', opts.className].filter(Boolean).join(' ');
  return `
    <figure class="${cls}">
      <img src="images/${file}" alt="${alt}" loading="lazy"/>
      <figcaption>${cite}</figcaption>
    </figure>
  `;
}

// Short attribution strings, reused across pages.
const PD_NOTE = '· Library of Congress · <span class="pd">public domain</span>';
const LANGE_1937 = `Dorothea Lange · 1937 ${PD_NOTE}`;
const LANGE_1935 = `Dorothea Lange · 1935 ${PD_NOTE}`;
const LANGE_1939 = `Dorothea Lange · 1939 ${PD_NOTE}`;
const HIGHSMITH_2012 = `Carol M. Highsmith · 2012 ${PD_NOTE}`;

// Citation helper for book quotes — every line of body copy in this zine
// is a direct quotation from Paiz's book, attributed inline.
function cite(page, ch) {
  const chBit = ch ? `, ${ch}` : '';
  return `<cite>— Paiz${chBit}, p. ${page}</cite>`;
}
function citeOther(speaker, where) {
  return `<cite>— ${speaker}, ${where}</cite>`;
}

// ----- PAGES --------------------------------------------------

const PAGES = [
  // -------- 0 — TITLE PAGE --------
  {
    id: 'about',
    layout: 'title',
    title: 'The Strikers of Coachella',
    render: () => `
      <div class="page-content">
        <h1>The Strikers<br/>of Coachella</h1>
        <p class="chapter-sub">after the book by christian o. paiz</p>
      </div>
    `
  },

  // -------- filler — pushes small-place title to the left of next spread --------
  {
    id: 'opening-photo',
    layout: 'pure',
    title: "Date Picker's Home (variant)",
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">date picker's home · coachella valley · 1935</p>
        ${photo('17_date_pickers_home_b_lange_1935.jpg',
                "A date picker's home in the Coachella Valley, 1935",
                `<em>Date picker's home.</em> ${LANGE_1935}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- 1 — IN A SMALL PLACE (title page) --------
  {
    id: 'small-place',
    layout: 'title',
    title: 'In a Small Place',
    render: () => `
      <div class="page-content">
        <p class="chapter-num">introduction</p>
        <h1>In a<br/>Small Place</h1>
        <p class="chapter-sub">christian o. paiz · the strikers of coachella</p>
      </div>
    `
  },

  // -------- 2 — Salton Sea (pure photo) --------
  {
    id: 'salton',
    layout: 'pure',
    title: 'The Salton Sea',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">the salton sea · 2012</p>
        ${photo('11_salton_sea_highsmith_2012.jpg',
                'The Salton Sea',
                `<em>The Salton Sea.</em> ${HIGHSMITH_2012}`,
                { className: 'document fullbleed' })}
      </div>
    `
  },

  // -------- 4 — The Field (cabbage, pure photo) --------
  {
    id: 'field',
    layout: 'pure',
    title: 'The Field',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">cabbage harvest · imperial valley · 1937</p>
        ${photo('14_cabbage_harvesting_lange_1937.jpg',
                'Cabbage harvest in the Imperial Valley, 1937',
                `<em>Cabbage harvesting. Imperial Valley.</em> ${LANGE_1937}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- 5 — Date palms (pure photo) --------
  {
    id: 'palms',
    layout: 'pure',
    title: 'Date Palms',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">date palms · coachella valley · 1937</p>
        ${photo('02_date_palms_b_lange_1937.jpg',
                'Date palms in the Coachella Valley, 1937',
                `<em>Date palms.</em> ${LANGE_1937}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- 6 — PEREGRINACIÓN (title page) --------
  {
    id: 'pilgrimage-title',
    layout: 'title',
    title: 'Peregrinación',
    render: () => `
      <div class="page-content">
        <p class="chapter-num">delano → sacramento</p>
        <h1>Peregrinación.</h1>
        <p class="chapter-sub">march 17 – april 10, 1966</p>
      </div>
    `
  },

  // -------- 7 — Pilgrimage Route document (pure) --------
  {
    id: 'pilgrimage-doc',
    layout: 'pure',
    title: 'Pilgrimage Route',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">peregrinación route &amp; schedule · ufw 1966</p>
        ${photo('19_pilgrimage_route_ufw_1966.jpg',
                'The 1966 typewritten UFW pilgrimage route from Delano to Sacramento, with hand-drawn UFW eagle',
                `<em>Peregrinación Route and Schedule.</em> UFW · 1966 · Internet Archive · <span class="pd">public domain</span>`,
                { className: 'document fullbleed' })}
      </div>
    `
  },

  // -------- 8 — THE LAW OF THE JUNGLE (title page) --------
  {
    id: 'jungle-title',
    layout: 'title',
    title: 'The Law of the Jungle',
    render: () => `
      <div class="page-content">
        <p class="chapter-num">chapter one</p>
        <h1>The Law of<br/>the Jungle</h1>
        <p class="chapter-sub">power and society in the coachella valley · 1945–1965</p>
      </div>
    `
  },

  // -------- 9 — Carrot pullers (pure photo) --------
  {
    id: 'pullers',
    layout: 'pure',
    title: 'Carrot Pullers',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">carrot pullers · coachella valley · 1937</p>
        ${photo('05_carrot_pullers_lange_1937.jpg',
                'Carrot pullers in the Coachella Valley, 1937',
                `<em>Carrot pullers from Texas, Oklahoma, Missouri, Arkansas and Mexico.</em> ${LANGE_1937}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- 11 — Drought refugee (pure photo) --------
  {
    id: 'drought',
    layout: 'pure',
    title: 'Drought Refugee',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">drought refugee · coachella valley · 1937</p>
        ${photo('07_drought_refugee_car_lange_1937.jpg',
                'Drought refugee\'s car at the edge of a Coachella Valley carrot field',
                `<em>Car of drought refugee on edge of carrot field.</em> ${LANGE_1937}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- 12 — VIVA LA HUELGA (handbill) --------
  {
    id: 'huelga',
    layout: 'pure',
    title: '¡Viva la Huelga!',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">united farm workers · 1965</p>
        ${photo('21_unidos_venceremos_ufw_1965.jpg',
                'United Farm Workers handbill: Unidos Venceremos, ¡Viva la Huelga!',
                `<em>Unidos venceremos · ¡Viva la huelga!</em> UFW · 1965 · Internet Archive · <span class="pd">public domain</span>`,
                { className: 'document fullbleed' })}
      </div>
    `
  },

  // -------- 13 — FACES (2x2 portrait grid) --------
  {
    id: 'faces',
    layout: 'malcriado',
    title: 'Faces',
    render: () => `
      <div class="page-content">
        <div class="nameplate">FACES</div>
        <p class="eyebrow">strikers, before the strike · 1937–1939</p>
        <div class="photo-grid faces-grid">
          <div class="photo">
            <img src="images/12_filipino_lettuce_laborer_lange_1939.jpg" alt="Filipino lettuce field laborer"/>
          </div>
          <div class="photo">
            <img src="images/04_mexican_child_carrots_lange_1937.jpg" alt="Mexican child tying carrots"/>
          </div>
          <div class="photo">
            <img src="images/09_ex_tenant_farmer_lange_1937.jpg" alt="Ex-tenant farmer from Texas"/>
          </div>
          <div class="photo">
            <img src="images/08_carrot_puller_lange_1937.jpg" alt="One of a hundred carrot pullers"/>
          </div>
        </div>
        <p class="caption">all four photographs: Dorothea Lange · Coachella &amp; Imperial Valleys ${PD_NOTE}</p>
      </div>
    `
  },

  // -------- filler — pushes Rancher Nation title to the left of next spread --------
  {
    id: 'brawley',
    layout: 'pure',
    title: 'Brawley Housing',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">housing · brawley, imperial valley · 1935</p>
        ${photo('18_housing_brawley_lange_1935.jpg',
                'Housing in Brawley, Imperial Valley, 1935',
                `<em>Housing. Brawley, Imperial Valley.</em> ${LANGE_1935}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- 14 — THE RANCHER NATION (title page) --------
  {
    id: 'rancher-title',
    layout: 'title',
    title: 'The Rancher Nation',
    render: () => `
      <div class="page-content">
        <p class="chapter-num">absolute monarchs</p>
        <h1>The<br/>Rancher Nation</h1>
        <p class="chapter-sub">a kingdom of bosses, judges, police, churches, and newspapers</p>
      </div>
    `
  },

  // -------- 15 — Date picker's home (pure photo) --------
  {
    id: 'home',
    layout: 'pure',
    title: "Date Picker's Home",
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">date picker's home · coachella valley · 1935</p>
        ${photo('03_date_pickers_home_lange_1935.jpg',
                'A date picker\'s home in the Coachella Valley, 1935',
                `<em>Date picker's home.</em> ${LANGE_1935}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- 16 — Quote: life and death --------
  {
    id: 'q-king',
    layout: 'quote',
    title: 'Life and death',
    render: () => `
      <div class="page-content">
        <p class="big-quote red">"He is life and death."</p>
        <div class="quote-rule"></div>
        <p class="quote-attribution">— a ufw member, quoted in paiz, p. 12</p>
      </div>
    `
  },

  // -------- 8 — POLICE BRUTALITY (UFWOC document, pure) --------
  {
    id: 'brutality',
    layout: 'pure',
    title: 'On Police Brutality',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">ufwoc statement · october 25, 1966</p>
        ${photo('24_police_brutality_ufwoc_1966.jpg',
                'UFWOC statement regarding police brutality',
                `<em>UFWOC Statement on Police Brutality.</em> 1966 · Internet Archive · <span class="pd">public domain</span>`,
                { className: 'document fullbleed' })}
      </div>
    `
  },

  // -------- 9 — DON'T BUY GRAPES (boycott handbill) --------
  {
    id: 'boycott',
    layout: 'pure',
    title: "Don't Buy Grapes",
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">ufwoc boycott handbill · 1967</p>
        ${photo('22_attention_consumers_ufw_1967.jpg',
                'Attention Consumers — UFW boycott handbill from Rio Grande City, Texas',
                `<em>Attention Consumers!</em> UFWOC · 1967 · Internet Archive · <span class="pd">public domain</span>`,
                { className: 'document fullbleed' })}
      </div>
    `
  },

  // -------- 10 — LA ESPERANZA (pamphlet, pure) --------
  {
    id: 'esperanza',
    layout: 'pure',
    title: 'La Esperanza del Campesino',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">october 1966</p>
        ${photo('23_esperanza_campesino_ufw_1966.jpg',
                'La Esperanza del Campesino por Justicia — UFW pamphlet, 1966',
                `<em>La Esperanza del Campesino por Justicia.</em> UFW · 1966 · Internet Archive · <span class="pd">public domain</span>`,
                { className: 'document fullbleed' })}
      </div>
    `
  },

  // -------- 6 — SI SE PUEDE --------
  {
    id: 'sisepuede',
    layout: 'sisepuede',
    title: 'Sí Se Puede',
    render: () => `
      <div class="page-content">
        <div class="big-text">Sí Se<br/>Puede.</div>
        ${photo('29_dolores_huerta_eric_guo_ccby.jpg',
                'Dolores Huerta, co-founder of the United Farm Workers, photographed by Eric Guo',
                `<em>Dolores Huerta.</em> Eric Guo · <span class="pd">CC&nbsp;BY&nbsp;2.0</span> · via Wikimedia Commons`,
                { className: 'hero full' })}
        <blockquote class="centered">
          "Madness in their hearts. Patience. Laughter, and humor."
          <cite>— Pete Velasco, on his fellow strikers, p. 278</cite>
        </blockquote>
      </div>
    `
  },

  // -------- 7 — VOICES --------
  {
    id: 'voices',
    layout: 'voices',
    title: 'Voices',
    render: () => `
      <div class="page-content">
        <p class="eyebrow">from the rank and file</p>
        <h2>Voices.</h2>

        <div class="voice with-photo">
          ${photo('13_pea_picker_lange_1939.jpg',
                  'A pea picker',
                  `<em>Pea picker.</em> ${LANGE_1939}`)}
          <div class="voice-text">
            <p class="quote">"Our children will praise us — even the Ranchers."</p>
            <p class="attribution">— Pete Velasco, p. 9</p>
          </div>
        </div>

        <div class="voice with-photo flipped">
          ${photo('07_drought_refugee_car_lange_1937.jpg',
                  'Drought refugee at the edge of a field',
                  `<em>Drought refugee on edge of carrot field.</em> ${LANGE_1937}`)}
          <div class="voice-text">
            <p class="quote">"I wanted to see and explore... see what's life [there]."</p>
            <p class="attribution">— Amalia Uribe Deaztlan, age 19, p. 10</p>
          </div>
        </div>

        <div class="voice with-photo">
          ${photo('10_fsa_camp_indio_lange_1939.jpg',
                  'Entering the FSA migratory laborer camp at Indio',
                  `<em>FSA camp at Indio.</em> ${LANGE_1939}`)}
          <div class="voice-text">
            <p class="quote">"These are forms of violence."</p>
            <p class="attribution">— Philip Vera Cruz, p. 12</p>
          </div>
        </div>
      </div>
    `
  },

  // -------- — PAZ · PEACE · KATAHIMIKAN (trilingual pamphlet) --------
  {
    id: 'paz',
    layout: 'pure',
    title: 'Paz · Peace · Katahimikan',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">spanish · english · tagalog · ufw 1966</p>
        ${photo('20_paz_peace_katahimikan_ufw.jpg',
                'Paz / Peace / Katahimikan — a UFW pamphlet in Spanish, English, and Tagalog',
                `<em>Paz · Peace · Katahimikan.</em> UFW · 1966 · Internet Archive · <span class="pd">public domain</span>`,
                { className: 'document fullbleed' })}
      </div>
    `
  },

  // -------- filler — pushes Here Is Where We Meet title to the left of next spread --------
  {
    id: 'digger',
    layout: 'pure',
    title: 'Carrot Digger',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">carrot digger · imperial valley · 1939</p>
        ${photo('16_carrot_digger_lange_1939.jpg',
                'A carrot digger, Imperial Valley, 1939',
                `<em>Carrot digger. Imperial Valley.</em> ${LANGE_1939}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- — HERE IS WHERE WE MEET (title page) --------
  {
    id: 'meet-title',
    layout: 'title',
    title: 'Here Is Where We Meet',
    render: () => `
      <div class="page-content">
        <p class="chapter-num">chapter ten</p>
        <h1>Here Is Where<br/>We Meet</h1>
        <p class="chapter-sub">conclusion · the strikers of coachella</p>
      </div>
    `
  },

  // -------- — Closing photo --------
  {
    id: 'meet-photo',
    layout: 'pure',
    title: 'Carrot Pullers (Closing)',
    render: () => `
      <div class="page-content pure">
        <p class="corner-label">carrot pullers · coachella valley · 1937</p>
        ${photo('06_carrot_pullers_b_lange_1937.jpg',
                'Carrot pullers in the Coachella Valley, 1937',
                `<em>Carrot pullers.</em> ${LANGE_1937}`,
                { className: 'fullbleed' })}
      </div>
    `
  },

  // -------- — Closing quote --------
  {
    id: 'meet-quote',
    layout: 'quote',
    title: 'Have not yet lost',
    render: () => `
      <div class="page-content">
        <p class="big-quote red">"Know we have not yet lost."</p>
        <div class="quote-rule"></div>
        <p class="quote-attribution">— paiz, ch. 10, p. 276</p>
      </div>
    `
  },

  // -------- 9 — COLOPHON --------
  {
    id: 'colophon',
    layout: 'colophon',
    title: 'Colophon',
    render: () => `
      <div class="page-content">
        <p class="eyebrow">credits</p>
        <h2>Colophon.</h2>

        <div class="contact-sheet">
          <img src="images/01_date_palms_lange_1937.jpg" alt=""/>
          <img src="images/02_date_palms_b_lange_1937.jpg" alt=""/>
          <img src="images/03_date_pickers_home_lange_1935.jpg" alt=""/>
          <img src="images/04_mexican_child_carrots_lange_1937.jpg" alt=""/>
          <img src="images/05_carrot_pullers_lange_1937.jpg" alt=""/>
          <img src="images/06_carrot_pullers_b_lange_1937.jpg" alt=""/>
          <img src="images/07_drought_refugee_car_lange_1937.jpg" alt=""/>
          <img src="images/08_carrot_puller_lange_1937.jpg" alt=""/>
          <img src="images/09_ex_tenant_farmer_lange_1937.jpg" alt=""/>
          <img src="images/10_fsa_camp_indio_lange_1939.jpg" alt=""/>
          <img src="images/11_salton_sea_highsmith_2012.jpg" alt=""/>
          <img src="images/12_filipino_lettuce_laborer_lange_1939.jpg" alt=""/>
          <img src="images/13_pea_picker_lange_1939.jpg" alt=""/>
          <img src="images/14_cabbage_harvesting_lange_1937.jpg" alt=""/>
          <img src="images/15_truck_drivers_family_lange_1935.jpg" alt=""/>
          <img src="images/16_carrot_digger_lange_1939.jpg" alt=""/>
          <img src="images/17_date_pickers_home_b_lange_1935.jpg" alt=""/>
          <img src="images/18_housing_brawley_lange_1935.jpg" alt=""/>
          <img src="images/19_pilgrimage_route_ufw_1966.jpg" alt=""/>
          <img src="images/20_paz_peace_katahimikan_ufw.jpg" alt=""/>
          <img src="images/21_unidos_venceremos_ufw_1965.jpg" alt=""/>
          <img src="images/22_attention_consumers_ufw_1967.jpg" alt=""/>
          <img src="images/23_esperanza_campesino_ufw_1966.jpg" alt=""/>
          <img src="images/24_police_brutality_ufwoc_1966.jpg" alt=""/>
          <img src="images/25_farm_worker_newsletter_6_ufw_1966.jpg" alt=""/>
          <img src="images/26_ufw_newsletter_9_1967.jpg" alt=""/>
          <img src="images/27_ufw_button_acm_smithsonian.jpg" alt=""/>
          <img src="images/28_ufw_dance_benefit_poster_1973.jpg" alt=""/>
          <img src="images/29_dolores_huerta_eric_guo_ccby.jpg" alt=""/>
        </div>

        <p class="meta-line"><strong>Quotations:</strong> Paiz, Christian O. <em>The Strikers of Coachella: A Rank-and-File History of the UFW Movement.</em> UNC Press, 2023.</p>
        <p class="meta-line"><strong>Photographs (18):</strong> Dorothea Lange (17) &amp; Carol M. Highsmith (1) — Library of Congress · public domain.</p>
        <p class="meta-line"><strong>Movement papers (9):</strong> UFW / UFWOC, 1965–1973 — Internet Archive (csfst &amp; calacsp collections) · public domain.</p>
        <p class="meta-line"><strong>Smithsonian (1):</strong> UFW pinback button · Anacostia Community Museum · CC0.</p>
        <p class="meta-line"><strong>Wikimedia Commons (1):</strong> Dolores Huerta · Eric Guo · CC BY 2.0.</p>
        <p class="meta-line"><strong>Not used:</strong> the 1969 <em>El Malcriado</em> photos (Reuther Library). Any AI-generated imagery.</p>
        <p class="meta-line"><strong>Music:</strong> "No Te Necesito Más," Los Jaibos · 78 RPM record from the Internet Archive Great 78 Project, streamed from archive.org.</p>
      </div>
    `
  }
];

// ----- STATE MACHINE -----------------------------------------

const app = document.getElementById('app');
const closedBook = document.getElementById('closedBook');
const spreadBook = document.getElementById('spreadBook');
const zoomedPage = document.getElementById('zoomedPage');

const spreadIndicator = document.getElementById('spreadIndicator');
const zoomIndicator = document.getElementById('zoomIndicator');

const spreadPrev = document.getElementById('spreadPrev');
const spreadNext = document.getElementById('spreadNext');
const closeBookBtn = document.getElementById('closeBook');

const zoomBack = document.getElementById('zoomBack');
const zoomPrev = document.getElementById('zoomPrev');
const zoomNext = document.getElementById('zoomNext');

// The PAGES array is hand-ordered so that every quote and title page
// lands on an even index (left side of a spread). This function used to
// auto-insert blank spacer pages, but the user explicitly does not want
// any blank pages, so we just pass-through. If a future edit breaks the
// alignment, fix it by inserting a real photo page in the right slot,
// not a blank.
function prepareSpreadOrder(pages) {
  return pages;
}

const ORDERED_PAGES = prepareSpreadOrder(PAGES);
let currentSpread = 0;
let currentPage = 0;
const NUM_SPREADS = Math.ceil(ORDERED_PAGES.length / 2);

// ----- RENDERERS ---------------------------------------------

function buildSpreads() {
  spreadBook.innerHTML = '';
  for (let i = 0; i < NUM_SPREADS; i++) {
    const spread = document.createElement('div');
    spread.className = 'spread' + (i === 0 ? ' active' : '');
    spread.dataset.spread = String(i);

    const leftIdx = i * 2;
    const rightIdx = i * 2 + 1;

    spread.appendChild(buildPageEl(leftIdx, 'left'));
    if (rightIdx < ORDERED_PAGES.length) {
      spread.appendChild(buildPageEl(rightIdx, 'right'));
    } else {
      // empty back-of-book page if odd count
      const blank = document.createElement('div');
      blank.className = 'page right layout-blank';
      blank.innerHTML = `<div class="page-inner"></div>`;
      spread.appendChild(blank);
    }
    spreadBook.appendChild(spread);
  }
}

function buildPageEl(idx, side) {
  const page = ORDERED_PAGES[idx];
  const el = document.createElement('div');
  el.className = `page ${side} layout-${page.layout}`;
  el.dataset.pageIndex = String(idx);
  el.innerHTML = `
    <div class="page-inner">
      ${page.render()}
    </div>
    ${page.layout === 'blank' ? '' : `<span class="page-num">— ${idx + 1} —</span>`}
  `;
  // Blank pages aren't clickable
  if (page.layout !== 'blank') {
    el.addEventListener('click', () => zoomToPage(idx));
  }
  return el;
}

function showSpread(i) {
  currentSpread = Math.max(0, Math.min(NUM_SPREADS - 1, i));
  document.querySelectorAll('.spread').forEach((s, idx) => {
    s.classList.toggle('active', idx === currentSpread);
  });
  // Show page-number range, not spread number, so the user knows
  // how many pages there really are.
  const leftPage = currentSpread * 2 + 1;
  const rightPage = Math.min(currentSpread * 2 + 2, ORDERED_PAGES.length);
  spreadIndicator.textContent = `pp. ${leftPage}–${rightPage} / ${ORDERED_PAGES.length}`;
  spreadPrev.disabled = currentSpread === 0;
  spreadNext.disabled = currentSpread === NUM_SPREADS - 1;
}

function zoomToPage(idx) {
  currentPage = idx;
  const page = ORDERED_PAGES[idx];
  if (page.layout === 'blank') return;  // can't zoom into blank pages
  zoomedPage.className = `zoomed-page layout-${page.layout}`;
  zoomedPage.innerHTML = page.render();
  zoomedPage.scrollTop = 0;
  zoomIndicator.textContent = `${idx + 1} / ${ORDERED_PAGES.length}`;
  zoomPrev.disabled = idx === 0;
  zoomNext.disabled = idx === ORDERED_PAGES.length - 1;

  app.dataset.state = 'zooming';
  // small delay to allow the stage to fade in before scaling up
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      app.dataset.state = 'zoomed';
    });
  });
}

function backToSpread() {
  // jump the active spread to the one containing currentPage
  const targetSpread = Math.floor(currentPage / 2);
  showSpread(targetSpread);
  app.dataset.state = 'spread';
}

function openBook() {
  app.dataset.state = 'opening';
  // after the cover-rotation finishes, switch to spread view
  setTimeout(() => {
    app.dataset.state = 'spread';
  }, 900);
}

function closeBook() {
  app.dataset.state = 'closed';
  // reset spread back to first
  showSpread(0);
}

// ----- WIRE UP -----------------------------------------------

closedBook.addEventListener('click', openBook);
closedBook.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBook(); }
});

spreadPrev.addEventListener('click', () => showSpread(currentSpread - 1));
spreadNext.addEventListener('click', () => showSpread(currentSpread + 1));
closeBookBtn.addEventListener('click', closeBook);

zoomBack.addEventListener('click', backToSpread);
zoomPrev.addEventListener('click', () => {
  const prev = nextNonBlank(currentPage, -1);
  if (prev !== currentPage) zoomToPage(prev);
});
zoomNext.addEventListener('click', () => {
  const next = nextNonBlank(currentPage, 1);
  if (next !== currentPage) zoomToPage(next);
});

// Find next/prev non-blank page
function nextNonBlank(idx, dir) {
  let i = idx + dir;
  while (i >= 0 && i < ORDERED_PAGES.length && ORDERED_PAGES[i].layout === 'blank') {
    i += dir;
  }
  return (i >= 0 && i < ORDERED_PAGES.length) ? i : idx;
}

document.addEventListener('keydown', (e) => {
  const state = app.dataset.state;
  if (state === 'spread') {
    if (e.key === 'ArrowRight') showSpread(currentSpread + 1);
    if (e.key === 'ArrowLeft')  showSpread(currentSpread - 1);
    if (e.key === 'Escape')     closeBook();
  } else if (state === 'zoomed') {
    if (e.key === 'ArrowRight') {
      const next = nextNonBlank(currentPage, 1);
      if (next !== currentPage) zoomToPage(next);
    }
    if (e.key === 'ArrowLeft') {
      const prev = nextNonBlank(currentPage, -1);
      if (prev !== currentPage) zoomToPage(prev);
    }
    if (e.key === 'Escape') backToSpread();
  } else if (state === 'closed') {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBook(); }
  }
});

// ----- AUDIO PLAYER ------------------------------------------
//
// Browsers block autoplay-with-sound until the user interacts with the
// page. So we kick off playback the first time the user touches anything
// (clicking the book, pressing a key, anything). After that, the player
// can be paused/resumed via the floating button in the bottom right.

const audioEl = document.getElementById('bgAudio');
const playerEl = document.getElementById('audioPlayer');
const playerBtn = document.getElementById('playerToggle');

let audioStarted = false;

function startAudio() {
  if (audioStarted) return;
  audioStarted = true;
  audioEl.volume = 0.45;
  const p = audioEl.play();
  if (p && p.catch) {
    p.then(() => playerEl.classList.add('playing'))
     .catch(() => { audioStarted = false; });
  } else {
    playerEl.classList.add('playing');
  }
}

function toggleAudio() {
  if (audioEl.paused) {
    audioEl.play();
    playerEl.classList.add('playing');
    audioStarted = true;
  } else {
    audioEl.pause();
    playerEl.classList.remove('playing');
  }
}

playerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAudio();
});

// First user interaction anywhere on the page kicks off audio.
['click', 'keydown', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, startAudio, { once: false });
});

audioEl.addEventListener('play',  () => playerEl.classList.add('playing'));
audioEl.addEventListener('pause', () => playerEl.classList.remove('playing'));
audioEl.addEventListener('ended', () => {
  // loop the 78
  audioEl.currentTime = 0;
  audioEl.play().catch(() => {});
});

// ----- INIT --------------------------------------------------

buildSpreads();
showSpread(0);
