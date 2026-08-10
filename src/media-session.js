// Best-effort background/lock-screen media controls for HTMLAudioElement.
// Android/Chrome can keep the audio element alive in the background when supported.
const audio = document.querySelector('audio');

function install() {
  const el = document.querySelector('audio');
  if (!el || !('mediaSession' in navigator)) return false;

  try {
    navigator.mediaSession.setActionHandler('play', () => el.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => el.pause());
    navigator.mediaSession.setActionHandler('seekbackward', details => {
      el.currentTime = Math.max(0, el.currentTime - (details.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', details => {
      el.currentTime = Math.min(el.duration || Infinity, el.currentTime + (details.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekto', details => {
      if (Number.isFinite(details.seekTime)) el.currentTime = details.seekTime;
    });
    return true;
  } catch (e) {
    console.debug('Media Session unavailable:', e);
    return false;
  }
}

// React mounts the audio element after this module executes.
const observer = new MutationObserver(() => {
  if (install()) observer.disconnect();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
install();

setInterval(() => {
  const el = document.querySelector('audio');
  if (!el || !('mediaSession' in navigator)) return;
  const title = document.querySelector('.now b')?.textContent?.trim();
  const artist = document.querySelector('.now small')?.textContent?.trim();
  if (title) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: artist || 'Chintu Music',
        album: 'Chintu Music'
      });
    } catch {}
  }
}, 1000);
