"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";

import { AuthShell } from "@/components/features/auth/auth-shell";
import { FormError, FormField } from "@/components/features/auth/form-field";
import { useFormErrors } from "@/components/features/auth/use-form-errors";
import { notify } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/auth/schemas";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const { formError, setFormError, clearFormError, handleError } =
    useFormErrors<ResetPasswordValues>(setError);

  const onSubmit = handleSubmit(async (values) => {
    clearFormError();
    if (!token) {
      setFormError("This reset link is missing its token. Request a new one.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword({ token, password: values.password });
      notify.success("Password reset. Sign in with your new password.");
      router.push("/login");
    } catch (error) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  });

  if (!token) {
    return (
      <AuthShell title="Link not valid">
        <div className="flex flex-col gap-3 py-2 text-center">
          <p className="text-[13px] leading-relaxed text-fg-muted">
            This reset link is incomplete. Request a fresh one — links expire after 30 minutes.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" description="Resetting signs you out on every device.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />

        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          hint="8+ characters, with uppercase, lowercase, number, and symbol."
          {...register("password")}
        />

        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register("confirm")}
        />

        <Button
          type="submit"
          disabled={submitting}
          className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
        >
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Reset password
        </Button>
      </form>
    </AuthShell>
  );
}
