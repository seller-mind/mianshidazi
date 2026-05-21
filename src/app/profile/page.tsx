'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; phone?: string; nickname?: string; avatar_url?: string; free_interviews_used?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-orange-50 py-8 px-6">
      <div className="max-w-md mx-auto">
        {/* 返回 */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#FF6B35] transition-colors mb-6">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </Link>

        {/* 头像区 */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-gray-100 flex items-center justify-center">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="头像" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">😊</span>
            )}
          </div>
          <p className="text-xs text-gray-400">暂不支持修改头像</p>
        </div>

        {/* 昵称 */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">昵称</p>
              {editingNickname ? (
                <div className="flex gap-2">
                  <input
                    value={newNickname}
                    onChange={e => setNewNickname(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
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
                  <button
                    onClick={() => setEditingNickname(false)}
                    className="px-3 py-2 text-gray-400 text-sm"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-gray-800">{user.nickname || '未设置'}</p>
                  <button
                    onClick={() => { setNewNickname(user.nickname || ''); setEditingNickname(true); }}
                    className="text-xs text-[#FF6B35]"
                  >
                    修改
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 手机号 */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">手机号</p>
          <p className="text-base text-gray-800">{user.phone?.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</p>
        </div>

        {/* 免费次数 */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">免费面试次数</p>
          <p className="text-base text-gray-800">{Math.max(0, 1 - (user.free_interviews_used || 0))} / 1</p>
        </div>

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
