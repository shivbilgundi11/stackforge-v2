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
import { readPlanParam } from "@/lib/api/billing";
import { useAuth } from "@/lib/auth/auth-provider";
import { loginSchema, safeNextPath, type LoginValues } from "@/lib/auth/schemas";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { formError, clearFormError, handleError } = useFormErrors<LoginValues>(setError);

  /**
   * "Create one", carrying where they were going.
   *
   * Someone sent here by a plan card on the marketing site arrives at
   * `/login?next=/upgrade?plan=pro`. If they turn out not to have an account,
   * a bare `/signup` link threw away both the destination and the plan, and
   * they finished signing up on the dashboard with no sign of the thing they
   * had clicked. The plan rides across as `?plan=` too, so the signup form's
   * own plan step opens on the one they picked.
   */
  const next = params.get("next");
  const signupHref = (() => {
    if (!next) return "/signup";
    const query = new URLSearchParams({ next: safeNextPath(next) });
    // `next` is a path with its own query string, so its `plan` is read out of
    // that rather than off this page's params.
    const plan = readPlanParam(new URLSearchParams(next.split("?")[1] ?? "").get("plan"));
    if (plan) query.set("plan", plan);
    return `/signup?${query}`;
  })();

  const onSubmit = handleSubmit(async (values) => {
    clearFormError();
    setSubmitting(true);
    try {
      const user = await signIn(values.email, values.password);
      notify.success(`Welcome back, ${user.name.split(" ")[0]}.`);
      router.push(safeNextPath(params.get("next")));
    } catch (error) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthShell
      title="Sign in"
      description="Pick up where you left off."
      footer={
        <>
          No account?{" "}
          <Link href={signupHref} className="font-medium text-ember hover:text-ember-hover">
            Create one
          </Link>
        </>
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

        <div className="flex flex-col gap-1.5">
          <FormField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Link
            href="/forgot-password"
            className="self-end text-[11.5px] text-fg-muted hover:text-fg"
          >
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
        >
          {submitting ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
