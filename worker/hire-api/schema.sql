-- hire-api 的表结构：一条提交一行。
-- 执行：npx wrangler d1 execute hire-submissions --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT    PRIMARY KEY,      -- crypto.randomUUID()
  created_at    TEXT    NOT NULL,         -- ISO8601 UTC
  name          TEXT    NOT NULL,
  contact       TEXT    NOT NULL,
  message       TEXT    NOT NULL,
  ip            TEXT,
  user_agent    TEXT,
  referer       TEXT,
  -- 下游落点是否成功。失败时留 0，后续可据此补投（Cron 从这两列捞）
  notion_synced INTEGER NOT NULL DEFAULT 0,
  mail_sent     INTEGER NOT NULL DEFAULT 0
);

-- 导出 / 查最新提交都按时间倒序，这条索引是唯一会被用到的
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC);
