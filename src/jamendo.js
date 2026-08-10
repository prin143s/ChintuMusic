const JAMENDO_CLIENT_ID = 'a24fb8d5';
const JAMENDO_API = 'https://api.jamendo.com/v3.0';

function esc(s='') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c])); }

async function searchJamendo(query) {
  const p = new URLSearchParams({client_id:JAMENDO_CLIENT_ID, format:'json', namesearch:query, limit:'20', audioformat:'mp32', audiodlformat:'mp32'});
  const r = await fetch(`${JAMENDO_API}/tracks/?${p}`);
  const d = await r.json();
  if (!r.ok || d.headers?.status !== 'success') throw new Error(d.headers?.error_message || 'Jamendo search failed');
  return d.results || [];
}

function mountJamendo() {
  if (document.querySelector('#jamendo-entry')) return;
  const style=document.createElement('style');style.textContent=`
  #jamendo-entry{margin:8px 0;padding:12px 14px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.04);color:#fff;cursor:pointer;width:100%;font-weight:700}.jm-shade{position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.75);backdrop-filter:blur(14px);display:grid;place-items:center;padding:18px}.jm-box{width:min(760px,100%);max-height:88vh;overflow:auto;background:#111116;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:22px}.jm-top{display:flex;justify-content:space-between;align-items:center}.jm-close{border:0;background:none;color:#aaa;font-size:28px}.jm-search{display:flex;gap:8px;margin:18px 0}.jm-search input{flex:1;background:#1b1a20;color:#fff;border:1px solid #34313b;border-radius:12px;padding:13px}.jm-search button{border:0;border-radius:12px;padding:0 17px;font-weight:800}.jm-row{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px}.jm-row:hover{background:#1e1c23}.jm-art{width:54px;height:54px;object-fit:cover;border-radius:8px;background:#29252f}.jm-meta{flex:1;min-width:0}.jm-meta b,.jm-meta small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jm-meta small{color:#999;margin-top:4px}.jm-play,.jm-download{border:0;border-radius:10px;padding:8px 10px;cursor:pointer}.jm-play{background:#d9a8ff}.jm-download{background:#29252f;color:#fff}.jm-note{color:#999;font-size:12px;line-height:1.5}.jm-error{color:#ff9191;font-size:13px}`;document.head.appendChild(style);
  const b=document.createElement('button');b.id='jamendo-entry';b.textContent='♫  Jamendo';const side=document.querySelector('aside .section');if(side)side.prepend(b);else document.body.appendChild(b);
  b.onclick=()=>{const shade=document.createElement('div');shade.className='jm-shade';shade.innerHTML=`<section class="jm-box"><div class="jm-top"><h2>Jamendo Music</h2><button class="jm-close">×</button></div><p class="jm-note">Independent music available through Jamendo's official API.</p><div class="jm-search"><input placeholder="Search songs, artists, albums…"><button>Search</button></div><div class="jm-error"></div><div class="jm-results"></div></section>`;document.body.appendChild(shade);shade.querySelector('.jm-close').onclick=()=>shade.remove();shade.addEventListener('click',e=>{if(e.target===shade)shade.remove();});
    const input=shade.querySelector('input'),go=shade.querySelector('.jm-search button'),out=shade.querySelector('.jm-results'),err=shade.querySelector('.jm-error');
    async function run(){const q=input.value.trim();if(!q)return;err.textContent='';out.innerHTML='<p class="jm-note">Searching…</p>';try{const items=await searchJamendo(q);out.innerHTML='';items.forEach(t=>{const row=document.createElement('div');row.className='jm-row';row.innerHTML=`<img class="jm-art" src="${esc(t.image||t.album_image||'')}" alt=""><div class="jm-meta"><b>${esc(t.name)}</b><small>${esc(t.artist_name||'')} · ${esc(t.album_name||'')}</small></div><button class="jm-play">▶</button>${t.audiodownload_allowed&&t.audiodownload?'<a class="jm-download" target="_blank" rel="noreferrer" download>↓</a>':''}`;row.querySelector('.jm-play').onclick=()=>{window.dispatchEvent(new CustomEvent('chintu-online-play',{detail:{id:`jamendo-${t.id}`,title:t.name,artist:t.artist_name||'Jamendo',album:t.album_name||'Jamendo',color:'#d9a8ff',src:t.audio,online:true}}));shade.remove();};const dl=row.querySelector('.jm-download');if(dl)dl.href=t.audiodownload;out.appendChild(row);});if(!items.length)out.innerHTML='<p class="jm-note">No results found.</p>';}catch(e){out.innerHTML='';err.textContent=e.message;}}
    go.onclick=run;input.addEventListener('keydown',e=>{if(e.key==='Enter')run();});input.focus();};
}

mountJamendo();
