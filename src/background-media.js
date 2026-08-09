import { MediaSession } from '@capgo/capacitor-media-session';

const audio = () => document.querySelector('audio');
const click = (selector) => document.querySelector(selector)?.click();

const nativeSession = {
  setMetadata: async (track) => {
    try {
      await MediaSession.setMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork ? [{ src: track.artwork, sizes: '512x512', type: 'image/png' }] : []
      });
    } catch (_) {}
  },
  setState: async (playing) => {
    try { await MediaSession.setPlaybackState({ playbackState: playing ? 'playing' : 'paused' }); } catch (_) {}
  },
  setPosition: async (a) => {
    try {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        await MediaSession.setPositionState({ duration: a.duration, position: Math.min(a.currentTime, a.duration), playbackRate: a.playbackRate || 1 });
      }
    } catch (_) {}
  }
};

function trackFromUI() {
  const title = document.querySelector('.now b')?.textContent?.trim() || document.title || 'Chintu Music';
  const artist = document.querySelector('.now small')?.textContent?.trim() || 'Chintu Music';
  return { title, artist, album: 'Chintu Music' };
}

function setup() {
  const a = audio();
  if (!a || a.dataset.mediaSessionReady === '1') return !!a;
  a.dataset.mediaSessionReady = '1';

  const updateMetadata = () => {
    const track = trackFromUI();
    document.title = `${track.title} • Chintu Music`;
    nativeSession.setMetadata(track);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist, album: track.album });
    }
  };

  const play = () => a.play().catch(() => {});
  const pause = () => a.pause();
  const seek = (delta) => { a.currentTime = Math.max(0, Math.min(a.duration || Infinity, a.currentTime + delta)); };
  const next = () => click('.controls .buttons button:nth-child(4)');
  const previous = () => click('.controls .buttons button:nth-child(2)');

  a.addEventListener('play', () => { updateMetadata(); nativeSession.setState(true); });
  a.addEventListener('pause', () => nativeSession.setState(false));
  a.addEventListener('loadedmetadata', () => nativeSession.setPosition(a));
  a.addEventListener('timeupdate', () => nativeSession.setPosition(a));

  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    const handlers = {
      play, pause, nexttrack: next, previoustrack: previous,
      seekbackward: () => seek(-10), seekforward: () => seek(10),
      seekto: (details) => { if (Number.isFinite(details.seekTime)) a.currentTime = details.seekTime; },
      stop: pause
    };
    Object.entries(handlers).forEach(([action, handler]) => {
      try { ms.setActionHandler(action, handler); } catch (_) {}
    });
  }

  const nativeHandlers = {
    play, pause, nexttrack: next, previoustrack: previous,
    seekbackward: () => seek(-10), seekforward: () => seek(10),
    seekto: (details) => { if (details?.seekTime != null) a.currentTime = details.seekTime; },
    stop: pause
  };
  Object.entries(nativeHandlers).forEach(([action, handler]) => {
    MediaSession.setActionHandler({ action }, handler).catch(() => {});
  });

  updateMetadata();
  new MutationObserver(updateMetadata).observe(document.body, { subtree: true, childList: true, characterData: true });
  return true;
}

const timer = setInterval(() => { if (setup()) clearInterval(timer); }, 250);
