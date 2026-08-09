import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, Search, Library, Heart, Upload, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat2, Volume2, Plus, X, ListMusic, ChevronDown, MoreHorizontal } from 'lucide-react';
import './style.css';

const demo = [
  { id:'1', title:'Midnight Drive', artist:'Chintu Music', album:'After Hours', color:'#6d28d9' },
  { id:'2', title:'Neon Skies', artist:'Chintu Music', album:'Neon Skies', color:'#0891b2' },
  { id:'3', title:'Golden Hour', artist:'Chintu Music', album:'Golden Hour', color:'#d97706' },
  { id:'4', title:'Ocean Lights', artist:'Chintu Music', album:'Ocean Lights', color:'#2563eb' },
  { id:'5', title:'After Rain', artist:'Chintu Music', album:'After Rain', color:'#475569' }
];
const fmt = s => Number.isFinite(s) ? `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}` : '0:00';

function App(){
  const [tab,setTab]=useState('Home');
  const [query,setQuery]=useState('');
  const [current,setCurrent]=useState(demo[0]);
  const [playing,setPlaying]=useState(false);
  const [local,setLocal]=useState([]);
  const [liked,setLiked]=useState(()=>new Set(JSON.parse(localStorage.getItem('chintu-liked')||'[]')));
  const [playlists,setPlaylists]=useState(()=>JSON.parse(localStorage.getItem('chintu-playlists')||'[]'));
  const [fullPlayer,setFullPlayer]=useState(false);
  const [duration,setDuration]=useState(0);
  const [time,setTime]=useState(0);
  const [volume,setVolume]=useState(1);
  const [shuffle,setShuffle]=useState(false);
  const [repeat,setRepeat]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const [newPlaylist,setNewPlaylist]=useState('');
  const audio=useRef(null);
  const tracks=useMemo(()=>[...local,...demo],[local]);
  const filtered=tracks.filter(t=>`${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(()=>localStorage.setItem('chintu-liked',JSON.stringify([...liked])),[liked]);
  useEffect(()=>localStorage.setItem('chintu-playlists',JSON.stringify(playlists)),[playlists]);
  useEffect(()=>{ if(audio.current) audio.current.volume=volume; },[volume]);
  useEffect(()=>{
    if(!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata=new MediaMetadata({title:current.title,artist:current.artist,album:current.album});
    navigator.mediaSession.setActionHandler('play',()=>audio.current?.play());
    navigator.mediaSession.setActionHandler('pause',()=>audio.current?.pause());
    navigator.mediaSession.setActionHandler('previoustrack',prev);
    navigator.mediaSession.setActionHandler('nexttrack',next);
    navigator.mediaSession.setActionHandler('seekbackward',()=>seekBy(-10));
    navigator.mediaSession.setActionHandler('seekforward',()=>seekBy(10));
    navigator.mediaSession.setActionHandler('seekto',d=>{if(audio.current&&Number.isFinite(d.seekTime)) audio.current.currentTime=d.seekTime;});
    return ()=>{ if('mediaSession' in navigator) navigator.mediaSession.metadata=null; };
  },[current,shuffle,repeat,tracks,time]);

  function play(t){
    setCurrent(t); setFullPlayer(false); setPlaying(true);
    if(t.src){
      setTimeout(()=>audio.current?.play().catch(()=>setPlaying(false)),80);
    }
  }
  function next(){
    const i=tracks.findIndex(t=>t.id===current.id);
    const n=shuffle ? Math.floor(Math.random()*tracks.length) : (i+1)%tracks.length;
    play(tracks[n]);
  }
  function prev(){
    if(time>4){ if(audio.current) audio.current.currentTime=0; setTime(0); return; }
    const i=tracks.findIndex(t=>t.id===current.id);
    play(tracks[(i-1+tracks.length)%tracks.length]);
  }
  function seekBy(delta){
    if(!audio.current) return;
    audio.current.currentTime=Math.max(0,Math.min(audio.current.duration||0,audio.current.currentTime+delta));
  }
  function importMusic(e){
    const files=[...e.target.files].filter(f=>f.type.startsWith('audio/'));
    const arr=files.map((f,i)=>({id:`local-${Date.now()}-${i}`,title:f.name.replace(/\.[^/.]+$/,''),artist:'Local Music',album:'My Library',color:'#312e81',src:URL.createObjectURL(f)}));
    setLocal(p=>[...arr,...p]);
    if(arr[0]) play(arr[0]);
    e.target.value='';
  }
  function toggleLike(id){setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});}
  function createPlaylist(){
    const name=newPlaylist.trim(); if(!name)return;
    setPlaylists(p=>[...p,{id:Date.now(),name,tracks:[]}]); setNewPlaylist(''); setShowCreate(false);
  }
  function addToPlaylist(id){
    if(!playlists.length){setShowCreate(true);return;}
    const first=playlists[0];
    setPlaylists(p=>p.map(x=>x.id===first.id&&!x.tracks.includes(id)?{...x,tracks:[...x.tracks,id]}:x));
  }
  function onEnded(){
    if(repeat){if(audio.current){audio.current.currentTime=0;audio.current.play().catch(()=>{});}return;}
    next();
  }
  function go(n){setTab(n);if(n!=='Search')setQuery('');}

  let page;
  if(tab==='Search') page=<section className="content"><p className="eyebrow">DISCOVER</p><h1>Search music</h1><div className="trackList">{filtered.map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={toggleLike} add={addToPlaylist}/>)}</div></section>;
  else if(tab==='Liked') page=<section className="content"><p className="eyebrow">YOUR MUSIC</p><h1>Liked Songs</h1>{tracks.filter(t=>liked.has(t.id)).length?<div className="trackList">{tracks.filter(t=>liked.has(t.id)).map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked like={toggleLike} add={addToPlaylist}/>)}</div>:<div className="empty"><Heart size={40}/><b>No liked songs yet</b><span>Tap the heart on any track to save it here.</span></div>}</section>;
  else if(tab==='Library') page=<section className="content"><p className="eyebrow">YOUR COLLECTION</p><h1>Library</h1><div className="libraryCard"><div><h2>{local.length} local tracks</h2><p>Your imported music is ready for playback.</p></div><label className="primary"><Upload size={17}/> Import music<input hidden multiple accept="audio/*" type="file" onChange={importMusic}/></label></div>{local.length?<div className="trackList">{local.map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={toggleLike} add={addToPlaylist}/>)}</div>:<div className="empty"><Library size={40}/><b>No local music yet</b><span>Import your own audio files to listen offline.</span></div>}</section>;
  else if(tab.startsWith('playlist-')) page=<PlaylistView playlist={playlists.find(p=>`playlist-${p.id}`===tab)} tracks={tracks} current={current} playing={playing} play={play} liked={liked} like={toggleLike} add={addToPlaylist}/>;
  else page=<HomePage tracks={tracks} current={current} playing={playing} play={play} liked={liked} like={toggleLike} add={addToPlaylist} setTab={setTab} importMusic={importMusic}/>;

  return <div className="app">
    <aside><div className="brand"><span className="logo">C</span><b>CHINTU<span>MUSIC</span></b></div>
      <nav>{[[Home,'Home'],[Search,'Search'],[Library,'Library']].map(([I,n])=><button className={tab===n?'active':''} onClick={()=>go(n)} key={n}><I size={19}/>{n}</button>)}</nav>
      <div className="section"><small>YOUR MUSIC</small><button onClick={()=>setTab('Liked')}><Heart size={18}/>Liked Songs</button><label><Upload size={18}/>Import Music<input hidden multiple accept="audio/*" type="file" onChange={importMusic}/></label><button onClick={()=>setShowCreate(true)}><Plus size={18}/>New Playlist</button></div>
      <div className="section"><small>PLAYLISTS</small>{playlists.map(p=><button key={p.id} onClick={()=>setTab(`playlist-${p.id}`)}><ListMusic size={16}/>{p.name}</button>)}{!playlists.length&&<span className="muted">Create your first playlist</span>}</div>
    </aside>
    <main><header><div className="search"><Search size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setTab('Search')}} placeholder="Search songs, artists, albums..."/><kbd>⌘ K</kbd></div><button className="profile">C</button></header>{page}</main>
    <nav className="mobileNav">{[[Home,'Home'],[Search,'Search'],[Library,'Library']].map(([I,n])=><button className={tab===n?'active':''} onClick={()=>go(n)} key={n}><I size={20}/><span>{n}</span></button>)}</nav>
    <footer className="playerBar"><button className="now clickable" onClick={()=>setFullPlayer(true)}><div className="mini" style={{background:current.color}}>{current.title[0]}</div><div><b>{current.title}</b><small>{current.artist}</small></div></button><div className="controls"><div className="buttons"><button className={shuffle?'on':''} onClick={()=>setShuffle(!shuffle)}><Shuffle size={16}/></button><button onClick={prev}><SkipBack size={19}/></button><button className="play" onClick={()=>{if(!current.src){setPlaying(!playing);return;}if(playing)audio.current?.pause();else audio.current?.play().catch(()=>{});}}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><button onClick={next}><SkipForward size={19}/></button><button className={repeat?'on':''} onClick={()=>setRepeat(!repeat)}><Repeat2 size={16}/></button></div><div className="progress"><span>{fmt(time)}</span><input type="range" min="0" max={duration||0} value={Math.min(time,duration||0)} onChange={e=>{const v=Number(e.target.value);if(audio.current)audio.current.currentTime=v;setTime(v)}}/><span>{fmt(duration)}</span></div></div><div className="volume"><Volume2 size={17}/><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></div></footer>
    {fullPlayer&&<div className="playerOverlay" onClick={()=>setFullPlayer(false)}><section className="fullPlayer" onClick={e=>e.stopPropagation()}><button className="closePlayer" onClick={()=>setFullPlayer(false)}><ChevronDown/></button><div className="bigCover" style={{background:current.color}}><span>{current.title[0]}</span></div><div className="fullMeta"><div><p>{current.artist}</p><h2>{current.title}</h2><span>{current.album}</span></div><button onClick={()=>toggleLike(current.id)}>{liked.has(current.id)?<Heart fill="currentColor"/>:<Heart/>}</button></div><div className="seek"><input type="range" min="0" max={duration||0} value={Math.min(time,duration||0)} onChange={e=>{const v=Number(e.target.value);if(audio.current)audio.current.currentTime=v;setTime(v)}}/><div><span>{fmt(time)}</span><span>{fmt(duration)}</span></div></div><div className="fullControls"><button className={shuffle?'on':''} onClick={()=>setShuffle(!shuffle)}><Shuffle/></button><button onClick={prev}><SkipBack/></button><button className="bigPlay" onClick={()=>{if(playing)audio.current?.pause();else audio.current?.play().catch(()=>{});}}>{playing?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button><button onClick={next}><SkipForward/></button><button className={repeat?'on':''} onClick={()=>setRepeat(!repeat)}><Repeat2/></button></div><button className="queueBtn" onClick={()=>{setFullPlayer(false);setShowCreate(true)}}><Plus size={17}/> Add current song to a playlist</button></section></div>}
    {showCreate&&<div className="modalShade" onClick={()=>setShowCreate(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="modalClose" onClick={()=>setShowCreate(false)}><X/></button><p className="eyebrow">YOUR COLLECTION</p><h2>Create playlist</h2><input autoFocus value={newPlaylist} onChange={e=>setNewPlaylist(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createPlaylist()} placeholder="Playlist name"/><button className="primary modalCreate" onClick={createPlaylist}><Plus size={17}/> Create playlist</button></div></div>}
    <audio ref={audio} preload="metadata" onLoadedMetadata={()=>setDuration(audio.current?.duration||0)} onTimeUpdate={()=>setTime(audio.current?.currentTime||0)} onEnded={onEnded} onPlay={()=>{setPlaying(true);if('mediaSession' in navigator)navigator.mediaSession.playbackState='playing';}} onPause={()=>{setPlaying(false);if('mediaSession' in navigator)navigator.mediaSession.playbackState='paused';}}/>
  </div>;
}

function HomePage({tracks,current,playing,play,liked,like,add,setTab,importMusic}){return <section className="content"><div className="hero"><div><p className="eyebrow">YOUR SOUND. YOUR SPACE.</p><h1>Music,<br/><em>your way.</em></h1><p className="sub">A premium personal player for your own collection, designed for effortless listening online and offline.</p><div className="actions"><label className="primary"><Upload size={17}/> Import music<input hidden multiple accept="audio/*" type="file" onChange={importMusic}/></label><button className="ghost" onClick={()=>play(tracks[0])}><Play size={17}/> Start listening</button></div></div><div className="orb"><span>♪</span></div></div><div className="titleRow"><h2>Recently played</h2><button onClick={()=>setTab('Library')}>View library</button></div><div className="cards">{tracks.slice(0,5).map(t=><article key={t.id}><div className="cover" style={{background:t.color}}><span>{t.title[0]}</span><button onClick={()=>play(t)}>{current.id===t.id&&playing?<Pause size={18}/>:<Play size={18}/>}</button></div><h3>{t.title}</h3><p>{t.artist}</p></article>)}</div><div className="titleRow"><h2>Made for your mood</h2><MoreHorizontal size={18}/></div><div className="trackList">{tracks.slice(0,3).map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={like} add={add}/>)}</div></section>}
function Track({t,current,playing,play,liked,like,add}){return <div className="track"><div className="trackCover" style={{background:t.color}}>{t.title[0]}</div><div className="trackInfo" onClick={()=>play(t)}><b>{t.title}</b><span>{t.artist} · {t.album}</span></div><button onClick={()=>like(t.id)}>{liked?<Heart fill="currentColor" size={17}/>:<Heart size={17}/>}</button><button onClick={()=>add(t.id)} title="Add to playlist"><Plus size={16}/></button><button className="rowPlay" onClick={()=>play(t)}>{current.id===t.id&&playing?<Pause size={15}/>:<Play size={15}/>}</button></div>}
function PlaylistView({playlist,tracks,current,playing,play,liked,like,add}){const items=(playlist?.tracks||[]).map(id=>tracks.find(t=>t.id===id)).filter(Boolean);return <section className="content"><p className="eyebrow">PLAYLIST</p><h1>{playlist?.name||'Playlist'}</h1><div className="libraryCard"><div><h2>{items.length} songs</h2><p>Your personal playlist.</p></div></div>{items.length?<div className="trackList">{items.map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={like} add={add}/>)}</div>:<div className="empty"><ListMusic size={40}/><b>Playlist is empty</b><span>Use the + button beside a song to add it.</span></div>}</section>}

createRoot(document.getElementById('root')).render(<App/>);
