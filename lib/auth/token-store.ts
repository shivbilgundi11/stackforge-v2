/**
 * The access token lives here — a module closure.
 *
 * Not `localStorage`: readable by any XSS.
 * Not React state: lost on remount, and the fetch client needs it
 * synchronously without being a hook.
 *
 * The refresh token is never here at all; it is an HttpOnly cookie the JS
 * cannot read, which is the point.
 */

let accessToken: string | null = null;
let expiresAt = 0;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },

  set(token: string, expiresInSeconds: number): void {
    accessToken = token;
    expiresAt = Date.now() + expiresInSeconds * 1000;
    listeners.forEach((listener) => listener(token));
  },

  clear(): void {
    accessToken = null;
    expiresAt = 0;
    listeners.forEach((listener) => listener(null));
  },

  /** Milliseconds until expiry. Negative once expired. */
  timeToExpiry(): number {
    return expiresAt - Date.now();
  },

  /** True inside the last minute of the token's life. Drives the proactive
   *  refresh, so a request is never sent with a token about to expire. */
  isExpiring(withinMs = 60_000): boolean {
    return accessToken !== null && this.timeToExpiry() < withinMs;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
