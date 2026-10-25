import type { FeedItem } from "./feed";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  item: FeedItem,
  matchedKeywords: string[],
): Promise<boolean> {
  const when = item.publishedAt ?? new Date().toISOString();
  const body = escapeHtml(truncate(item.content || item.title, 3500));
  const lines = [
    `🚨 <b>Market-relevant Truth Social post</b>`,
    ``,
    body,
    ``,
    `<i>Keywords: ${escapeHtml(matchedKeywords.join(", ") || "n/a")}</i>`,
    `<i>${escapeHtml(new Date(when).toLocaleString("en-US", { timeZone: "UTC" }))} UTC</i>`,
  ];
  if (item.link) lines.push(`<a href="${escapeHtml(item.link)}">Open post</a>`);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n"),
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  return res.ok;
}
