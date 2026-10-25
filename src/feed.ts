// Minimal RSS parser — Workers has no DOMParser, and these feeds are simple
// WordPress-style RSS, so a tag-scoped regex parser is enough.

export interface FeedItem {
  guid: string;
  link: string;
  title: string;
  content: string;
  publishedAt: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  if (!m) return null;
  const raw = m[1];
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  const inner = cdata ? cdata[1] : raw;
  return decodeEntities(stripTags(inner)).trim();
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Parses an RSS 2.0 feed's <item> entries into FeedItems. */
export function parseRssFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const link = extractTag(block, "link") ?? "";
    const guid = extractTag(block, "guid") ?? link;
    if (!guid) continue;
    items.push({
      guid,
      link,
      title: extractTag(block, "title") ?? "",
      content: extractTag(block, "description") ?? extractTag(block, "content:encoded") ?? "",
      publishedAt: parseDate(extractTag(block, "pubDate")),
    });
  }
  return items;
}
