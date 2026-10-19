-- 2026-10：联系方式拆成 email / phone 两列。
-- 执行：npx wrangler d1 execute hire-submissions --file=migrate-email-phone.sql --remote
--
-- 幂等性：SQLite 的 ADD COLUMN 没有 IF NOT EXISTS，重复执行会报
-- "duplicate column name: email" —— 看到这个报错说明已经迁移过了，忽略即可。
-- 历史 contact 列不删：老记录里的「邮箱或微信」原样保留，不做拆分猜测。

ALTER TABLE submissions ADD COLUMN email TEXT;
ALTER TABLE submissions ADD COLUMN phone TEXT;
