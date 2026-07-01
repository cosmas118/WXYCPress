// ═════════ CONFIG ═════════
const SUPABASE_URL = 'https://onskirzxrhwsmqihfvdl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YGFxfgWCnTmOSvTPDH7VIw_AzlcIgz8';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═════════ STATE ═════════
let currentUser = null;
let allConcerts = [];
let userInterests = new Set();

let activeGenreFilter = null;
let activeVenueFilter = null;
let showOnlyInterested = false;
let sortAscending = true;

// ═════════ UTIL ═════════
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  setTimeout(() => t.className = '', 3000);
}

// Simple hash
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ═════════ LOGIN ═════════
function openLoginModal() {
  const username = prompt("Username:");
  const password = prompt("Password:");
  if (!username || !password) return;
  doLogin(username, password);
}

async function doLogin(username, password) {
  const hash = await hashPassword(password);

  const { data } = await sb
    .from('users')
    .select('*')
    .eq('name', username)
    .single();

  if (!data || data.password_hash !== hash) {
    showToast('Login failed', true);
    return;
  }

  currentUser = data;

  document.getElementById('login-btn').style.display = 'none';
  document.getElementById('logout-btn').style.display = '';
  document.getElementById('show-interested-btn').style.display = '';

  loadUserInterests();

  showToast('Welcome ' + username);
  renderConcerts();
}

function logout() {
  currentUser = null;
  userInterests = new Set();
  showOnlyInterested = false;

  document.getElementById('login-btn').style.display = '';
  document.getElementById('logout-btn').style.display = 'none';
  document.getElementById('show-interested-btn').style.display = 'none';

  renderConcerts();
}

// ═════════ INTERESTS ═════════
async function loadUserInterests() {
  if (!currentUser) return;

  const { data } = await sb
    .from('interests')
    .select('concert_id')
    .eq('user_name', currentUser.name);

  userInterests = new Set((data || []).map(r => r.concert_id));
}

async function toggleInterest(concertId) {
  if (!currentUser) {
    openLoginModal();
    return;
  }

  if (userInterests.has(concertId)) {
    await sb.from('interests').delete()
      .eq('user_name', currentUser.name)
      .eq('concert_id', concertId);

    userInterests.delete(concertId);
  } else {
    await sb.from('interests').insert({
      user_name: currentUser.name,
      concert_id: concertId
    });

    userInterests.add(concertId);
  }

  renderConcerts();
}

// ═════════ FILTERS ═════════
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

function toggleInterestedFilter() {
  if (!currentUser) {
    openLoginModal();
    return;
  }

  showOnlyInterested = !showOnlyInterested;
  document.getElementById('show-interested-btn')
    .classList.toggle('active', showOnlyInterested);

  renderConcerts();
}

// ═════════ BUILD FILTER OPTIONS ═════════
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

// ═════════ LOAD CONCERTS ═════════
async function loadConcerts() {
  document.getElementById('loading').style.display = 'block';

  const { data } = await sb.from('concerts').select('*');

  document.getElementById('loading').style.display = 'none';

  allConcerts = data || [];

  buildGenreFilters();
  buildVenueFilters();
  renderConcerts();
}

// ═════════ READ MORE ═════════
function toggleReadMore(id, btn) {
  const el = document.getElementById(`desc-${id}`);
  el.classList.toggle('expanded');
  btn.textContent = el.classList.contains('expanded')
    ? 'Show Less'
    : 'Read More';
}

// ═════════ RENDER ═════════
function renderConcerts() {
  let concerts = [...allConcerts];

  if (activeGenreFilter) {
    concerts = concerts.filter(c =>
      Array.isArray(c.genres) &&
      c.genres.includes(activeGenreFilter)
    );
  }

  if (activeVenueFilter) {
    concerts = concerts.filter(c => c.venue === activeVenueFilter);
  }

  if (showOnlyInterested) {
    concerts = concerts.filter(c => userInterests.has(c.id));
  }

  concerts.sort((a, b) => {
    const d1 = new Date(a.date);
    const d2 = new Date(b.date);
    return sortAscending ? d1 - d2 : d2 - d1;
  });

  const grid = document.getElementById('concert-grid');
  const empty = document.getElementById('empty-state');

  grid.innerHTML = '';

  if (concerts.length === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  concerts.forEach(c => {
    const isInterested = userInterests.has(c.id);

    const genres = (c.genres || [])
      .map(g => `<span class="genre-tag">${g}</span>`)
      .join('');

    const card = document.createElement('div');
    card.className = 'concert-card' + (isInterested ? ' interested' : '');

    card.innerHTML = `
      <div class="card-date">${c.date || ''}</div>
      <div class="card-artist">${c.artist || ''}</div>
      <div class="card-venue">${c.venue || ''}</div>

      <div class="card-genres">${genres}</div>

      <div class="card-desc short" id="desc-${c.id}">
        ${c.descp || ''}
      </div>

      
      <div class="card-footer">
        <button class="interest-btn ${isInterested ? 'on' : ''}"
          onclick="toggleInterest('${c.id}')">
          ${isInterested ? '★ Interested' : '☆ Add'}
        </button>

        ${c.link ? `<a class="ticket-link" href="${c.link}" target="_blank">Tickets →</a>` : ''}
      </div>
    `;

    grid.appendChild(card);
  });
}

// ═════════ ADMIN (simple access via URL) ═════════
function checkAdminAccess() {
  if (window.location.hash === '#admin') {
    alert('Admin panel temporarily disabled in this version');
  }
}

// ═════════ INIT ═════════
checkAdminAccess();
loadConcerts();
