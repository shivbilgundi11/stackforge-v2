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
  exports: {
    /** Keyed by source, because the tray is per result — and because the lock
     *  states inside depend on the plan, which changes on upgrade. */
    options: (sourceType: string, sourceId: string) =>
      ["exports", "options", sourceType, sourceId] as const,
    list: () => ["exports", "list"] as const,
    detail: (id: string) => ["exports", "detail", id] as const,
  },
  shares: {
    list: (includeRevoked: boolean) => ["shares", "list", includeRevoked] as const,
  },
  billing: {
    /** The whole namespace. Invalidated after an upgrade lands, where every
     *  cached answer below it — plan, limits, meters — is now wrong at once. */
    all: () => ["billing"] as const,
    /** Mostly public: prices and copy change with a deploy, not with a
     *  session. `current` does not — it marks the caller's own plan, so the
     *  reply is keyed by identity like `usage` below. Called with no argument
     *  it returns the prefix, which still matches every identity. */
    plans: (identity?: string) =>
      identity ? (["billing", "plans", identity] as const) : (["billing", "plans"] as const),
    subscription: () => ["billing", "subscription"] as const,
    /** Invalidated after every run, so the meter moves as the user works.
     *
     *  Keyed by caller identity. A request that goes out before the access
     *  token exists is answered for a caller the API cannot identify, and
     *  without the identity in the key that answer is cached against the
     *  signed-in user — the sidebar then claims the wrong plan until it goes
     *  stale. Called with no argument it returns the prefix, which still
     *  matches every identity for invalidation. */
    usage: (identity?: string) =>
      identity ? (["billing", "usage", identity] as const) : (["billing", "usage"] as const),
    invoices: () => ["billing", "invoices"] as const,
  },
  templates: {
    library: () => ["templates", "library"] as const,
    facets: () => ["templates", "facets"] as const,
    list: (filters: Record<string, unknown>) => ["templates", "list", filters] as const,
    detail: (slug: string) => ["templates", "detail", slug] as const,
  },
  team: {
    orgs: () => ["team", "orgs"] as const,
    org: (id: string) => ["team", "org", id] as const,
    members: (id: string) => ["team", "org", id, "members"] as const,
    invitations: (id: string) => ["team", "org", id, "invitations"] as const,
    /** The public accept page, keyed by token. */
    invitePreview: (token: string) => ["team", "invite", token] as const,
    /** The acting organization's shared work. */
    sharedStacks: (id: string) => ["team", "org", id, "stacks"] as const,
    comments: (resourceType: string, resourceId: string) =>
      ["team", "comments", resourceType, resourceId] as const,
    approvals: (resourceType: string, resourceId: string) =>
      ["team", "approvals", resourceType, resourceId] as const,
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
