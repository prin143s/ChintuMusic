import { searchYouTube } from './youtube.js';

// YouTube is integrated into the existing search/player UI.
// No separate YouTube music section or modal is created.

function injectStyles() {
  if (document.querySelector('#youtube-integration-style')) return;
  const style = document.createElement('style');
  style.id = 'youtube-integration-style';
  style.textContent = `
    .yt-results{margin-top:18px;display:flex;flex-direction:column;gap:5px}
    .yt-heading{font-size:12px;letter-spacing:.12em;color:#888;padding:8px 4px}
    .yt-result{width:100%;display:flex;align-items:center;gap:12px;padding:10px;border:0;background:transparent;color:#fff;text-align:left;border-radius:14px;cursor:pointer}
    .yt-result:hover{background:#1d1922}
    .yt-result img{width:96px;height:54px;border-radius:8px;object-fit:cover;background:#292530;flex:none}
    .yt-result span{flex:1;min-width:0}.yt-result b,.yt-result small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .yt-result small{color:#999;margin-top:4px}.yt-result strong{font-size:16px}
    .yt-player-host{position:fixed;left:-10000px;width:1px;height:1px;opacity:0;pointer-events:none}
    .playerBar-youtube .now{min-width:0}.playerBar-youtube .yt-mini{position:relative;overflow:hidden}
    .playerBar-youtube .yt-mini iframe{position:absolute;inset:0;width:100%;height:100%;border:0;opacity:.01}
    .yt-active-label{font-size:10px;color:#aaa;display:block;margin-top:2px}
  `;
  document.head.appendChild(style);
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

let lastQuery = '';
let searchTimer;
let currentYoutube = null;
let playerHost = null;

function getSearchInput() {
  return document.querySelector('main header .search input');
}

function getTrackList() {
  return document.querySelector('main .trackList');
}

function ensureResultsContainer() {
  const list = getTrackList();
  if (!list) return null;
  let box = document.querySelector('#yt-results');
  if (!box) {
    box = document.createElement('div');
    box.id = 'yt-results';
    box.className = 'yt-results';
    list.parentElement?.appendChild(box);
  }
  return box;
}

async function searchAndRender(query) {
  const box = ensureResultsContainer();
  if (!box || !query.trim()) { if (box) box.innerHTML = ''; return; }
  box.innerHTML = '<div class="yt-heading">YOUTUBE</div><div class="muted">Searching YouTube…</div>';
  try {
    const items = await searchYouTube(query, 10);
    if (query !== lastQuery) return;
    if (!items.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="yt-heading">YOUTUBE</div>' + items.map((item, index) => `
      <button class="yt-result" data-index="${index}">
        <img src="${item.cover}" alt="">
        <span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.artist)}</small></span>
        <strong>▶</strong>
      </button>`).join('');
    box.querySelectorAll('.yt-result').forEach(button => {
      button.addEventListener('click', () => playYouTube(items[Number(button.dataset.index)]));
    });
  } catch (error) {
    console.error(error);
    if (query === lastQuery) box.innerHTML = `<div class="yt-heading">YOUTUBE</div><div class="muted">${escapeHtml(error.message || 'YouTube search failed.')}</div>`;
  }
}

function ensurePlayerHost() {
  if (playerHost && document.body.contains(playerHost)) return playerHost;
  playerHost = document.createElement('div');
  playerHost.className = 'yt-player-host';
  playerHost.id = 'yt-player-host';
  document.body.appendChild(playerHost);
  return playerHost;
}

function updatePlayerUi(item) {
  const bar = document.querySelector('.playerBar');
  const now = document.querySelector('.playerBar .now');
  if (!bar || !now) return;
  bar.classList.add('playerBar-youtube');
  now.innerHTML = `
    <div class="mini yt-mini" style="background-image:url('${item.cover}');background-size:cover;background-position:center"></div>
    <div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.artist)}</small><span class="yt-active-label">YouTube</span></div>`;
  now.classList.add('clickable');
  now.onclick = () => {
    const player = document.querySelector('#yt-player-host iframe');
    if (player) {
      player.scrollIntoView({behavior:'smooth',block:'center'});
    }
  };
}

function playYouTube(item) {
  currentYoutube = item;
  const host = ensurePlayerHost();
  host.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(item.videoId)}?autoplay=1&rel=0&playsinline=1" title="${escapeHtml(item.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  updatePlayerUi(item);
  window.dispatchEvent(new CustomEvent('chintu:youtube-play', {detail:item}));
}

function watchSearch() {
  const input = getSearchInput();
  if (!input || input.dataset.ytBound) return;
  input.dataset.ytBound = '1';
  input.addEventListener('input', () => {
    const query = input.value.trim();
    lastQuery = query;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (query) searchAndRender(query);
      else { const box = document.querySelector('#yt-results'); if (box) box.innerHTML = ''; }
    }, 450);
  });
}

function cleanupOldModal() {
  document.querySelectorAll('.youtube-shade,.youtube-launch').forEach(el => el.remove());
}

function init() {
  injectStyles();
  cleanupOldModal();
  watchSearch();
  // React can replace the search/player DOM during navigation, so keep the integration attached.
  setTimeout(init, 700);
}

init();
