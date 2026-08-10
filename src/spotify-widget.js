const CLIENT_ID = '08093b77353643a09270e3ea6f86782d';
const REDIRECT_URI = 'chintumusic://callback';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';
const VERIFIER_KEY = 'spotify_code_verifier';
const STATE_KEY = 'spotify_oauth_state';
const TOKEN_KEY = 'spotify_access_token';
const EXPIRY_KEY = 'spotify_token_expires_at';

function base64Url(bytes) {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

async function startSpotifyLogin() {
  const verifier = randomString(64);
  const state = randomString(24);
  const challenge = base64Url(await sha256(verifier));
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state
  });
  window.location.href = `${AUTH_ENDPOINT}?${params}`;
}

async function exchangeCode(code, state) {
  if (state !== localStorage.getItem(STATE_KEY)) throw new Error('Spotify OAuth state mismatch');
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error('Spotify PKCE verifier missing');
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Spotify token exchange failed');
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + (data.expires_in * 1000)));
  localStorage.removeItem(VERIFIER_KEY);
  localStorage.removeItem(STATE_KEY);
  return data.access_token;
}

async function handleSpotifyCallback(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'chintumusic:') return false;
  const code = parsed.searchParams.get('code');
  const state = parsed.searchParams.get('state');
  const error = parsed.searchParams.get('error');
  if (error) throw new Error(`Spotify authorization: ${error}`);
  if (code) await exchangeCode(code, state);
  return true;
}

function token() {
  const value = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0);
  return value && Date.now() < expiry ? value : null;
}

