# Truth Social Watcher

Polls RSS mirrors of Trump's Truth Social posts, stores them in D1, and
alerts Slack when a post matches market-relevant keywords (tariffs, China,
the Fed, oil, etc).

## How it works

- A Cloudflare **Cron Trigger** runs every minute and fetches the feed(s)
  listed in `FEED_URLS` (default: `https://trumpstruth.org/feed`, a public
  mirror that republishes Truth Social posts as RSS — there is no official
  Truth Social API).
- New posts are inserted into D1, deduped by `guid`.
- Each post's title + body is checked against `MARKET_KEYWORDS` (see
  `src/keywords.ts` for the default list: tariff, China, Fed, oil, etc).
- If it matches (or `ALERT_ALL_POSTS=true`), a Slack message is sent via an
  Incoming Webhook.
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

### Slack alerting

1. Create a Slack Incoming Webhook for the channel you want alerts in:
   https://api.slack.com/messaging/webhooks
2. Set it as a Worker secret (never store it in the repo):
   ```bash
   npx wrangler secret put SLACK_WEBHOOK_URL
   ```
3. (Optional) Add a shared token to protect the manual `/api/poll` endpoint:
   ```bash
   npx wrangler secret put POLL_TOKEN
   ```

For local dev, put secrets in `.dev.vars` (gitignored):

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Configuration (`wrangler.jsonc` vars)

- `FEED_URLS` — comma-separated list of RSS feed URLs to poll.
- `MARKET_KEYWORDS` — comma-separated override of the keyword list; omit to
  use the built-in default (tariff, China, Fed, oil, sanctions, ...).
- `ALERT_ALL_POSTS` — `"true"` to Slack-alert on every new post, not just
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
