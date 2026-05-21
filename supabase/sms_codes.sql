-- 验证码存储表（替代内存Map，解决Vercel无状态问题）
CREATE TABLE IF NOT EXISTS sms_codes (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(11) NOT NULL,
  code VARCHAR(6) NOT NULL DEFAULT '',
  session_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 索引：按手机号+过期时间查询
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone_expires ON sms_codes(phone, expires_at DESC);

-- RLS策略
ALTER TABLE sms_codes ENABLE ROW LEVEL SECURITY;

-- service_role和anon都能操作
CREATE POLICY "Service role can do anything" ON sms_codes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can do anything" ON sms_codes FOR ALL TO anon USING (true) WITH CHECK (true);

-- GRANT权限
GRANT ALL ON sms_codes TO service_role;
GRANT ALL ON sms_codes TO anon;
GRANT ALL ON SEQUENCE sms_codes_id_seq TO service_role;
GRANT ALL ON SEQUENCE sms_codes_id_seq TO anon;
