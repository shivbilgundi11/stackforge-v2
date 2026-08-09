"use client";

import { useId } from "react";
import { AlertCircleIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled input with its error wired to `aria-describedby`.
 *
 * Every form field in the app goes through this — it is the cheapest way to
 * keep "errors are announced" true across the whole product rather than on the
 * pages someone remembered.
 */
export function FormField({
  label,
  error,
  hint,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  hint?: React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-[12.5px] font-medium text-fg">
        {label}
      </Label>

      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(error && errorId, hint && hintId) || undefined}
        className={cn(
          "h-9 border-line bg-surface text-[13.5px] text-fg placeholder:text-fg-subtle",
          error && "border-danger focus-visible:ring-danger/30",
        )}
        {...props}
      />

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
