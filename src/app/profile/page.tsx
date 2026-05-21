'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  expires_at: string;
  interviews_remaining: number | null;
  created_at: string;
}

interface Order {
  id: string;
  order_no: string;
  plan_id: string;
  amount: number;
  status: string;
  created_at: string;
}

const PLAN_LABELS: Record<string, string> = {
  single: '单次模拟面试',
  monthly: '月卡会员',
  quarterly: '季卡会员',
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  single: 'bg-blue-100 text-blue-700',
  monthly: 'bg-orange-100 text-orange-700',
  quarterly: 'bg-purple-100 text-purple-700',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; phone?: string; nickname?: string; avatar_url?: string; free_interviews_used?: number } | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchSubscriptions();
    fetchOrders();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/user/profile', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/user/subscriptions', { headers });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/user/orders', { headers });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ nickname: newNickname.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, nickname: data.user.nickname } : null);
        setEditingNickname(false);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('msd_token');
    router.push('/');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getActiveSub = () => subscriptions.find(s => s.status === 'active');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!user) return null;

  const activeSub = getActiveSub();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* 返回 */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </Link>

        {/* 头像+昵称区 */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gray-100 flex items-center justify-center">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">😊</span>
            )}
          </div>
          {editingNickname ? (
            <div className="flex gap-2 justify-center mt-2">
              <input
                value={newNickname}
                onChange={e => setNewNickname(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                maxLength={20}
                autoFocus
              />
              <button
                onClick={handleSaveNickname}
                disabled={saving || !newNickname.trim()}
                className="px-4 py-2 bg-[#FF6B35] text-white text-sm rounded-lg disabled:opacity-50"
              >
                {saving ? '...' : '保存'}
              </button>
              <button onClick={() => setEditingNickname(false)} className="px-3 py-2 text-gray-400 text-sm">取消</button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-lg font-medium text-gray-800 dark:text-white">{user.nickname || '未设置'}</span>
              <button onClick={() => { setNewNickname(user.nickname || ''); setEditingNickname(true); }} className="text-xs text-[#FF6B35]">修改</button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">{user.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>
        </div>

        {/* 当前权益 */}
        <div className="bg-white dark:bg-[#252542] rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">当前权益</h3>
          {activeSub ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGE_COLORS[activeSub.plan_id] || 'bg-gray-100 text-gray-600'}`}>
                  {PLAN_LABELS[activeSub.plan_id] || activeSub.plan_id}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">有效</span>
              </div>
              <div className="space-y-1 mt-3">
                {activeSub.plan_id === 'single' && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    剩余次数：<span className="font-medium text-[#FF6B35]">{activeSub.interviews_remaining ?? 0}</span> 次
                  </p>
                )}
                {(activeSub.plan_id === 'monthly' || activeSub.plan_id === 'quarterly') && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    模拟面试：<span className="font-medium text-[#FF6B35]">无限次</span>
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  到期时间：<span className="font-medium">{formatDate(activeSub.expires_at)}</span>
                </p>
              </div>
              {(activeSub.plan_id === 'single' || activeSub.plan_id === 'monthly') && (
                <Link href="/pricing" className="inline-block mt-3 text-xs text-[#FF6B35] hover:underline">
                  升级套餐 →
                </Link>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">暂无有效套餐</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                免费体验：<span className="font-medium">{Math.max(0, 1 - (user.free_interviews_used || 0))}</span> / 1 次
              </p>
              <Link href="/pricing" className="inline-block mt-3 px-4 py-2 bg-[#FF6B35] text-white text-sm rounded-lg hover:bg-[#E55A28] transition-colors">
                购买套餐
              </Link>
            </div>
          )}
        </div>

        {/* 历史订单 */}
        {orders.length > 0 && (
          <div className="bg-white dark:bg-[#252542] rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">历史订单</h3>
            <div className="space-y-3">
              {orders.slice(0, 10).map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{PLAN_LABELS[order.plan_id] || order.plan_id}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">¥{order.amount}</p>
                    <p className={`text-xs mt-0.5 ${order.status === 'paid' ? 'text-green-600' : order.status === 'pending' ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {order.status === 'paid' ? '已支付' : order.status === 'pending' ? '待支付' : order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full mt-4 py-3 bg-gray-100 dark:bg-[#2A2A45] text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#353560] transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
