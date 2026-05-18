// Supabase 客户端配置
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 服务端Supabase客户端（用于写入数据）
export const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 面试会话表操作
export const interviewSessionsTable = 'interview_sessions';

// 面试消息表操作
export const interviewMessagesTable = 'interview_messages';

// 面试报告表操作
export const interviewReportsTable = 'interview_reports';

// 用户紧张记录表操作
export const tensionRecordsTable = 'tension_records';
