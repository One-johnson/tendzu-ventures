"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { SessionUser } from "@/types";
import { SESSION_COOKIE } from "@/lib/constants";

interface AuthContextType {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const session = useQuery(api.auth.getSession, token ? { token } : "skip");
  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  useEffect(() => {
    const stored = getCookie(SESSION_COOKIE);
    if (stored) setToken(stored);
    setInitialized(true);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation({ email, password });
      setCookie(SESSION_COOKIE, result.token, 7 * 24 * 60 * 60);
      setToken(result.token);
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await logoutMutation({ token });
      } catch {
        // Session may already be expired
      }
    }
    deleteCookie(SESSION_COOKIE);
    setToken(null);
  }, [logoutMutation, token]);

  const isLoading = !initialized || (token !== null && session === undefined);

  return (
    <AuthContext.Provider
      value={{
        user: session ?? null,
        token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function useSessionToken() {
  const { token } = useAuth();
  return token;
}
