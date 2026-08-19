"use client";

import { useId, useState } from "react";
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled input with its error wired to `aria-describedby`.
 *
 * Every form field in the app goes through this — it is the cheapest way to
 * keep "errors are announced" true across the whole product rather than on the
 * pages someone remembered.
 *
 * A `type="password"` field gets a reveal toggle for the same reason: doing it
 * here means every password box in the product has one, including the three in
 * settings that nobody would think to revisit.
 */
export function FormField({
  label,
  error,
  hint,
  className,
  type,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  // Only the rendered type changes. `type` stays "password" in the props so
  // the caller's `autoComplete` and the browser's password manager keep
  // treating the field as one while it is revealed.
  const inputType = isPassword && revealed ? "text" : type;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[12.5px] font-medium text-fg">
        {label}
      </Label>

      <div className={cn(isPassword && "relative")}>
        <Input
          id={id}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(error && errorId, hint && hintId) || undefined}
          className={cn(
            "h-9 border-line bg-surface text-[13.5px] text-fg placeholder:text-fg-subtle",
            error && "border-danger focus-visible:ring-danger/30",
            // Room for the button, so a long value never runs under it.
            isPassword && "pr-9",
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            // Not in the tab order. Tabbing from a password field should reach
            // the submit button, not a decoration between them — and the
            // control is still reachable by screen readers and by pointer.
            tabIndex={-1}
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className={cn(
              "absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md",
              "text-fg-subtle transition-colors hover:text-fg",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            )}
          >
            {revealed ? (
              <EyeOffIcon className="size-4" aria-hidden />
            ) : (
              <EyeIcon className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {hint && !error ? (
        <p id={hintId} className="text-[11.5px] text-fg-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1 text-[11.5px] text-danger">
          <AlertCircleIcon className="mt-px size-3 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-sm border border-danger-line bg-danger-quiet px-3 py-2 text-[12.5px] text-danger"
    >
      <AlertCircleIcon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
