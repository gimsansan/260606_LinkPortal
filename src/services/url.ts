/** 열기(launch) 모델 — 앱은 URL만 던지고 인증은 대상 사이트에 위임 */
export function launchUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const embed = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embed) return embed[1];
      const shorts = parsed.pathname.match(/\/shorts\/([^/?]+)/);  // ← 추가
      if (shorts) return shorts[1];                                 // ← 추가
    }
  } catch {
    return null;
  }
  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getFaviconUrl(url: string): string {
  try {
    const { origin } = new URL(url);
    return `${origin}/favicon.ico`;
  } catch {
    return '';
  }
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidUrl(input: string): boolean {
  try {
    const u = new URL(input);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const DOMAIN_AVATAR_FALLBACK = { letter: '?', color: 'hsl(0, 0%, 45%)' };

export function getDomainAvatar(url: string): { letter: string; color: string } {
  try {
    const { hostname } = new URL(url);
    if (!hostname) return DOMAIN_AVATAR_FALLBACK;

    const letter = hostname.charAt(0).toUpperCase();
    let hash = 0;
    for (let i = 0; i < hostname.length; i++) {
      hash += hostname.charCodeAt(i);
    }
    const color = `hsl(${hash % 360}, 55%, 45%)`;
    return { letter, color };
  } catch {
    return DOMAIN_AVATAR_FALLBACK;
  }
}
