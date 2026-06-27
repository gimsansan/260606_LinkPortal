import { isValidUrl, normalizeUrl } from './url';

export interface ParsedUrlFile {
  url: string;
  title: string;
}

/** .url INI — URL= 줄 + 파일명(확장자 제외)을 제목으로 */
export function parseUrlFileContent(content: string, filename?: string): ParsedUrlFile | null {
  const urlMatch = content.match(/^URL=(.+)$/im);
  if (!urlMatch) return null;

  const url = normalizeUrl(urlMatch[1]);
  if (!isValidUrl(url)) return null;

  const title = titleFromUrlFilename(filename) ?? url;
  return { url, title };
}

export function titleFromUrlFilename(filename?: string): string | undefined {
  if (!filename) return undefined;
  const base = filename.replace(/\.url$/i, '').trim();
  return base || undefined;
}
