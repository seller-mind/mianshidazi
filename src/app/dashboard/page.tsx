'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Card, AdaAvatar } from '@/components/ui';
import { TENSION_TYPES } from '@/lib/ai/config';
import type { TensionLevel } from '@/types';

export default function DashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState({
    email: '',
    tensionType: undefined as TensionLevel | undefined,
    tensionIndex: 0,
    practiceCount: 0,
    memberStatus: 'free' as 'free' | 'monthly' | 'quarterly',
  });

  // 模拟用户数据
  useEffect(() => {
    // 实际项目中从Supabase获取用户数据
    setUserData({
      email: 'user@example.com',
      tensionType: 'A',
      tensionIndex: 72,
      practiceCount: 3,
      memberStatus: 'free',
    });
  }, []);

  const typeInfo = userData.tensionType ? TENSION_TYPES[userData.tensionType] : null;

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <AdaAvatar size="xl" className="mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white mb-2">
              登录面试搭子
            </h1>
            <p className="text-[#6B7280]">
              记录你的练习历史，获取专属建议
            </p>
          </div>

          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-[#1A1A2E] rounded-xl text-[#1F2937] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F2937] dark:text-white mb-2">
                  密码
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-[#1A1A2E] rounded-xl text-[#1F2937] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
                />
              </div>
              <Button className="w-full">登录</Button>
              <p className="text-center text-sm text-[#6B7280]">
                还没有账号？<a href="#" className="text-[#FF6B35] hover:underline">注册</a>
              </p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-orange-50 dark:from-[#1A1A2E] dark:to-[#252542] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AdaAvatar size="md" />
            <div>
              <p className="font-medium text-[#1F2937] dark:text-white">{userData.email}</p>
              <p className="text-xs text-[#6B7280]">
                {userData.memberStatus === 'free' ? '免费用户' : '会员用户'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">退出</Button>
        </div>

        {/* 紧张类型卡片 */}
        {typeInfo && (
          <Card variant="highlight" className="mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A28] flex items-center justify-center text-white text-2xl font-bold">
                {typeInfo.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#6B7280]">你的紧张类型</p>
                <p className="text-lg font-semibold text-[#1F2937] dark:text-white">
                  {typeInfo.name}
                </p>
                <p className="text-sm text-[#FF6B35]">紧张指数 {userData.tensionIndex}%</p>
              </div>
              <Link href="/diagnose">
                <Button variant="ghost" size="sm">重新诊断</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* 统计数据 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <p className="text-sm text-[#6B7280] mb-1">练习次数</p>
            <p className="text-2xl font-bold text-[#1F2937] dark:text-white">{userData.practiceCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-[#6B7280] mb-1">会员状态</p>
            <p className="text-lg font-semibold text-[#FF6B35]">
              {userData.memberStatus === 'free' ? '免费版' : '已开通'}
            </p>
          </Card>
        </div>

        {/* 快速入口 */}
        <Card className="mb-6">
          <h3 className="font-semibold text-[#1F2937] dark:text-white mb-4">快速开始</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/diagnose">
              <Button variant="outline" className="w-full h-full py-4">
                <div className="text-center">
                  <p className="text-lg mb-1">紧张类型测试</p>
                  <p className="text-xs text-gray-500">约3分钟</p>
                </div>
              </Button>
            </Link>
            <Link href="/practice">
              <Button className="w-full h-full py-4">
                <div className="text-center">
                  <p className="text-lg mb-1">AI面试练习</p>
                  <p className="text-xs text-white/70">随时开始</p>
                </div>
              </Button>
            </Link>
          </div>
        </Card>

        {/* 会员升级 */}
        {userData.memberStatus === 'free' && (
          <Card variant="highlight" className="mb-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👑</div>
              <div className="flex-1">
                <p className="font-semibold text-[#1F2937] dark:text-white">升级会员</p>
                <p className="text-sm text-[#6B7280]">解锁无限次练习 + 专属训练</p>
              </div>
              <Link href="/#pricing">
                <Button size="sm">了解详情</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
