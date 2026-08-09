"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, MailCheckIcon } from "lucide-react";

import { AuthShell } from "@/components/features/auth/auth-shell";
import { FormError, FormField } from "@/components/features/auth/form-field";
import { useFormErrors } from "@/components/features/auth/use-form-errors";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/auth/schemas";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const { formError, clearFormError, handleError } = useFormErrors<ForgotPasswordValues>(setError);

  const onSubmit = handleSubmit(async (values) => {
    clearFormError();
    setSubmitting(true);
    try {
      await authApi.forgotPassword(values);
      // Always the same outcome. Whether the address exists is not something
      // this page will tell anyone.
      setSent(true);
    } catch (error) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  });

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-ember-quiet text-ember">
            <MailCheckIcon className="size-5" />
          </span>
          <p className="text-[13px] leading-relaxed text-pretty text-fg-muted">
            If an account exists for that address, a reset link is on its way. It expires in 30
            minutes and can be used once.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      description="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="font-medium text-ember hover:text-ember-hover">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button
          type="submit"
          disabled={submitting}
          className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
        >
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
