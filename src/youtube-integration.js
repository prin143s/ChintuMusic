import { searchYouTube } from './youtube.js';

function injectStyles() {
  if (document.querySelector('#youtube-integration-style')) return;
  const style = document.createElement('style');
  style.id = 'youtube-integration-style';
  style.textContent = `
  .youtube-launch{border:1px solid rgba(255,255,255,.12);background:#17151d;color:#fff;border-radius:999px;padding:10px 14px;font-weight:700;cursor:pointer;margin-right:10px}.youtube-launch:hover{background:#241c2c}
  .youtube-shade{position:fixed;inset:0;background:rgba(0,0,0,.76);backdrop-filter:blur(14px);z-index:9999;display:grid;place-items:center;padding:20px}.youtube-modal{width:min(820px,100%);max-height:90vh;overflow:auto;background:#111016;border:1px solid rgba(255,255,255,.12);border-radius:26px;padding:22px;box-shadow:0 30px 100px #000}.youtube-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.youtube-head h2{margin:0}.youtube-close{border:0;background:transparent;color:#aaa;font-size:28px;cursor:pointer}.youtube-search{display:flex;gap:10px;margin:20px 0}.youtube-search input{flex:1;background:#19171f;border:1px solid #302c39;color:#fff;border-radius:14px;padding:14px 16px;font-size:16px;outline:0}.youtube-search button{border:0;border-radius:14px;padding:0 18px;background:#fff;color:#111;font-weight:800}.youtube-status{min-height:20px;color:#aaa;margin:8px 0}.youtube-results{display:flex;flex-direction:column;gap:5px}.youtube-result{width:100%;display:flex;align-items:center;gap:12px;padding:10px;border:0;background:transparent;color:#fff;text-align:left;border-radius:14px;cursor:pointer}.youtube-result:hover{background:#1d1922}.youtube-result img{width:96px;height:54px;border-radius:8px;object-fit:cover;background:#292530}.youtube-result span{flex:1;min-width:0}.youtube-result b,.youtube-result small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.youtube-result small{color:#999;margin-top:4px}.youtube-result strong{font-size:16px}.youtube-player{margin-top:18px;aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:#000}.youtube-player iframe{width:100%;height:100%;border:0}.youtube-note{color:#888;font-size:12px;line-height:1.5;margin-top:12px}
  `;
  document.head.appendChild(style);
}

function escapeHtml(value = '') {
  return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function openYouTube() {
  const shade = document.createElement('div');
  shade.className = 'youtube-shade';
  shade.innerHTML = `<section class="youtube-modal"><div class="youtube-head"><h2>YouTube</h2><button class="youtube-close">×</button></div><div class="youtube-search"><input id="youtube-query" placeholder="Search songs, artists, albums…"><button id="youtube-go">Search</button></div><p class="youtube-status" id="youtube-status"></p><div class="youtube-results" id="youtube-results"></div><div class="youtube-player" id="youtube-player" hidden></div><p class="youtube-note">Playback uses YouTube's official embeddable player. Videos that cannot be embedded are filtered out.</p></section>`;
  document.body.appendChild(shade);
  const close = () => shade.remove();
  shade.querySelector('.youtube-close').onclick = close;
  shade.addEventListener('click', e => { if (e.target === shade) close(); });

  const input = shade.querySelector('#youtube-query');
  const button = shade.querySelector('#youtube-go');
  const status = shade.querySelector('#youtube-status');
  const results = shade.querySelector('#youtube-results');
  const player = shade.querySelector('#youtube-player');

  async function runSearch() {
    const query = input.value.trim();
    if (!query) return;
    status.textContent = 'Searching YouTube…';
    results.innerHTML = '';
    try {
      const items = await searchYouTube(query, 20);
      if (!items.length) {
        status.textContent = 'No embeddable videos found. Check your API key or try another search.';
        return;
      }
      status.textContent = `${items.length} results`;
      results.innerHTML = items.map((item, index) => `<button class="youtube-result" data-index="${index}"><img src="${item.cover}" alt=""><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.artist)}</small></span><strong>▶</strong></button>`).join('');
      results.querySelectorAll('.youtube-result').forEach(btn => btn.onclick = () => {
        const item = items[Number(btn.dataset.index)];
        player.hidden = false;
        player.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(item.videoId)}?autoplay=1&rel=0" title="${escapeHtml(item.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
        status.textContent = `Playing: ${item.title}`;
      });
    } catch (error) {
      console.error(error);
      status.textContent = error.message || 'YouTube search failed.';
    }
  }

  button.onclick = runSearch;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  input.focus();
}

function buildUi() {
  injectStyles();
  const header = document.querySelector('main header');
  if (!header || document.querySelector('.youtube-launch')) return;
  const button = document.createElement('button');
  button.className = 'youtube-launch';
  button.textContent = 'YouTube';
  button.title = 'Search and play YouTube videos';
  button.onclick = openYouTube;
  header.appendChild(button);
}

const start = setInterval(() => {
  if (document.querySelector('main header')) {
    clearInterval(start);
    buildUi();
  }
}, 250);
