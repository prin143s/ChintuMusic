import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, Search, Library, Heart, Upload, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat2, Volume2, Plus, X, ListMusic, ChevronDown, MoreHorizontal } from 'lucide-react';
import './style.css';

const demo = [
  {id:'1',title:'Midnight Drive',artist:'Chintu Music',album:'After Hours',color:'#6d28d9'},
  {id:'2',title:'Neon Skies',artist:'Chintu Music',album:'Neon Skies',color:'#0891b2'},
  {id:'3',title:'Golden Hour',artist:'Chintu Music',album:'Golden Hour',color:'#d97706'},
  {id:'4',title:'Ocean Lights',artist:'Chintu Music',album:'Ocean Lights',color:'#2563eb'},
  {id:'5',title:'After Rain',artist:'Chintu Music',album:'After Rain',color:'#475569'}
];
const AUDIO_EXT=/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm|aiff|aif|alac)$/i;
const ACCEPT='audio/*,.mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.webm,.aiff,.aif,.alac';
const DB_NAME='chintu-music-db';
const DB_VERSION=1;
const STORE='tracks';
const fmt=s=>Number.isFinite(s)&&s>0?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'0:00';

function openMusicDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbGetAll(){
  const db=await openMusicDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});
}
async function dbPut(row){
  const db=await openMusicDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}

