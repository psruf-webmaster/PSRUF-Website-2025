import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api, authHeaders, getUserId } from '../lib/api';
import { normalizeUserAssets } from '../lib/assetUrls';
import { clearStoredUser, readStoredUser, storeUser } from '../lib/storage';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tokenRef = useRef(null);

  const updateUser = useCallback(async (nextUser) => {
    const normalized = nextUser ? normalizeUserAssets(nextUser) : null;
    tokenRef.current = normalized ? (normalized.token || tokenRef.current) : null;
    if (normalized) normalized.token = tokenRef.current;
    setUser(normalized);

    if (!normalized) {
      await clearStoredUser();
      return null;
    }

    await storeUser(normalized);
    return normalized;
  }, []);

  const logout = useCallback(async () => {
    setError('');
    await updateUser(null);
  }, [updateUser]);

  const refreshUser = useCallback(async () => {
    if (!getUserId(user)) {
      return null;
    }

    try {
      const response = await api.get('/auth/me', {
        headers: authHeaders(user),
      });
      return updateUser(response.data.user || null);
    } catch (requestError) {
      if (requestError?.response?.status === 401 || requestError?.response?.status === 403) {
        await logout();
      }
      return null;
    }
  }, [logout, updateUser, user]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const nextUser = await updateUser(response.data.user ? { ...response.data.user, token: response.data.token } : null);
      return nextUser;
    } catch (requestError) {
      const nextError = requestError?.response?.data?.message || requestError.message || 'Login failed';
      setError(nextError);
      throw new Error(nextError);
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const storedUser = await readStoredUser();
      if (!isMounted) {
        return;
      }

      tokenRef.current = storedUser?.token || null;
      setUser(normalizeUserAssets(storedUser));
      setHydrated(true);
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !getUserId(user)) {
      return undefined;
    }

    refreshUser();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshUser();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hydrated, refreshUser, user]);

  const value = useMemo(() => ({
    user,
    hydrated,
    loading,
    error,
    login,
    logout,
    refreshUser,
    updateUser,
  }), [error, hydrated, loading, login, logout, refreshUser, updateUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
