import { z } from "zod";

/**
 * Client-side validation.
 *
 * Advisory only — the server enforces the real policy, including the breach
 * check and the deny-list. These exist so a user gets feedback without a round
 * trip, and the messages are worded to match what the server would say.
 */

const email = z.email("Enter a valid email address.").max(254);

const password = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(256, "Use at most 256 characters.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email,
  password,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: password,
    confirm: z.string(),
  })
  .refine((values) => values.new_password === values.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/**
 * Rough strength signal for the meter. Not a security control — the server
 * decides. It exists to nudge before submission.
 */
export function passwordStrength(value: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!value) return { score: 0, label: "" };

  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;

  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return {
    score: clamped,
    label: ["Too short", "Weak", "Fair", "Good", "Strong"][clamped] ?? "",
  };
}

/**
 * `?next=` is attacker-controllable. Only same-origin relative paths are
 * honoured — anything else is an open redirect.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
