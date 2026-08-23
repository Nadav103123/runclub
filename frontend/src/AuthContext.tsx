import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { storage } from "@/src/utils/storage";
import { api, TOKEN_KEY } from "@/src/api";
import { User } from "@/src/types";

type AuthState = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, full_name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (token) {
      try {
        const me = await api.get<User>("/auth/me");
        setUserState(me);
      } catch {
        await storage.secureRemove(TOKEN_KEY);
        setUserState(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const signIn = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    await storage.secureSet(TOKEN_KEY, res.token);
    setUserState(res.user);
  };

  const signUp = async (email: string, password: string, full_name: string) => {
    const res = await api.post<{ token: string; user: User }>("/auth/register", {
      email,
      password,
      full_name,
    });
    await storage.secureSet(TOKEN_KEY, res.token);
    setUserState(res.user);
  };

  const signOut = async () => {
    await storage.secureRemove(TOKEN_KEY);
    setUserState(null);
  };

  const refreshUser = async () => {
    try {
      const me = await api.get<User>("/auth/me");
      setUserState(me);
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, refreshUser, setUser: setUserState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
