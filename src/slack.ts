import type { FeedItem } from "./feed";

export async function sendSlackAlert(
  webhookUrl: string,
  item: FeedItem,
  matchedKeywords: string[],
): Promise<boolean> {
  const whenIso = item.publishedAt ?? new Date().toISOString();
  const whenUnix = Math.floor(new Date(whenIso).getTime() / 1000);

  const body = {
    text: `Trump Truth Social post — market relevant (${matchedKeywords.join(", ")})`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🚨 *Market-relevant Truth Social post*\n>${truncate(item.content || item.title, 1500)}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Keywords: *${matchedKeywords.join(", ") || "n/a"}* · <!date^${whenUnix}^{date_short_pretty} {time}|${whenIso}>${item.link ? ` · <${item.link}|Open post>` : ""}`,
          },
        ],
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
