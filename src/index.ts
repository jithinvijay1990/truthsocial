/**
 * Truth Social watcher — polls RSS mirrors of Trump's Truth Social posts on a
 * Cron Trigger, stores new posts in D1, and alerts Slack when a post matches
 * market-relevant keywords (tariffs, China, the Fed, etc).
 */
import { parseRssFeed, type FeedItem } from "./feed";
import { matchKeywords, parseKeywordList } from "./keywords";
import { sendSlackAlert } from "./slack";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  SLACK_WEBHOOK_URL?: string;
  FEED_URLS?: string;
  MARKET_KEYWORDS?: string;
  ALERT_ALL_POSTS?: string;
  POLL_TOKEN?: string;
}

const DEFAULT_FEED_URLS = ["https://trumpstruth.org/feed"];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function feedUrls(env: Env): string[] {
  if (!env.FEED_URLS) return DEFAULT_FEED_URLS;
  const list = env.FEED_URLS.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : DEFAULT_FEED_URLS;
}

async function fetchFeedItems(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; NewsJournalBot/1.0; +https://newsjournal.jithinvijay1990.workers.dev)",
      accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });
  if (!res.ok) throw new Error(`feed ${url} returned ${res.status}`);
  return parseRssFeed(await res.text());
}

/** Polls all configured feeds, stores new posts, and alerts Slack on matches. */
export async function pollFeeds(env: Env): Promise<{ checked: number; inserted: number; alerted: number }> {
  const keywords = parseKeywordList(env.MARKET_KEYWORDS);
  const alertAll = env.ALERT_ALL_POSTS === "true";
  const now = new Date().toISOString();

  let checked = 0;
  let inserted = 0;
  let alerted = 0;

  for (const url of feedUrls(env)) {
    let items: FeedItem[];
    try {
      items = await fetchFeedItems(url);
    } catch (err) {
      console.error(`[truthsocial] fetch failed for ${url}:`, err);
      continue;
    }

    for (const item of items) {
      checked++;
      const { isRelevant, matched } = matchKeywords(`${item.title} ${item.content}`, keywords);

      const result = await env.DB.prepare(
        `INSERT INTO posts (guid, link, title, content, published_at, fetched_at, is_market_relevant, matched_keywords)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (guid) DO NOTHING`,
      )
        .bind(
          item.guid,
          item.link,
          item.title,
          item.content,
          item.publishedAt,
          now,
          isRelevant ? 1 : 0,
          matched.join(","),
        )
        .run();

      if (result.meta.changes === 0) continue; // already seen
      inserted++;

      if (env.SLACK_WEBHOOK_URL && (isRelevant || alertAll)) {
        try {
          const ok = await sendSlackAlert(env.SLACK_WEBHOOK_URL, item, matched);
          if (ok) {
            alerted++;
            await env.DB.prepare(`UPDATE posts SET slack_alerted = 1 WHERE guid = ?`).bind(item.guid).run();
          }
        } catch (err) {
          console.error(`[truthsocial] slack alert failed for ${item.guid}:`, err);
        }
      }
    }
  }

  return { checked, inserted, alerted };
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === "/api/posts" && request.method === "GET") {
    const relevantOnly = url.searchParams.get("relevant") === "1";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200);
    const query = relevantOnly
      ? `SELECT * FROM posts WHERE is_market_relevant = 1 ORDER BY COALESCE(published_at, fetched_at) DESC LIMIT ?`
      : `SELECT * FROM posts ORDER BY COALESCE(published_at, fetched_at) DESC LIMIT ?`;
    const { results } = await env.DB.prepare(query).bind(limit).all();
    return json({ posts: results });
  }

  if (url.pathname === "/api/poll" && request.method === "POST") {
    if (env.POLL_TOKEN) {
      const auth = request.headers.get("x-poll-token");
      if (auth !== env.POLL_TOKEN) return json({ error: "unauthorized" }, 403);
    }
    const result = await pollFeeds(env);
    return json(result);
  }

  return json({ error: "not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      pollFeeds(env).then((r) =>
        console.log(`[truthsocial] checked=${r.checked} inserted=${r.inserted} alerted=${r.alerted}`),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
