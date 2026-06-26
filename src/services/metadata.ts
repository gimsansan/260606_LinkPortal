import type { LinkMetadata } from '../types';
import {
  extractYouTubeVideoId,
  getFaviconUrl,
  getYouTubeThumbnail,
} from './url';

/** YouTube oEmbed (키 불필요, CORS 열림) */
async function fetchYouTubeMetadata(url: string): Promise<LinkMetadata | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title ?? 'YouTube',
      imageUrl: getYouTubeThumbnail(videoId),
      authorName: data.author_name ?? undefined,
    };
  } catch {
    return {
      title: 'YouTube',
      imageUrl: getYouTubeThumbnail(videoId),
    };
  }
}

/**
 * OG 태그 수집 — CORS 제약으로 브라우저 직접 fetch는 실패 가능.
 * 실패 시 manual fallback으로 처리.
 */
async function fetchOgMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const html = await res.text();
    const title =
      extractMetaContent(html, 'og:title') ??
      extractMetaContent(html, 'twitter:title') ??
      extractTitleTag(html);
    const imageUrl =
      extractMetaContent(html, 'og:image') ??
      extractMetaContent(html, 'twitter:image');
    if (!title) return null;
    return {
      title,
      imageUrl: imageUrl ?? undefined,
      faviconUrl: getFaviconUrl(url),
    };
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : null;
}

function decodeHtmlEntities(text: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = text;
  return el.value;
}

/** URL에서 메타데이터 자동 수집 시도 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const yt = await fetchYouTubeMetadata(url);
  if (yt) return yt;

  const og = await fetchOgMetadata(url);
  if (og) return og;

  return {
    title: tryExtractHostname(url),
    faviconUrl: getFaviconUrl(url),
  };
}

function tryExtractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
