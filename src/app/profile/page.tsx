'use client';

import { useState, useEffect, useRef } from 'react';
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
  single: '日卡畅练',
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
  const [user, setUser] = useState<{ id: string; phone?: string; nickname?: string; avatar_url?: string; free_interviews_used?: number; free_voice_used?: number; free_tts_used?: number } | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<{id: string; type: string; title: string; created_at: string; updated_at: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchSubscriptions();
    fetchOrders();
    fetchSessions();
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
        router.push('/login?return=/profile');
      }
    } catch {
      router.push('/login?return=/profile');
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

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('msd_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/chat/sessions', { headers });
      if (res.ok) {
        const data = await res.json();
        setSessions((data.sessions || []).slice(0, 10));
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('仅支持 PNG/JPG/WebP/GIF 格式');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片不能超过2MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const token = localStorage.getItem('msd_token');
      const formData = new FormData();
      formData.append('avatar', file);

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, avatar_url: data.avatar_url + '?t=' + Date.now() } : null);
      } else {
        const data = await res.json();
        alert(data.message || '头像上传失败');
      }
    } catch {
      alert('头像上传失败，请重试');
    } finally {
      setUploadingAvatar(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          <div
            className="relative w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer group"
            onClick={handleAvatarClick}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">😊</span>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <p className="text-xs text-gray-400 -mt-1 mb-1">点击头像可更换</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    模拟面试：<span className="font-medium text-[#FF6B35]">无限次</span>
                  </p>
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
                免费面试：<span className="font-medium">{Math.max(0, 2 - (user.free_interviews_used || 0))}</span> / 2 次
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                今日语音：<span className="font-medium">{Math.max(0, 3 - (user.free_voice_used || 0))}</span> / 3 条（文字不限）
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                今日朗读：<span className="font-medium">{Math.max(0, 5 - (user.free_tts_used || 0))}</span> / 5 条
              </p>
              <Link href="/pricing" className="inline-block mt-3 px-4 py-2 bg-[#FF6B35] text-white text-sm rounded-lg hover:bg-[#E55A28] transition-colors">
                购买套餐
              </Link>
            </div>
          )}
        </div>

        {/* 面试历史 */}
        <div className="bg-white dark:bg-[#252542] rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">面试练习记录</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">还没有练习记录，开始第一次模拟面试吧</p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 10).map(session => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{session.title || (session.type === 'interview' ? '模拟面试' : '阿搭聊天')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(session.updated_at || session.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      session.type === 'interview' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {session.type === 'interview' ? '面试' : '聊天'}
                    </span>
                    <div className="flex items-center gap-3">
                    <Link href={`/report?session_id=${session.id}`} className="text-xs text-blue-500 hover:underline">
                      报告
                    </Link>
                    <Link href={session.type === 'interview' ? '/practice' : '/companion'} className="text-xs text-[#FF6B35] hover:underline">
                      继续 →
                    </Link>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/practice" className="block mt-3 text-xs text-[#FF6B35] hover:underline text-center">
            开始新的模拟面试 →
          </Link>
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
