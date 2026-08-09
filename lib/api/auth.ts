/**
 * The auth surface, typed from the generated schema.
 *
 * Every shape here is `components["schemas"][...]` — never hand-written. A
 * backend rename fails `npm run typecheck`, not a user's afternoon.
 */

import { api } from "@/lib/api/client";
import type { components } from "@/types/api";

type S = components["schemas"];

export type User = S["UserOut"];
export type AuthResult = S["AuthResult"];
export type IdentityResult = S["IdentityOut"];
export type SessionEntry = S["SessionOut"];
export type SessionList = S["SessionListOut"];
export type SimpleMessage = S["SimpleMessage"];
export type RegisterResult = S["RegisterResult"];
export type ClaimResult = S["ClaimResult"];
export type AnonymousSession = S["AnonymousSessionOut"];
export type Plan = S["Plan"];

const base = "/api/v1/auth";

export const authApi = {
  register: (body: S["RegisterRequest"]) =>
    api.post<RegisterResult>(`${base}/register`, body, { skipAuthRetry: true }),

  login: (body: S["LoginRequest"]) =>
    api.post<AuthResult>(`${base}/login`, body, { skipAuthRetry: true }),

  logout: () => api.post<SimpleMessage>(`${base}/logout`, undefined, { skipAuthRetry: true }),

  logoutAll: () => api.post<SimpleMessage>(`${base}/logout-all`),

  me: () => api.get<User>(`${base}/me`),

  /** Unauthenticated-safe. Used on first load so the app can choose between
   *  the signed-in and anonymous experience without a 401 round trip. */
  identity: () => api.get<IdentityResult>(`${base}/identity`, { skipAuthRetry: true }),

  updateProfile: (body: S["UpdateProfileRequest"]) => api.patch<User>(`${base}/profile`, body),

  changePassword: (body: S["ChangePasswordRequest"]) =>
    api.patch<SimpleMessage>(`${base}/password`, body),

  deleteAccount: () => api.delete<SimpleMessage>(`${base}/account`),

  verifyEmail: (body: S["VerifyEmailRequest"]) =>
    api.post<User>(`${base}/verify-email`, body, { skipAuthRetry: true }),

  resendVerification: () => api.post<SimpleMessage>(`${base}/verify-email/resend`),

  forgotPassword: (body: S["ForgotPasswordRequest"]) =>
    api.post<SimpleMessage>(`${base}/forgot-password`, body, { skipAuthRetry: true }),

  resetPassword: (body: S["ResetPasswordRequest"]) =>
    api.post<SimpleMessage>(`${base}/reset-password`, body, { skipAuthRetry: true }),

  listSessions: () => api.get<SessionList>(`${base}/sessions`),

  revokeSession: (sessionId: string) =>
    api.delete<SimpleMessage>(`${base}/sessions/${encodeURIComponent(sessionId)}`),

  startAnonymous: () =>
    api.post<AnonymousSession>(`${base}/anonymous`, undefined, { skipAuthRetry: true }),

  claimAnonymous: (body: S["ClaimAnonymousRequest"]) =>
    api.post<ClaimResult>(`${base}/claim`, body),
};
