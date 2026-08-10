/**
 * The query key factory.
 *
 * Invalidation is never a guessed string. Every hook reads its key from here,
 * so renaming one is a compile error rather than a cache that silently stops
 * updating.
 */

export const qk = {
  auth: {
    identity: ["auth", "identity"] as const,
    me: ["auth", "me"] as const,
    sessions: ["auth", "sessions"] as const,
  },
  catalog: {
    models: (filters?: Record<string, unknown>) => ["catalog", "models", filters ?? {}] as const,
    tools: (filters?: Record<string, unknown>) => ["catalog", "tools", filters ?? {}] as const,
    gpus: (filters?: Record<string, unknown>) => ["catalog", "gpus", filters ?? {}] as const,
    // Sorted, so `[a, b]` and `[b, a]` share one cache entry — the backend
    // returns the same answer for both.
    compatibility: (slugs: string[]) => ["catalog", "compatibility", [...slugs].sort()] as const,
    architectures: () => ["catalog", "architectures"] as const,
    graveyard: () => ["catalog", "graveyard"] as const,
    stats: () => ["catalog", "stats"] as const,
  },
  compare: {
    meta: () => ["compare", "meta"] as const,
  },
  runs: {
    list: (filters?: Record<string, unknown>) => ["runs", "list", filters ?? {}] as const,
    detail: (id: string) => ["runs", "detail", id] as const,
    quota: () => ["runs", "quota"] as const,
    /** A completed run is seeded here so a share or save is instant. */
    result: (id: string) => ["runs", "result", id] as const,
  },
  workspace: {
    dashboard: () => ["workspace", "dashboard"] as const,
    projects: () => ["workspace", "projects"] as const,
    project: (id: string) => ["workspace", "project", id] as const,
    items: (id: string) => ["workspace", "project", id, "items"] as const,
    session: (id: string) => ["workspace", "project", id, "session"] as const,
    search: (query: string) => ["workspace", "search", query] as const,
  },
} as const;
