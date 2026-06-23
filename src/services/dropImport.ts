import { isValidUrl } from './url';
import { parseUrlFileContent } from './urlFile';

export interface DropLinkItem {
  url: string;
  title?: string;
}

/** 드롭 데이터에서 링크 목록 추출 — .url 파일 + text/uri-list + text/plain */
export async function extractLinksFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<DropLinkItem[]> {
  const items: DropLinkItem[] = [];
  const seen = new Set<string>();

  const push = (url: string, title?: string) => {
    if (!isValidUrl(url) || seen.has(url)) return;
    seen.add(url);
    items.push({ url, title: title?.trim() || undefined });
  };

  const files = dataTransfer.files;
  if (files?.length) {
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.url')) continue;
      const text = await file.text();
      const parsed = parseUrlFileContent(text, file.name);
      if (parsed) push(parsed.url, parsed.title);
    }
  }

  if (items.length > 0) return items;

  const uriList = dataTransfer.getData('text/uri-list');
  if (uriList) {
    for (const line of uriList.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      push(trimmed);
    }
  }

  if (items.length > 0) return items;

  const plain = dataTransfer.getData('text/plain').trim();
  if (plain && isValidUrl(plain)) {
    push(plain);
  }

  return items;
}
