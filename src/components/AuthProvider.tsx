'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  phone?: string;
  email?: string;
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

interface AuthContextType {
  user: User | null;
  subscriptions: Subscription[];
  loading: boolean;
  isLoggedIn: boolean;
  canPractice: boolean;
  activePlan: string | null;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  subscriptions: [],
  loading: true,
  isLoggedIn: false,
  canPractice: false,
  activePlan: null,
  logout: async () => {},
  refetch: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setSubscriptions(data.subscriptions || []);
      } else {
        setUser(null);
        setSubscriptions([]);
      }
    } catch {
      setUser(null);
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const activeSub = subscriptions.find(s => s.status === 'active');

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setSubscriptions([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscriptions,
        loading,
        isLoggedIn: !!user,
        canPractice: !!activeSub,
        activePlan: activeSub?.plan_id || null,
        logout,
        refetch: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
