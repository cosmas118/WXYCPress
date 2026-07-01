// ═════════ CONFIG ═════════
const SUPABASE_URL = 'https://onskirzxrhwsmqihfvdl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YGFxfgWCnTmOSvTPDH7VIw_AzlcIgz8';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═════════ STATE ═════════
let allConcerts = [];
let activeGenreFilter = null;
let activeVenueFilter = null;
let sortAscending = true;

// ═════════ LOAD CONCERTS ═════════
async function loadConcerts() {
  document.getElementById('loading').style.display = 'block';

  const { data, error } = await sb
    .from('concerts')
    .select('*');

  document.getElementById('loading').style.display = 'none';

  if (error) {
    console.error(error);
    return;
  }

  allConcerts = data || [];

  buildGenreFilters();
  buildVenueFilters();
  renderConcerts();
}

// ═════════ BUILD FILTERS ═════════
function buildGenreFilters() {
  const set = new Set();

  allConcerts.forEach(c => {
    if (Array.isArray(c.genres)) {
      c.genres.forEach(g => set.add(g));
    }
  });

  const dropdown = document.getElementById('genre-dropdown');
  dropdown.innerHTML = '<option value="">All Genres</option>';

  [...set].sort().forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    dropdown.appendChild(opt);
  });
}

function buildVenueFilters() {
  const set = new Set();

  allConcerts.forEach(c => {
    if (c.venue) set.add(c.venue);
  });

  const dropdown = document.getElementById('venue-dropdown');
  dropdown.innerHTML = '<option value="">All Venues</option>';

  [...set].sort().forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    dropdown.appendChild(opt);
  });
}

// ═════════ FILTER HANDLERS ═════════
function handleGenreDropdown(el) {
  activeGenreFilter = el.value || null;
  renderConcerts();
}

function handleVenueDropdown(el) {
  activeVenueFilter = el.value || null;
  renderConcerts();
}

function toggleSortDate() {
  sortAscending = !sortAscending;

  document.getElementById('sort-date-btn').textContent =
    sortAscending ? 'Date ↑' : 'Date ↓';

  renderConcerts();
}

// ═════════ RENDER ═════════
function renderConcerts() {
  let concerts = [...allConcerts];

  // Genre filter
  if (activeGenreFilter) {
    concerts = concerts.filter(c =>
      Array.isArray(c.genres) &&
      c.genres.includes(activeGenreFilter)
    );
  }

  // Venue filter
  if (activeVenueFilter) {
    concerts = concerts.filter(c =>
      c.venue === activeVenueFilter
    );
  }

  // Date sort
  concerts.sort((a, b) => {
    const d1 = new Date(a.date);
    const d2 = new Date(b.date);
    return sortAscending ? d1 - d2 : d2 - d1;
  });

  const grid = document.getElementById('concert-grid');
  grid.innerHTML = '';

  if (concerts.length === 0) {
    document.getElementById('empty-state').style.display = 'block';
    return;
  }

  document.getElementById('empty-state').style.display = 'none';

  concerts.forEach(c => {
    const card = document.createElement('div');
    card.className = 'concert-card';

    const genres = (c.genres || []).map(g =>
      `<span class="genre-tag">${g}</span>`
    ).join('');

    card.innerHTML = `
      <div class="card-date">${c.date || ''}</div>
      <div class="card-artist">${c.artist || ''}</div>
      <div class="card-venue">${c.venue || ''}</div>

      <div class="card-genres">${genres}</div>

      <div class="card-desc short" id="desc-${c.id}">
        ${c.descp || ''}
      </div>

      <button class="read-more-btn" onclick="toggleReadMore('${c.id}', this)">
        Read More
      </button>

      <div class="card-footer">
        ${c.link ? `<a href="${c.link}" target="_blank" class="ticket-link">Tickets →</a>` : ''}
      </div>
    `;

    grid.appendChild(card);
  });
}

// ═════════ READ MORE ═════════
function toggleReadMore(id, btn) {
  const desc = document.getElementById(`desc-${id}`);
  desc.classList.toggle('expanded');

  if (desc.classList.contains('expanded')) {
    btn.textContent = 'Show Less';
  } else {
    btn.textContent = 'Read More';
  }
}

// ═════════ INIT ═════════
loadConcerts();
