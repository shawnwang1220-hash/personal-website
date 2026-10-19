-- hire-api 的表结构：一条提交一行。
-- 执行：npx wrangler d1 execute hire-submissions --file=schema.sql --remote
-- 已建过表的库不要重跑这个文件（IF NOT EXISTS 不会补列），走 migrate-email-phone.sql。

CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT    PRIMARY KEY,      -- crypto.randomUUID()
  created_at    TEXT    NOT NULL,         -- ISO8601 UTC
  name          TEXT    NOT NULL,
  -- 2026-10 前的「联系方式」列（邮箱或微信合一）。历史数据保留不删，
  -- 新记录写入邮箱值，只为兼容按老列导出的脚本；结构化查询用下面的 email / phone。
  contact       TEXT    NOT NULL,
  email         TEXT,                     -- 必填，服务端已校验格式
  phone         TEXT,                     -- 选填，可为空
  message       TEXT    NOT NULL,         -- 选填，可为空串
  ip            TEXT,
  user_agent    TEXT,
  referer       TEXT,
  -- 下游落点是否成功。失败时留 0，后续可据此补投（Cron 从这两列捞）
  notion_synced INTEGER NOT NULL DEFAULT 0,
  mail_sent     INTEGER NOT NULL DEFAULT 0
);

-- 导出 / 查最新提交都按时间倒序，这条索引是唯一会被用到的
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC);
