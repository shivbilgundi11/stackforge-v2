/**
 * The error taxonomy, mirrored from the backend.
 *
 * Components handle success. Failure is handled here, in one place — a
 * `try/catch` around an API call inside a component is how a quota rejection
 * becomes a red toast instead of an upgrade prompt.
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "TOKEN_EXPIRED"
  | "TOKEN_INVALID"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_LOCKED"
  | "FORBIDDEN"
  | "PLAN_REQUIRED"
  | "QUOTA_EXCEEDED"
  | "SEATS_EXCEEDED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR"
  | "HTTP_ERROR"
  | "NETWORK_ERROR";

export type FieldError = { path: string; message: string };

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;
  readonly requestId: string | undefined;

  constructor(args: {
    code: ApiErrorCode;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    requestId?: string;
  }) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code;
    this.status = args.status;
    this.details = args.details;
    this.requestId = args.requestId;
  }

  /** 422 field errors, ready for `setError` on a React Hook Form. */
  get fieldErrors(): FieldError[] {
    const fields = this.details?.["fields"];
    return Array.isArray(fields) ? (fields as FieldError[]) : [];
  }

  get retryAfter(): number | undefined {
    const value = this.details?.["retry_after"];
    return typeof value === "number" ? value : undefined;
  }

  get requiredPlan(): string | undefined {
    const value = this.details?.["required_plan"];
    return typeof value === "string" ? value : undefined;
  }

  get lockedUntil(): string | undefined {
    const value = this.details?.["locked_until"];
    return typeof value === "string" ? value : undefined;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function hasCode(error: unknown, ...codes: ApiErrorCode[]): boolean {
  return isApiError(error) && codes.includes(error.code);
}

/**
 * Codes the caller is expected to render inline rather than as a toast.
 * Everything else falls through to the global handler.
 */
export const INLINE_CODES: ReadonlySet<ApiErrorCode> = new Set([
  "VALIDATION_ERROR",
  "INVALID_CREDENTIALS",
  "CONFLICT",
  "ACCOUNT_LOCKED",
]);
