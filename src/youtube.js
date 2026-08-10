const API = 'https://www.googleapis.com/youtube/v3/search';

export async function searchYouTube(query, maxResults = 20) {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY;
  const q = query.trim();
  if (!key || !q) return [];

  const params = new URLSearchParams({
    part: 'snippet',
    q,
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: String(Math.min(maxResults, 25)),
    key,
  });

  const response = await fetch(`${API}?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`YouTube search failed (${response.status}) ${body}`);
  }

  const data = await response.json();
  return (data.items || []).map((item) => ({
    id: `youtube-${item.id.videoId}`,
    source: 'youtube',
    videoId: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    album: 'YouTube',
    color: '#111827',
    cover: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    src: '',
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}
