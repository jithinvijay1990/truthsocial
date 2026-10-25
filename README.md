# Truth Social Watcher

Polls RSS mirrors of Trump's Truth Social posts, stores them in D1, and
alerts a Telegram chat when a post matches market-relevant keywords
(tariffs, China, the Fed, oil, etc).

## How it works

- A Cloudflare **Cron Trigger** runs every minute and fetches the feed(s)
  listed in `FEED_URLS` (default: `https://trumpstruth.org/feed`, a public
  mirror that republishes Truth Social posts as RSS — there is no official
  Truth Social API).
- New posts are inserted into D1, deduped by `guid`.
- Each post's title + body is checked against `MARKET_KEYWORDS` (see
  `src/keywords.ts` for the default list: tariff, China, Fed, oil, etc).
- If it matches (or `ALERT_ALL_POSTS=true`), a message is sent to a Telegram
  chat via the Bot API.
- `public/` is a tiny viewer for the stored posts, served from the same
  Worker, with a toggle for "market-relevant only".

## Setup

```bash
npm install

# Create the D1 database, then paste its id into wrangler.jsonc
npx wrangler d1 create truthsocial-db

npm run db:migrate:local   # apply schema locally
npm run dev                # local dev server
```

### Telegram alerting

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot` →
   follow the prompts → copy the bot token it gives you
   (`TELEGRAM_BOT_TOKEN`, looks like `123456789:ABC-...`).
2. Get your chat id:
   - Message your new bot anything (it won't reply yet), then open
     `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates` in a
     browser and read `message.chat.id` from the JSON — that's
     `TELEGRAM_CHAT_ID`.
   - For a group chat instead, add the bot to the group first, send a
     message in the group, then read the same endpoint (group chat ids are
     negative numbers).
3. Set both as Worker secrets (never store them in the repo):
   ```bash
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```
4. (Optional) Add a shared token to protect the manual `/api/poll` endpoint:
   ```bash
   npx wrangler secret put POLL_TOKEN
   ```

For local dev, put secrets in `.dev.vars` (gitignored):

```
TELEGRAM_BOT_TOKEN=123456789:ABC-...
TELEGRAM_CHAT_ID=123456789
```

### Configuration (`wrangler.jsonc` vars)

- `FEED_URLS` — comma-separated list of RSS feed URLs to poll.
- `MARKET_KEYWORDS` — comma-separated override of the keyword list; omit to
  use the built-in default (tariff, China, Fed, oil, sanctions, ...).
- `ALERT_ALL_POSTS` — `"true"` to Telegram-alert on every new post, not just
  keyword matches (default `"false"`).

## Deployment

Pushes to `main` deploy automatically via Cloudflare Workers Builds.

Manual deploy:

```bash
npm run db:migrate:remote
npm run deploy
```

## Notes on the feed source

`trumpstruth.org` is an independent mirror, not an official API — it has
been reliable historically but could change format or go offline. If it
does, add another mirror's RSS URL to `FEED_URLS` (comma-separated); the
Worker treats every configured URL as a standard RSS 2.0 feed and merges
results, so posts aren't duplicated across sources.
