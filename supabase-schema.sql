-- 面试搭子数据库初始化脚本
-- 运行此脚本创建所有必要的表

-- 面试会话表
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID, -- 匿名用户可为空
  type VARCHAR(50) NOT NULL CHECK (type IN ('interview', 'companion')),
  persona VARCHAR(10),
  context VARCHAR(50),
  interview_type VARCHAR(100),
  resume TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- 面试消息表
CREATE TABLE IF NOT EXISTS interview_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL REFERENCES interview_sessions(session_id),
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_order INTEGER NOT NULL,
  tension_signal JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 紧张信号表
CREATE TABLE IF NOT EXISTS tension_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL REFERENCES interview_sessions(session_id),
  user_id UUID,
  tension_type VARCHAR(50) NOT NULL,
  tension_index INTEGER NOT NULL CHECK (tension_index >= 0 AND tension_index <= 100),
  signals JSONB,
  diagnosis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 面试报告表
CREATE TABLE IF NOT EXISTS interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL REFERENCES interview_sessions(session_id),
  user_id UUID,
  summary TEXT,
  actual_score INTEGER,
  real_level INTEGER,
  tension_lost INTEGER,
  highlights JSONB,
  tension_losses JSONB,
  tension_diagnosis JSONB,
  suggestions JSONB,
  ada_message TEXT,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户进度追踪表
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  date DATE NOT NULL,
  interview_count INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2),
  avg_tension_index INTEGER,
  persona_preference VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON interview_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON interview_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_tension_session_id ON tension_records(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_session_id ON interview_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON user_progress(user_id);

-- 启用RLS
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tension_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- RLS策略（允许服务端访问所有数据）
CREATE POLICY "Allow service role full access" ON interview_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON interview_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON tension_records
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON interview_reports
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access" ON user_progress
  FOR ALL USING (auth.role() = 'service_role');
