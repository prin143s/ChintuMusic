// Best-effort background/lock-screen controls for the app's HTMLAudioElement.
// Actual background lifetime is controlled by the Android/WebView runtime.

let installedAudio = null;
let observer;

function safeAction(name, handler) {
  try {
    navigator.mediaSession.setActionHandler(name, handler);
  } catch {
    // Some platforms expose Media Session but do not support every action.
  }
}

function updateMetadata(audio) {
  if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return;
  const title = document.querySelector('.now b')?.textContent?.trim();
  const artist = document.querySelector('.now small')?.textContent?.trim();
  if (!title) return;

  const cover = document.querySelector('.mini')?.style.backgroundImage;
  const artwork = cover && cover !== 'none'
    ? [{ src: cover.replace(/^url\(["']?/, '').replace(/["']?\)$/, ''), sizes: '512x512', type: 'image/jpeg' }]
    : [];

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: artist || 'Chintu Music',
      album: 'Chintu Music',
      artwork
    });
    navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  } catch {}
}

function install() {
  const audio = document.querySelector('audio');
  if (!audio || !('mediaSession' in navigator)) return false;
  if (installedAudio === audio) return true;
  installedAudio = audio;

  safeAction('play', () => audio.play().catch(() => {}));
  safeAction('pause', () => audio.pause());
  safeAction('seekbackward', details => {
    audio.currentTime = Math.max(0, audio.currentTime - (details?.seekOffset || 10));
  });
  safeAction('seekforward', details => {
    audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + (details?.seekOffset || 10));
  });
  safeAction('seekto', details => {
    if (Number.isFinite(details?.seekTime)) audio.currentTime = details.seekTime;
  });
  safeAction('previoustrack', () => document.querySelector('.buttons button:nth-child(2)')?.click());
  safeAction('nexttrack', () => document.querySelector('.buttons button:nth-child(4)')?.click());
  safeAction('stop', () => { audio.pause(); audio.currentTime = 0; });

  const sync = () => updateMetadata(audio);
  ['play', 'pause', 'loadedmetadata', 'ended'].forEach(event => audio.addEventListener(event, sync));
  sync();
  return true;
}

function boot() {
  if (install() && observer) observer.disconnect();
}

observer = new MutationObserver(boot);
observer.observe(document.documentElement, { childList: true, subtree: true });
boot();

// React changes the current-track DOM without replacing the audio element.
// Watch only the player bar instead of polling every second.
const playerObserver = new MutationObserver(() => {
  const audio = document.querySelector('audio');
  if (audio) updateMetadata(audio);
});
playerObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
