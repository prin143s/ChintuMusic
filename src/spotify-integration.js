const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || `${window.location.origin}/callback`;
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state'
].join(' ');
const TOKEN_KEY = 'chintu-spotify-token';
const VERIFIER_KEY = 'chintu-spotify-verifier';
const STATE_KEY = 'chintu-spotify-state';
let accessToken = localStorage.getItem(TOKEN_KEY) || '';
let player = null;
let deviceId = '';
let sdkReady = false;
let currentResults = [];

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function pkcePair() {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  const verifier = base64url(bytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(digest) };
}
function setStatus(text, good = false) {
  const el = document.querySelector('#spotify-status');
  if (el) { el.textContent = text; el.dataset.good = good ? '1' : '0'; }
}
function authUrl() {
  const url = new URL('https://accounts.spotify.com/authorize');
  return url;
}
async function login() {
  if (!CLIENT_ID) {
    setStatus('Add VITE_SPOTIFY_CLIENT_ID first.');
    return;
  }
  const { verifier, challenge } = await pkcePair();
  const state = crypto.randomUUID();
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);
  const url = authUrl();
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES
  });
  window.location.assign(url.toString());
}
async function exchangeCode(code, state) {
  const savedState = localStorage.getItem(STATE_KEY);
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier || !savedState || state !== savedState) throw new Error('Spotify authorization state mismatch.');
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID, code_verifier: verifier
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Spotify token exchange failed.');
  accessToken = data.access_token;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (data.refresh_token) localStorage.setItem('chintu-spotify-refresh', data.refresh_token);
  localStorage.removeItem(VERIFIER_KEY); localStorage.removeItem(STATE_KEY);
  history.replaceState({}, '', window.location.pathname + window.location.hash);
}
async function api(path, options = {}) {
  if (!accessToken) throw new Error('Connect Spotify first.');
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...options, headers: {'Authorization': `Bearer ${accessToken}`, ...(options.headers || {})}
  });
  if (res.status === 401) { accessToken = ''; localStorage.removeItem(TOKEN_KEY); throw new Error('Spotify session expired. Connect again.'); }
  if (!res.ok) { let msg = `Spotify API error ${res.status}`; try { const d = await res.json(); msg = d.error?.message || msg; } catch {} throw new Error(msg); }
  return res.status === 204 ? null : res.json();
}
async function searchTracks(q) {
  const data = await api(`/search?${new URLSearchParams({q, type:'track', limit:'10'})}`);
  return data.tracks.items || [];
}
async function loadSdk() {
  if (sdkReady || window.Spotify) { sdkReady = true; return; }
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
  sdkReady = true;
}
async function connectPlayer() {
  if (!accessToken) throw new Error('Connect Spotify first.');
  await loadSdk();
  if (player) return;
  player = new Spotify.Player({
    name: 'Chintu Music',
    volume: 0.8,
    getOAuthToken: cb => cb(accessToken),
    enableMediaSession: true
  });
  player.addListener('ready', ({device_id}) => {
    deviceId = device_id;
    setStatus('Spotify player ready', true);
  });
  player.addListener('not_ready', () => setStatus('Spotify player offline.'));
  player.addListener('initialization_error', ({message}) => setStatus(message));
  player.addListener('authentication_error', ({message}) => setStatus(message));
  player.addListener('account_error', ({message}) => setStatus('Spotify playback requires Premium.'));
  player.addListener('playback_error', ({message}) => setStatus(message));
  player.addListener('player_state_changed', state => {
    if (!state) return;
    const title = state.track_window.current_track?.name || '';
    const el = document.querySelector('#spotify-now');
    if (el) el.textContent = title ? `Playing: ${title}` : '';
  });
  await player.connect();
}
async function playTrack(track) {
  await connectPlayer();
  if (!deviceId) throw new Error('Spotify player is still connecting. Try again in a moment.');
  await api('/me/player', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({device_ids:[deviceId], play:false})});
  await api(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({uris:[track.uri]})
  });
}
function renderResults(items) {
  currentResults = items;
  const list = document.querySelector('#spotify-results');
  if (!list) return;
  list.innerHTML = items.map((t, i) => {
    const img = t.album?.images?.[1]?.url || t.album?.images?.[0]?.url || '';
    const artists = t.artists.map(a => a.name).join(', ');
    return `<button class="spotify-result" data-index="${i}"><img src="${img}" alt=""><span><b>${escapeHtml(t.name)}</b><small>${escapeHtml(artists)} · ${escapeHtml(t.album?.name || '')}</small></span><strong>▶</strong></button>`;
  }).join('');
  list.querySelectorAll('.spotify-result').forEach(btn => btn.addEventListener('click', async () => {
    try { setStatus('Starting Spotify playback…'); await playTrack(currentResults[Number(btn.dataset.index)]); setStatus('Playing on Chintu Music', true); }
    catch (e) { setStatus(e.message); }
  }));
}
function escapeHtml(s='') { return s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function injectStyles() {
  if (document.querySelector('#spotify-integration-style')) return;
  const style = document.createElement('style'); style.id = 'spotify-integration-style';
  style.textContent = `
  .spotify-launch{border:1px solid rgba(255,255,255,.12);background:#17151d;color:#fff;border-radius:999px;padding:10px 14px;font-weight:700;cursor:pointer;margin-right:10px}.spotify-launch:hover{background:#241c2c}
  .spotify-shade{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);z-index:9999;display:grid;place-items:center;padding:20px}.spotify-modal{width:min(720px,100%);max-height:88vh;overflow:auto;background:#111016;border:1px solid rgba(255,255,255,.12);border-radius:26px;padding:22px;box-shadow:0 30px 100px #000}.spotify-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.spotify-head h2{margin:0}.spotify-close{border:0;background:transparent;color:#aaa;font-size:28px;cursor:pointer}.spotify-connect{border:0;border-radius:999px;padding:11px 16px;background:#fff;color:#111;font-weight:800;cursor:pointer}.spotify-search{display:flex;gap:10px;margin:20px 0}.spotify-search input{flex:1;background:#19171f;border:1px solid #302c39;color:#fff;border-radius:14px;padding:14px 16px;font-size:16px;outline:0}.spotify-search button{border:0;border-radius:14px;padding:0 18px;background:#d9a8ff;color:#16111d;font-weight:800}.spotify-result{width:100%;display:flex;align-items:center;gap:12px;padding:10px;border:0;background:transparent;color:#fff;text-align:left;border-radius:14px;cursor:pointer}.spotify-result:hover{background:#1d1922}.spotify-result img{width:52px;height:52px;border-radius:8px;object-fit:cover;background:#292530}.spotify-result span{flex:1;min-width:0}.spotify-result b,.spotify-result small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.spotify-result small{color:#999;margin-top:4px}.spotify-result strong{font-size:16px}.spotify-status{min-height:22px;color:#aaa;margin:10px 0}.spotify-status[data-good="1"]{color:#b8ffcc}.spotify-note{color:#888;font-size:13px;line-height:1.5}
  `; document.head.appendChild(style);
}
function buildUi() {
  injectStyles();
  const header = document.querySelector('main header');
  if (!header || document.querySelector('.spotify-launch')) return;
  const btn = document.createElement('button'); btn.className='spotify-launch'; btn.textContent='Spotify'; btn.title='Spotify';
  header.appendChild(btn);
  btn.onclick = () => {
    const shade=document.createElement('div'); shade.className='spotify-shade'; shade.innerHTML=`<section class="spotify-modal"><div class="spotify-head"><h2>Spotify</h2><button class="spotify-close">×</button></div><p class="spotify-status" id="spotify-status"></p><div class="spotify-search"><input id="spotify-query" placeholder="Search songs, artists, albums…"><button id="spotify-go">Search</button></div><div id="spotify-results"></div><p id="spotify-now"></p><p class="spotify-note">Spotify playback uses Spotify's official Web Playback SDK. A Spotify Premium account is required for in-app playback. Spotify content cannot be downloaded through this integration.</p></section>`;
    document.body.appendChild(shade);
    shade.querySelector('.spotify-close').onclick=()=>shade.remove();
    shade.addEventListener('click',e=>{if(e.target===shade)shade.remove();});
    const connect=document.createElement('button'); connect.className='spotify-connect'; connect.textContent=accessToken?'Connected':'Connect Spotify';
    shade.querySelector('.spotify-head').appendChild(connect);
    connect.onclick=async()=>{try{if(!accessToken) await login(); else {await connectPlayer();setStatus('Spotify player ready',true);}}catch(e){setStatus(e.message);}};
    shade.querySelector('#spotify-go').onclick=async()=>{const q=shade.querySelector('#spotify-query').value.trim();if(!q)return;try{setStatus('Searching…');renderResults(await searchTracks(q));setStatus(`${currentResults.length} results`,true);}catch(e){setStatus(e.message);}};
    shade.querySelector('#spotify-query').addEventListener('keydown',e=>{if(e.key==='Enter')shade.querySelector('#spotify-go').click();});
    if(!accessToken)setStatus('Connect your Spotify account to search and play.'); else setStatus('Connected. Search for a track.');
  };
}
async function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code'); const state = params.get('state');
  if (code) { try { await exchangeCode(code, state); } catch (e) { console.error(e); } }
  const start = setInterval(() => { if (document.querySelector('main header')) { clearInterval(start); buildUi(); } }, 250);
}
init();
