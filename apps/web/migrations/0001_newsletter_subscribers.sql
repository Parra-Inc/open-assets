-- Newsletter signups from the open-assets.dev forms (footer, home).
-- One row per address. Unsubscribing flips is_active and keeps the row, so a
-- later signup reactivates it with the same unsubscribe_token.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  email             TEXT NOT NULL UNIQUE,
  source            TEXT,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  is_active         INTEGER NOT NULL DEFAULT 1,
  subscribed_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at   TEXT,
  updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON newsletter_subscribers (is_active);
