"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, MailCheckIcon } from "lucide-react";

import { AuthShell } from "@/components/features/auth/auth-shell";
import { FormError, FormField } from "@/components/features/auth/form-field";
import { useFormErrors } from "@/components/features/auth/use-form-errors";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { passwordStrength, signupSchema, type SignupValues } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const { formError, clearFormError, handleError } = useFormErrors<SignupValues>(setError);
  // useWatch, not watch(): the React Compiler cannot memoize the function
  // watch() returns, and this subscribes to one field instead of all.
  const password = useWatch({ control, name: "password" });
  const strength = passwordStrength(password ?? "");

  const onSubmit = handleSubmit(async (values) => {
    clearFormError();
    setSubmitting(true);
    try {
      await authApi.register(values);
      // The response is identical whether or not the address already existed,
      // so this screen is shown either way. That is the point.
      setSentTo(values.email);
    } catch (error) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  });

  if (sentTo) {
    return (
      <AuthShell
        title="Check your email"
        description="One more step before your work can be saved."
      >
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-ember-quiet text-ember">
            <MailCheckIcon className="size-5" />
          </span>
          <p className="text-[13.5px] text-fg">
            We sent a verification link to <span className="font-medium">{sentTo}</span>.
          </p>
          <p className="text-[12.5px] leading-relaxed text-pretty text-fg-muted">
            The link is good for 24 hours. You can start using the calculators straight away —
            verification is only needed to save and export.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-1">
            <Link href="/dashboard">Go to the workbench</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create an account"
      description="Save your work, export artifacts, and keep a project history."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ember hover:text-ember-hover">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />

        <FormField
          label="Name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          error={errors.name?.message}
          {...register("name")}
        />

        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="flex flex-col gap-1.5">
          <FormField
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            hint="At least 12 characters. Checked against known breaches."
            {...register("password")}
          />

          {strength.score > 0 && !errors.password ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      step <= strength.score
                        ? strength.score <= 1
                          ? "bg-danger"
                          : strength.score === 2
                            ? "bg-warning"
                            : "bg-success"
                        : "bg-surface-3",
                    )}
                  />
                ))}
              </div>
              <span className="w-12 text-[11px] text-fg-subtle">{strength.label}</span>
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
        >
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Create account
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-fg-subtle">
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className="underline hover:text-fg-muted">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:text-fg-muted">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
