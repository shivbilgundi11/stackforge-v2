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
  // Filled in by later modules.
  catalog: {
    models: (filters?: Record<string, unknown>) => ["catalog", "models", filters ?? {}] as const,
    tools: (filters?: Record<string, unknown>) => ["catalog", "tools", filters ?? {}] as const,
  },
  runs: {
    list: (filters?: Record<string, unknown>) => ["runs", filters ?? {}] as const,
    detail: (id: string) => ["runs", id] as const,
  },
} as const;
