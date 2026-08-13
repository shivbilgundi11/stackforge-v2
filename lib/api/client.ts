import { ApiError, type ApiErrorCode } from "@/lib/api/errors";
import { tokenStore } from "@/lib/auth/token-store";
import { orgStore } from "@/lib/team/org-store";

const BASE_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:8000";

type Json = Record<string, unknown>;

type Envelope<T> = {
  success: boolean;
  data?: T | null;
  error?: { code: string; message: string; details?: Json | null } | null;
  meta?: { request_id?: string } | null;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip the refresh-and-replay dance. Set on the auth endpoints themselves,
   *  which would otherwise recurse. */
  skipAuthRetry?: boolean;
  formData?: FormData;
};

// ── Single-flight refresh ───────────────────────────────────────────────────
//
// The most common way a rotating-refresh implementation fails in production:
// N parallel requests each hit a 401, each fires its own /refresh, and the
// server's reuse detection correctly reads the second rotation as token theft
// and revokes the whole family. Concurrent callers must await one promise.

let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) return false;

      const payload = (await response.json()) as Envelope<{
        tokens: { access_token: string; expires_in: number };
      }>;
      const tokens = payload.data?.tokens;
      if (!tokens) return false;

      tokenStore.set(tokens.access_token, tokens.expires_in);
      return true;
    } catch {
      return false;
    } finally {
      // Cleared in a microtask so callers that awaited this exact promise all
      // observe the same result before a new attempt can start.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();

  return refreshInFlight;
}

// ── The client ──────────────────────────────────────────────────────────────

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parse<T>(response: Response): Promise<T> {
  const requestId = response.headers.get("X-Request-ID") ?? undefined;

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    // A body that is not JSON means something upstream of the app answered —
    // a proxy, a gateway, or a crash before the handlers ran.
    throw new ApiError({
      code: response.ok ? "INTERNAL_ERROR" : "HTTP_ERROR",
      message: `Unexpected response from the server (${response.status}).`,
      status: response.status,
      requestId,
    });
  }

  if (!response.ok || payload.success === false) {
    throw new ApiError({
      code: (payload.error?.code ?? "HTTP_ERROR") as ApiErrorCode,
      message: payload.error?.message ?? "Something went wrong.",
      status: response.status,
      details: payload.error?.details ?? undefined,
      requestId,
    });
  }

  // The envelope is a transport concern. Call sites work with `data`.
  return payload.data as T;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, skipAuthRetry = false, formData } = options;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    const token = tokenStore.get();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // The acting organization (M21). The switcher scopes every request from
    // here, which is what makes "switch team" mean something.
    const orgId = orgStore.get();
    if (orgId) headers["X-Organization-Id"] = orgId;
    if (!formData && body !== undefined) headers["Content-Type"] = "application/json";

    return fetch(buildUrl(path, query), {
      method,
      headers,
      credentials: "include", // carries the refresh and anonymous cookies
      signal,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  };

  let response: Response;
  try {
    response = await send();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection.",
      status: 0,
    });
  }

  // Exactly one replay. A retry loop against a dead session is how a browser
  // tab ends up hammering /refresh.
  if (response.status === 401 && !skipAuthRetry) {
    const cloned = response.clone();
    let code: string | undefined;
    try {
      code = ((await cloned.json()) as Envelope<never>).error?.code;
    } catch {
      code = undefined;
    }

    if (code === "TOKEN_EXPIRED" || code === "TOKEN_INVALID") {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          response = await send();
        } catch {
          throw new ApiError({
            code: "NETWORK_ERROR",
            message: "Could not reach the server. Check your connection.",
            status: 0,
          });
        }
      } else {
        tokenStore.clear();
      }
    }
  }

  return parse<T>(response);
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...options, method: "DELETE" }),
};
