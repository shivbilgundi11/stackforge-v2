/**
 * The acting organization (M21), in a module closure like the access token.
 *
 * The API client reads this on every request to attach `X-Organization-Id` —
 * it cannot use React context, and the org switcher must scope every
 * subsequent request, not only the ones made through hooks. `null` means
 * personal scope: no header, exactly the requests the app made before M21.
 *
 * The id is mirrored into a cookie so a reload starts in the same scope.
 * It is an id, not a credential — the server resolves membership on every
 * request and 404s an org the user is not in.
 */

const COOKIE = "sf_org";
const YEAR = 60 * 60 * 24 * 365;

let currentOrgId: string | null = null;
const listeners = new Set<() => void>();

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

let hydrated = false;

export const orgStore = {
  get(): string | null {
    if (!hydrated) {
      currentOrgId = readCookie();
      hydrated = true;
    }
    return currentOrgId;
  },

  set(orgId: string | null) {
    hydrated = true;
    if (orgId === currentOrgId) return;
    currentOrgId = orgId;
    if (typeof document !== "undefined") {
      document.cookie = orgId
        ? `${COOKIE}=${encodeURIComponent(orgId)}; path=/; max-age=${YEAR}; samesite=lax`
        : `${COOKIE}=; path=/; max-age=0`;
    }
    for (const listener of listeners) listener();
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
