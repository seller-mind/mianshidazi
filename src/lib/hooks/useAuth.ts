'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  phone?: string;
  nickname?: string;
  avatar_url?: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  expires_at: string | null;
  interviews_remaining: number | null;
}

interface AuthState {
  user: User | null;
  subscriptions: Subscription[];
  loading: boolean;
  isLoggedIn: boolean;
  canPractice: boolean;
  activePlan: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    subscriptions: [],
    loading: true,
    isLoggedIn: false,
    canPractice: false,
    activePlan: null,
  });

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        const subs = data.subscriptions || [];
        const activeSub = subs.find((s: Subscription) => s.status === 'active');

        setState({
          user: data.user,
          subscriptions: subs,
          loading: false,
          isLoggedIn: !!data.user,
          canPractice: !!activeSub,
          activePlan: activeSub?.plan_id || null,
        });
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setState({
      user: null,
      subscriptions: [],
      loading: false,
      isLoggedIn: false,
      canPractice: false,
      activePlan: null,
    });
  };

  const checkSubscription = async (): Promise<{ canPractice: boolean; reason?: string }> => {
    try {
      const res = await fetch('/api/subscription/check');
      const data = await res.json();
      return { canPractice: data.canPractice, reason: data.reason };
    } catch {
      return { canPractice: false, reason: 'server_error' };
    }
  };

  const consumeInterview = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/subscription/check', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  };

  return {
    ...state,
    logout,
    checkSubscription,
    consumeInterview,
    refetch: fetchUser,
  };
}
