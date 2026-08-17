"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { refreshAccessToken } from "@/lib/api/client";
import { authApi, type User } from "@/lib/api/auth";
import { qk } from "@/lib/api/query-keys";
import { tokenStore } from "@/lib/auth/token-store";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  anonymousId: string | null;
  isVerified: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setSession: (user: User, accessToken: string, expiresIn: number) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const LOGOUT_CHANNEL = "stackforge-auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);

  const applySession = useCallback(
    (nextUser: User, token: string, expiresIn: number) => {
      tokenStore.set(token, expiresIn);
      setUser(nextUser);
      setStatus("authenticated");
      // Plan, limits, and meters were all answered for whoever the caller was
      // a moment ago — an anonymous visitor, or the previous account. None of
      // those answers survives a change of identity.
      void queryClient.invalidateQueries({ queryKey: qk.billing.all() });
    },
    [queryClient],
  );

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("anonymous");
    queryClient.removeQueries({ queryKey: qk.auth.me });
    queryClient.removeQueries({ queryKey: qk.auth.sessions });
    // Removed rather than invalidated: a signed-out tab must not keep showing
    // the plan the account had while a refetch is in flight.
    queryClient.removeQueries({ queryKey: qk.billing.all() });
  }, [queryClient]);

  // ── Bootstrap ────────────────────────────────────────────────────────────
  // One refresh attempt on mount. The refresh cookie is HttpOnly, so its
  // presence can only be discovered by trying.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const refreshed = await refreshAccessToken();
      if (cancelled) return;

      if (refreshed) {
        try {
          const me = await authApi.me();
          if (!cancelled) {
            setUser(me);
            setStatus("authenticated");
          }
          return;
        } catch {
          tokenStore.clear();
        }
      }

      // No session. Establish an anonymous identity so quota and tool runs
      // have something to key on before the user ever signs up.
      try {
        const anon = await authApi.startAnonymous();
        if (!cancelled) setAnonymousId(anon.anonymous_id);
      } catch {
        /* anonymous identity is best-effort; the app still works without it */
      }
      if (!cancelled) setStatus("anonymous");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Proactive refresh ────────────────────────────────────────────────────
  // Refresh a minute before expiry rather than waiting for a 401. A user who
  // leaves a tab open should never see an interruption.
  useEffect(() => {
    if (status !== "authenticated") return;

    const schedule = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      const delay = Math.max(tokenStore.timeToExpiry() - 60_000, 10_000);
      refreshTimer.current = setTimeout(() => {
        void refreshAccessToken().then((okay) => {
          if (okay) schedule();
          else clearSession();
        });
      }, delay);
    };

    schedule();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [status, clearSession]);

  // ── Cross-tab logout ─────────────────────────────────────────────────────
  // Tabs do not share the in-memory access token, but they do share the
  // refresh cookie. Signing out in one must not leave another showing a shell
  // it can no longer load data into.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    channel.current = new BroadcastChannel(LOGOUT_CHANNEL);
    channel.current.onmessage = (event: MessageEvent<{ type: string }>) => {
      if (event.data?.type === "signed-out") {
        clearSession();
        router.push("/login");
      }
    };
    return () => channel.current?.close();
  }, [clearSession, router]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      applySession(result.user, result.tokens.access_token, result.tokens.expires_in);

      // Attach anything done before signing up. This is the whole reason
      // anonymous work is stored.
      if (anonymousId) {
        try {
          await authApi.claimAnonymous({ anonymous_id: anonymousId });
          setAnonymousId(null);
        } catch {
          /* a failed claim must never block a successful sign-in */
        }
      }
      return result.user;
    },
    [applySession, anonymousId],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      channel.current?.postMessage({ type: "signed-out" });
      router.push("/login");
    }
  }, [clearSession, router]);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      clearSession();
    }
  }, [clearSession]);

  return (
    <AuthContext
      value={{
        status,
        user,
        anonymousId,
        isVerified: user?.email_verified ?? false,
        signIn,
        signOut,
        refreshUser,
        setSession: applySession,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
