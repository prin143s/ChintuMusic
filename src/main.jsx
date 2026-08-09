import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, Search, Library, Heart, Upload, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat2, Volume2, Plus, Smartphone, MoreHorizontal } from 'lucide-react';
import './style.css';

const demo = [
  { id:'1', title:'Midnight Drive', artist:'Chintu Music', album:'After Hours', color:'#6d28d9' },
  { id:'2', title:'Neon Skies', artist:'Chintu Music', album:'Neon Skies', color:'#0891b2' },
  { id:'3', title:'Golden Hour', artist:'Chintu Music', album:'Golden Hour', color:'#d97706' },
  { id:'4', title:'Ocean Lights', artist:'Chintu Music', album:'Ocean Lights', color:'#2563eb' },
  { id:'5', title:'After Rain', artist:'Chintu Music', album:'After Rain', color:'#475569' }
];

function App(){
 const [tab,setTab]=useState('Home'),[query,setQuery]=useState(''),[current,setCurrent]=useState(demo[0]),[playing,setPlaying]=useState(false),[local,setLocal]=useState([]),[liked,setLiked]=useState(new Set());
 const audio=useRef(null); const tracks=useMemo(()=>[...local,...demo],[local]);
 const filtered=tracks.filter(t=>`${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(query.toLowerCase()));
 useEffect(()=>{if(audio.current&&current.src){audio.current.src=current.src;if(playing)audio.current.play().catch(()=>{})}},[current]);
 const play=t=>{setCurrent(t);setPlaying(true);setTimeout(()=>audio.current?.play().catch(()=>{}),50)};
 const importMusic=e=>{const arr=[...e.target.files].filter(f=>f.type.startsWith('audio/')).map((f,i)=>({id:`local-${Date.now()}-${i}`,title:f.name.replace(/\.[^/.]+$/,''),artist:'Local Music',album:'My Library',color:'#312e81',src:URL.createObjectURL(f)}));setLocal(p=>[...arr,...p]);if(arr[0])play(arr[0])};
 const toggleLike=id=>setLiked(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n});
 return <div className="app">
  <aside><div className="brand"><span className="logo">C</span><b>CHINTU<span>MUSIC</span></b></div>
   <nav>{[[Home,'Home'],[Search,'Search'],[Library,'Library']].map(([I,n])=><button className={tab===n?'active':''} onClick={()=>setTab(n)} key={n}><I size={19}/>{n}</button>)}</nav>
   <div className="section"><small>YOUR MUSIC</small><button><Heart size={18}/>Liked Songs</button><label><Upload size={18}/>Import Music<input hidden multiple accept="audio/*" type="file" onChange={importMusic}/></label><button><Plus size={18}/>New Playlist</button></div>
   <div className="section"><small>PLAYLISTS</small><button>🌙 Night Drive</button><button>💻 Coding Mode</button><button>🏃 Workout</button></div><div className="sideBottom"><Smartphone size={15}/> Installable PWA<br/><b>Offline local music</b></div>
  </aside>
  <main><header><div className="search"><Search size={18}/><input value={query} onChange={e=>{setQuery(e.target.value);setTab('Search')}} placeholder="Search songs, artists, albums..."/><kbd>⌘ K</kbd></div><button className="profile">C</button></header>
   {tab==='Search'?<section className="content"><p className="eyebrow">DISCOVER</p><h1>Search music</h1><div className="trackList">{filtered.map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={toggleLike}/>)}</div></section>:tab==='Library'?<section className="content"><p className="eyebrow">YOUR COLLECTION</p><h1>Library</h1><div className="libraryCard"><div><h2>{local.length} local tracks</h2><p>Your imported music stays available for offline playback.</p></div><label className="primary"><Upload size={17}/> Import music<input hidden multiple accept="audio/*" type="file" onChange={importMusic}/></label></div>{local.length?<div className="trackList">{local.map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={toggleLike}/>)}</div>:<div className="empty"><Library size={40}/><b>No local music yet</b><span>Import your own audio files to listen offline.</span></div>}</section>:<section className="content">
    <div className="hero"><div><p className="eyebrow">YOUR SOUND. YOUR SPACE.</p><h1>Music,<br/><em>your way.</em></h1><p className="sub">A premium personal player for your own collection, with a beautiful online-ready experience.</p><div className="actions"><label className="primary"><Upload size={17}/> Import music<input hidden multiple accept="audio/*" type="file" onChange={importMusic}/></label><button className="ghost" onClick={()=>play(demo[0])}><Play size={17}/> Start listening</button></div></div><div className="orb"><span>♪</span></div></div>
    <div className="titleRow"><h2>Recently played</h2><button onClick={()=>setTab('Library')}>View library</button></div><div className="cards">{tracks.slice(0,5).map(t=><article key={t.id}><div className="cover" style={{background:t.color}}><span>{t.title[0]}</span><button onClick={()=>play(t)}>{current.id===t.id&&playing?<Pause size={18}/>:<Play size={18}/>}</button></div><h3>{t.title}</h3><p>{t.artist}</p></article>)}</div>
    <div className="titleRow"><h2>Made for your mood</h2><MoreHorizontal size={18}/></div><div className="trackList">{demo.slice(0,3).map(t=><Track key={t.id} t={t} current={current} playing={playing} play={play} liked={liked.has(t.id)} like={toggleLike}/>)}</div>
   </section>}
  </main>
  <footer><div className="now"><div className="mini" style={{background:current.color}}>{current.title[0]}</div><div><b>{current.title}</b><small>{current.artist}</small></div><button onClick={()=>toggleLike(current.id)}>{liked.has(current.id)?<Heart fill="currentColor" size={17}/>:<Heart size={17}/>}</button></div><div className="controls"><div className="buttons"><Shuffle size={16}/><SkipBack size={19}/><button className="play" onClick={()=>{setPlaying(!playing);playing?audio.current?.pause():audio.current?.play().catch(()=>{})}}>{playing?<Pause size={18}/>:<Play size={18}/>}</button><SkipForward size={19}/><Repeat2 size={16}/></div><div className="progress"><i/></div></div><div className="volume"><Volume2 size={17}/><span/></div></footer>
  <audio ref={audio} onEnded={()=>setPlaying(false)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>
 </div>
}
function Track({t,current,playing,play,liked,like}){return <div className="track"><div className="trackCover" style={{background:t.color}}>{t.title[0]}</div><div className="trackInfo"><b>{t.title}</b><span>{t.artist} · {t.album}</span></div><button onClick={()=>like(t.id)}>{liked?<Heart fill="currentColor" size={17}/>:<Heart size={17}/>}</button><button className="rowPlay" onClick={()=>play(t)}>{current.id===t.id&&playing?<Pause size={15}/>:<Play size={15}/>}</button></div>}
createRoot(document.getElementById('root')).render(<App/>);
