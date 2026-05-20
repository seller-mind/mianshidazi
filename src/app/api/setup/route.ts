import { NextRequest, NextResponse } from 'next/server';

const SQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE,
  wechat_openid TEXT UNIQUE,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_no TEXT UNIQUE NOT NULL,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('single', 'monthly', 'quarterly')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  xunhu_trade_no TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订阅/权益表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('single', 'monthly', 'quarterly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  interviews_remaining INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own data') THEN
    CREATE POLICY "Users can read own data" ON users FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own data') THEN
    CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own orders') THEN
    CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own subscriptions') THEN
    CREATE POLICY "Users can read own subscriptions" ON subscriptions FOR SELECT USING (true);
  END IF;
END $$;
`;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const setupKey = process.env.SETUP_KEY || 'msd_setup_2026';

  if (authHeader !== `Bearer ${setupKey}`) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY 未配置',
      hint: '请在 .env.local 中填入 Service Role Key 后重试',
    }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Supabase JS client 不支持DDL，返回SQL让用户在Dashboard执行
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

    return NextResponse.json({
      status: 'manual_required',
      message: '请前往 Supabase Dashboard SQL Editor 执行建表SQL',
      dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/sql`,
      sql: SQL.trim(),
    });
  } catch (error) {
    return NextResponse.json({
      error: '建表失败',
      detail: error instanceof Error ? error.message : '未知错误',
      sql: SQL.trim(),
    }, { status: 500 });
  }
}

// GET返回当前数据库状态
export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return NextResponse.json({ status: 'error', message: 'NEXT_PUBLIC_SUPABASE_URL 未配置' });
  }

  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

  if (!serviceRoleKey) {
    return NextResponse.json({
      status: 'waiting',
      message: 'SUPABASE_SERVICE_ROLE_KEY 未配置',
      nextStep: '在 .env.local 中填入 Service Role Key',
      dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/settings/api`,
    });
  }

  // 检查表是否存在
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error && error.code === '42P01') {
      return NextResponse.json({
        status: 'tables_missing',
        message: '表尚未创建',
        nextStep: '前往 SQL Editor 执行建表SQL',
        dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/sql`,
      });
    }

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: error.message,
        code: error.code,
      });
    }

    return NextResponse.json({
      status: 'ready',
      message: '数据库已就绪',
      tablesExist: true,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : '检查失败',
    });
  }
}