function App(){
 const [tab,setTab]=useState('Home'),[query,setQuery]=useState(''),[current,setCurrent]=useState(demo[0]);
 const [playing,setPlaying]=useState(false),[local,setLocal]=useState([]),[fullPlayer,setFullPlayer]=useState(false),[libraryReady,setLibraryReady]=useState(false);
 const [duration,setDuration]=useState(0),[time,setTime]=useState(0),[volume,setVolume]=useState(1),[shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState(false);
 const [liked,setLiked]=useState(()=>new Set(JSON.parse(localStorage.getItem('chintu-liked')||'[]')));
 const [playlists,setPlaylists]=useState(()=>JSON.parse(localStorage.getItem('chintu-playlists')||'[]'));
 const [showCreate,setShowCreate]=useState(false),[newPlaylist,setNewPlaylist]=useState('');
 const audio=useRef(null),fileInput=useRef(null),pendingPlay=useRef(false),urls=useRef(new Set());
 const tracks=useMemo(()=>[...local,...demo],[local]);
 const filtered=tracks.filter(t=>`${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(query.toLowerCase()));

 useEffect(()=>{localStorage.setItem('chintu-liked',JSON.stringify([...liked]));},[liked]);
 useEffect(()=>{localStorage.setItem('chintu-playlists',JSON.stringify(playlists));},[playlists]);
 useEffect(()=>{let alive=true;(async()=>{try{const rows=await dbGetAll();if(!alive)return;const hydrated=rows.map(r=>{const src=URL.createObjectURL(r.blob);urls.current.add(src);return {...r,src};});setLocal(hydrated);}catch(err){console.error('Library restore failed',err);}finally{if(alive)setLibraryReady(true);}})();return()=>{alive=false;for(const u of urls.current)URL.revokeObjectURL(u);urls.current.clear();};},[]);
 useEffect(()=>{if(audio.current)audio.current.volume=volume;},[volume]);
 useEffect(()=>{const a=audio.current;if(!a)return;a.pause();setPlaying(false);setTime(0);setDuration(0);pendingPlay.current=Boolean(current.src);if(current.src){a.src=current.src;a.load();}else a.removeAttribute('src');},[current]);
 useEffect(()=>{if(!('mediaSession' in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:current.artist,album:current.album});const safe=(name,fn)=>{try{navigator.mediaSession.setActionHandler(name,fn);}catch{}};safe('play',()=>audio.current?.play().catch(()=>{}));safe('pause',()=>audio.current?.pause());safe('previoustrack',prev);safe('nexttrack',next);safe('seekbackward',()=>seekBy(-10));safe('seekforward',()=>seekBy(10));safe('seekto',d=>{if(audio.current&&Number.isFinite(d.seekTime))audio.current.currentTime=d.seekTime;});}catch{}},[current,shuffle,repeat,tracks,time]);

 function play(t){
   if(t.src && current.id===t.id){const a=audio.current;if(playing)a?.pause();else a?.play().catch(err=>console.error('Playback failed',err));setFullPlayer(false);return;}
   pendingPlay.current=Boolean(t.src);
   setCurrent(t);setFullPlayer(false);
 }
 function next(){if(!tracks.length)return;const i=tracks.findIndex(t=>t.id===current.id);const n=shuffle?tracks[Math.floor(Math.random()*tracks.length)]:tracks[(i+1)%tracks.length];play(n);}
 function prev(){if(time>4){if(audio.current)audio.current.currentTime=0;return;}const i=tracks.findIndex(t=>t.id===current.id);play(tracks[(i-1+tracks.length)%tracks.length]);}
 function seekBy(d){const a=audio.current;if(a&&Number.isFinite(a.duration))a.currentTime=Math.max(0,Math.min(a.duration,a.currentTime+d));}
 function openImporter(){fileInput.current?.click();}
 async function importMusic(e){
   try{
     const files=Array.from(e.target.files||[]).filter(f=>f.type.startsWith('audio/')||AUDIO_EXT.test(f.name));
     if(!files.length)return;
     const arr=[];
     for(const f of files){
       const id=`local-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
       const src=URL.createObjectURL(f);urls.current.add(src);
       const item={id,title:f.name.replace(/\.[^/.]+$/,''),artist:'Local Music',album:'My Library',color:'#312e81',src};
       await dbPut({id,title:item.title,artist:item.artist,album:item.album,color:item.color,blob:f,name:f.name,type:f.type||'audio/*'});
       arr.push(item);
     }
     setLocal(p=>[...arr,...p]);
     setCurrent(arr[0]);
     setTab('Library');
   }catch(err){console.error('Music import failed',err);alert('Music import failed. Please try the file again.');}
   finally{e.target.value='';}
 }
 function toggleLike(id){setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});}
 function createPlaylist(){const name=newPlaylist.trim();if(!name)return;setPlaylists(p=>[...p,{id:Date.now(),name,tracks:[]}]);setNewPlaylist('');setShowCreate(false);}
 function addToPlaylist(id){if(!playlists.length){setShowCreate(true);return;}const first=playlists[0];setPlaylists(p=>p.map(x=>x.id===first.id&&!x.tracks.includes(id)?{...x,tracks:[...x.tracks,id]}:x));}
 function onEnded(){if(repeat){if(audio.current){audio.current.currentTime=0;audio.current.play().catch(()=>{});}}else next();}
 function go(n){setTab(n);if(n!=='Search')setQuery('');}
 const common={current,playing,play,liked,like:toggleLike,add:addToPlaylist};
 let page;
 if(tab==='Search')page=<section className="content"><p className="eyebrow">DISCOVER</p><h1>Search music</h1><div className="trackList">{filtered.map(t=><Track key={t.id} t={t}{...common}/>)}</div></section>;
 else if(tab==='Liked'){const ls=tracks.filter(t=>liked.has(t.id));page=<section className="content"><p className="eyebrow">YOUR MUSIC</p><h1>Liked Songs</h1>{ls.length?<div className="trackList">{ls.map(t=><Track key={t.id} t={t}{...common}/>)}</div>:<Empty icon={<Heart size={40}/>} text="No liked songs yet" sub="Tap the heart on any track to save it here."/>}</section>}
 else if(tab==='Library')page=<LibraryPage local={local} ready={libraryReady} openImporter={openImporter} common={common}/>;
 else if(tab.startsWith('playlist-')){const p=playlists.find(x=>`playlist-${x.id}`===tab);const items=(p?.tracks||[]).map(id=>tracks.find(t=>t.id===id)).filter(Boolean);page=<section className="content"><p className="eyebrow">PLAYLIST</p><h1>{p?.name||'Playlist'}</h1>{items.length?<div className="trackList">{items.map(t=><Track key={t.id} t={t}{...common}/>)}</div>:<Empty icon={<ListMusic size={40}/>} text="Playlist is empty" sub="Use + on a song to add it."/>}</section>}
 else page=<HomePage tracks={tracks} setTab={setTab} openImporter={openImporter} {...common}/>;
 return <div className="app">
  <input ref={fileInput} hidden type="file" multiple accept={ACCEPT} onChange={importMusic}/>
  <aside><div className="brand"><span className="logo">C</span><b>CHINTU<span>MUSIC</span></b></div><nav>{[[Home,'Home'],[Search,'Search'],[Library,'Library']].map(([I,n])=><button key={n} className={tab===n?'active':''} onClick={()=>go(n)}><I size={19}/>{n}</button>)}</nav><div className="section"><small>YOUR MUSIC</small><button onClick={()=>setTab('Liked')}><Heart size={18}/>Liked Songs</button><button onClick={openImporter}><Upload size={18}/>Import Music</button><button onClick={()=>setShowCreate(true)}><Plus size={18}/>New Playlist</button></div><div className="section"><small>PLAYLISTS</small>{playlists.map(p=><button key={p.id} onClick={()=>setTab(`playlist-${p.id}`)}><ListMusic size={16}/>{p.name}</button>)}{!playlists.length&&<span className="muted">Create your first playlist</span>}</div></aside>
  <main><header><div className="search"><Search size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setTab('Search');}} placeholder="Search songs, artists, albums..."/><kbd>⌘ K</kbd></div><button className="profile">C</button></header>{page}</main>
  <nav className="mobileNav">{[[Home,'Home'],[Search,'Search'],[Library,'Library']].map(([I,n])=><button key={n} className={tab===n?'active':''} onClick={()=>go(n)}><I size={20}/><span>{n}</span></button>)}</nav>
  <footer className="playerBar"><button className="now clickable" onClick={()=>setFullPlayer(true)}><div className="mini" style={{background:current.color}}>{current.title[0]}</div><div><b>{current.title}</b><small>{current.artist}</small></div></button><div className="controls"><div className="buttons"><button className={shuffle?'on':''} onClick={()=>setShuffle(!shuffle)}><Shuffle size={16}/></button><button onClick={prev}><SkipBack size={19}/></button><button className="play" onClick={()=>{if(!current.src)return;if(playing)audio.current?.pause();else audio.current?.play().catch(()=>{});}}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><button onClick={next}><SkipForward size={19}/></button><button className={repeat?'on':''} onClick={()=>setRepeat(!repeat)}><Repeat2 size={16}/></button></div><div className="progress"><span>{fmt(time)}</span><input type="range" min="0" max={duration||0} value={Math.min(time,duration||0)} onChange={e=>{const v=Number(e.target.value);if(audio.current)audio.current.currentTime=v;setTime(v);}}/><span>{fmt(duration)}</span></div></div><div className="volume"><Volume2 size={17}/><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></footer>
  {fullPlayer&&<div className="playerOverlay" onClick={()=>setFullPlayer(false)}><section className="fullPlayer" onClick={e=>e.stopPropagation()}><button className="closePlayer" onClick={()=>setFullPlayer(false)}><ChevronDown/></button><div className="bigCover" style={{background:current.color}}><span>{current.title[0]}</span></div><div className="fullMeta"><div><p>{current.artist}</p><h2>{current.title}</h2><span>{current.album}</span></div><button onClick={()=>toggleLike(current.id)}>{liked.has(current.id)?<Heart fill="currentColor"/>:<Heart/>}</button></div><div className="seek"><input type="range" min="0" max={duration||0} value={Math.min(time,duration||0)} onChange={e=>{const v=Number(e.target.value);if(audio.current)audio.current.currentTime=v;setTime(v);}}/><div><span>{fmt(time)}</span><span>{fmt(duration)}</span></div></div><div className="fullControls"><button className={shuffle?'on':''} onClick={()=>setShuffle(!shuffle)}><Shuffle/></button><button onClick={prev}><SkipBack/></button><button className="bigPlay" onClick={()=>{if(!current.src)return;if(playing)audio.current?.pause();else audio.current?.play().catch(()=>{});}}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={next}><SkipForward/></button><button className={repeat?'on':''} onClick={()=>setRepeat(!repeat)}><Repeat2/></button></div><button className="queueBtn" onClick={()=>{setFullPlayer(false);setShowCreate(true);}}><Plus size={17}/> Add current song to a playlist</button></section></div>}
  {showCreate&&<div className="modalShade" onClick={()=>setShowCreate(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modalClose" onClick={()=>setShowCreate(false)}><X/></button><p className="eyebrow">YOUR COLLECTION</p><h2>Create playlist</h2><input autoFocus value={newPlaylist} onChange={e=>setNewPlaylist(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPlaylist()} placeholder="Playlist name"/><button className="primary modalCreate" onClick={createPlaylist}><Plus size={17}/> Create playlist</button></div></div>}
  <audio ref={audio} preload="metadata" playsInline onCanPlay={()=>{if(pendingPlay.current){pendingPlay.current=false;audio.current?.play().catch(err=>console.error('Playback failed',err));}}} onLoadedMetadata={()=>setDuration(audio.current?.duration||0)} onTimeUpdate={()=>setTime(audio.current?.currentTime||0)} onEnded={onEnded} onPlay={()=>{setPlaying(true);if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing';}} onPause={()=>{setPlaying(false);if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';}} onError={()=>{pendingPlay.current=false;setPlaying(false);}}/>
 </div>;
}
function HomePage({tracks,current,playing,play,liked,like,add,setTab,openImporter}){return <section className="content"><div className="hero"><div><p className="eyebrow">YOUR SOUND. YOUR SPACE.</p><h1>Music,<br/><em>your way.</em></h1><p className="sub">A premium personal player for your own collection, designed for effortless listening online and offline.</p><div className="actions"><button className="primary" onClick={openImporter}><Upload size={17}/> Import music</button><button className="ghost" onClick={()=>tracks[0]&&play(tracks[0])}><Play size={17}/> Start listening</button></div></div><div className="orb"><span>♪</span></div></div><div className="titleRow"><h2>Recently played</h2><button onClick={()=>setTab('Library')}>View library</button></div><div className="cards">{tracks.slice(0,5).map(t=><article key={t.id}><div className="cover" style={{background:t.color}}><span>{t.title[0]}</span><button onClick={()=>play(t)}>{current.id===t.id&&playing?<Pause size={18}/>:<Play size={18}/>}</button></div><h3>{t.title}</h3><p>{t.artist}</p></article>)}</div><div className="titleRow"><h2>Made for your mood</h2><MoreHorizontal size={18}/></div><div className="trackList">{tracks.slice(0,3).map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={like} add={add}/>)}</div></section>}
function LibraryPage({local,ready,openImporter,common}){return <section className="content"><p className="eyebrow">YOUR COLLECTION</p><h1>Library</h1><div className="libraryCard"><div><h2>{local.length} local tracks</h2><p>{ready?'Your imported music is stored on this device for offline playback.':'Restoring your music library...'}</p></div><button className="primary" onClick={openImporter}><Upload size={17}/> Import music</button></div>{local.length?<div className="trackList">{local.map(t=><Track key={t.id} t={t}{...common}/>)}</div>:<Empty icon={<Library size={40}/>} text={ready?'No local music yet':'Loading library...'} sub={ready?'Import your own audio files to listen offline.':'Please wait a moment.'}/>}</section>}
function Track({t,current,playing,play,liked,like,add}){return <div className="track"><div className="trackCover" style={{background:t.color}}>{t.title[0]}</div><div className="trackInfo" onClick={()=>play(t)}><b>{t.title}</b><span>{t.artist} · {t.album}</span></div><button onClick={()=>like(t.id)}>{liked?<Heart fill="currentColor" size={17}/>:<Heart size={17}/>}</button><button onClick={()=>add(t.id)}><Plus size={16}/></button><button className="rowPlay" onClick={()=>play(t)}>{current.id===t.id&&playing?<Pause size={15}/>:<Play size={15}/>}</button></div>}
function Empty({icon,text,sub}){return <div className="empty">{icon}<b>{text}</b><span>{sub}</span></div>}
createRoot(document.getElementById('root')).render(<App/>);