async function spotifyFetch(path, options = {}) {
  const accessToken = token();
  if (!accessToken) throw new Error('Login to Spotify first');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {'Authorization': `Bearer ${accessToken}`, ...(options.headers || {})}
  });
  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    throw new Error('Spotify session expired. Please login again.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `Spotify API error ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

async function searchSpotify(query) {
  return spotifyFetch(`/search?${new URLSearchParams({q: query, type: 'track,artist,album', limit: '10'})}`);
}

function isLoggedIn() { return Boolean(token()); }
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

function mount() {
  const style = document.createElement('style');
  style.textContent = `
    .spotify-entry{margin:14px 0;padding:12px 14px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer;width:100%;font-weight:700}
    .spotify-entry:hover{background:rgba(255,255,255,.08)}
    .sp-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.72);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:20px}
    .sp-box{width:min(760px,100%);max-height:85vh;overflow:auto;background:#121214;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:22px;color:#fff;box-shadow:0 25px 80px rgba(0,0,0,.55)}
    .sp-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.sp-top h2{margin:0}.sp-close{border:0;background:transparent;color:#aaa;font-size:26px;cursor:pointer}
    .sp-login{padding:12px 18px;border:0;border-radius:999px;background:#1db954;color:#07140b;font-weight:800;cursor:pointer}
    .sp-search{display:flex;gap:8px;margin:18px 0}.sp-search input{flex:1;background:#202024;border:1px solid #333;color:#fff;border-radius:12px;padding:12px}.sp-search button{border:0;border-radius:12px;padding:0 16px;cursor:pointer}
    .sp-row{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px}.sp-row:hover{background:#202024}.sp-art{width:52px;height:52px;border-radius:8px;object-fit:cover;background:#28282d}.sp-meta{flex:1;min-width:0}.sp-meta b,.sp-meta span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-meta span{color:#999;font-size:13px;margin-top:4px}.sp-open{border:1px solid #444;background:transparent;color:#fff;border-radius:10px;padding:8px 10px;text-decoration:none;font-size:12px}
    .sp-error{color:#ff8e8e;font-size:13px;margin:8px 0}.sp-note{color:#999;font-size:12px;line-height:1.5}
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.className = 'spotify-entry';
  button.textContent = '♫  Spotify';
  const side = document.querySelector('aside .section');
  if (side) side.prepend(button); else document.body.appendChild(button);

  const modal = document.createElement('div');
  modal.className = 'sp-modal';
  modal.hidden = true;
  modal.innerHTML = `<div class="sp-box"><div class="sp-top"><h2>Spotify</h2><button class="sp-close">×</button></div><p class="sp-note">Search the Spotify catalog from ChintuMusic. Playback stays with Spotify; this app does not download Spotify audio.</p><div class="sp-auth"></div><div class="sp-search"><input placeholder="Search songs, artists, albums..."/><button>Search</button></div><div class="sp-error"></div><div class="sp-results"></div></div>`;
  document.body.appendChild(modal);

  const auth = modal.querySelector('.sp-auth');
  const input = modal.querySelector('.sp-search input');
  const searchButton = modal.querySelector('.sp-search button');
  const results = modal.querySelector('.sp-results');
  const error = modal.querySelector('.sp-error');

  function renderAuth() {
    auth.innerHTML = isLoggedIn() ? '<button class="sp-login" data-action="logout">Disconnect Spotify</button>' : '<button class="sp-login" data-action="login">Connect Spotify</button>';
  }
  function open() { modal.hidden = false; renderAuth(); input.focus(); }
  function close() { modal.hidden = true; }
  button.addEventListener('click', open);
  modal.querySelector('.sp-close').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  auth.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'login') startSpotifyLogin().catch(err => { error.textContent = err.message; });
    if (action === 'logout') { logout(); renderAuth(); results.innerHTML = ''; }
  });

  async function runSearch() {
    error.textContent = '';
    results.innerHTML = '<p class="sp-note">Searching Spotify…</p>';
    try {
      if (!isLoggedIn()) throw new Error('Connect Spotify first.');
      const data = await searchSpotify(input.value.trim());
      const tracks = data.tracks?.items || [];
      const artists = data.artists?.items || [];
      const albums = data.albums?.items || [];
      results.innerHTML = '';
      tracks.forEach(t => {
        const row = document.createElement('div'); row.className = 'sp-row';
        const img = t.album?.images?.[2]?.url || t.album?.images?.[0]?.url || '';
        row.innerHTML = `<img class="sp-art" src="${img}" alt=""><div class="sp-meta"><b></b><span></span></div><a class="sp-open" target="_blank" rel="noreferrer">Open in Spotify</a>`;
        row.querySelector('b').textContent = t.name;
        row.querySelector('span').textContent = `${(t.artists||[]).map(a=>a.name).join(', ')} • ${t.album?.name || ''}`;
        row.querySelector('a').href = t.external_urls?.spotify || '#';
        results.appendChild(row);
      });
      artists.slice(0, 5).forEach(a => {
        const row = document.createElement('div'); row.className = 'sp-row';
        const img = a.images?.[2]?.url || a.images?.[0]?.url || '';
        row.innerHTML = `<img class="sp-art" src="${img}" alt=""><div class="sp-meta"><b></b><span>Artist</span></div><a class="sp-open" target="_blank" rel="noreferrer">Open</a>`;
        row.querySelector('b').textContent = a.name;
        row.querySelector('a').href = a.external_urls?.spotify || '#';
        results.appendChild(row);
      });
      albums.slice(0, 5).forEach(a => {
        const row = document.createElement('div'); row.className = 'sp-row';
        const img = a.images?.[2]?.url || a.images?.[0]?.url || '';
        row.innerHTML = `<img class="sp-art" src="${img}" alt=""><div class="sp-meta"><b></b><span>Album • ${(a.artists||[]).map(x=>x.name).join(', ')}</span></div><a class="sp-open" target="_blank" rel="noreferrer">Open</a>`;
        row.querySelector('b').textContent = a.name;
        row.querySelector('a').href = a.external_urls?.spotify || '#';
        results.appendChild(row);
      });
      if (!results.children.length) results.innerHTML = '<p class="sp-note">No Spotify results found.</p>';
    } catch (err) { results.innerHTML = ''; error.textContent = err.message; renderAuth(); }
  }
  searchButton.addEventListener('click', runSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });

  window.__chintuSpotify = { startSpotifyLogin, handleSpotifyCallback, searchSpotify, logout };
}

(async () => {
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appUrlOpen', async ({url}) => {
      try { await handleSpotifyCallback(url); window.dispatchEvent(new Event('spotify-auth-complete')); } catch (err) { console.error(err); }
    });
  } catch (err) {
    console.warn('Capacitor App plugin unavailable; Android callback listener skipped.');
  }
  mount();
})();
