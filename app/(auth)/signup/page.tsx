"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon, MailCheckIcon } from "lucide-react";

import { AuthShell } from "@/components/features/auth/auth-shell";
import { FormError, FormField } from "@/components/features/auth/form-field";
import { useFormErrors } from "@/components/features/auth/use-form-errors";
import { IntervalChoice, PlanChoice } from "@/components/features/billing/plan-choice";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth";
import { formatPrice, type Interval, type ChoosablePlanKey } from "@/lib/api/billing";
import { usePlans } from "@/lib/api/hooks";
import { passwordStrength, signupSchema, type SignupValues } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  // useSearchParams must sit under Suspense so the static shell can prerender.
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

/**
 * Which half of signup is on screen.
 *
 * Plan first, details second. The alternative — collect the account, then ask
 * what they want — creates an account for someone who then decides the price
 * is wrong, and the row is left behind either way. Asking first also means the
 * pricing page's CTA lands on a form that already agrees with the button that
 * was clicked.
 */
type Step = "plan" | "account";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Signup-from-invite (M21): the invite page hands over the token and the
  // invited address. The email field locks to it — the server refuses a
  // mismatch anyway, but a field the user can edit into an error is worse
  // than one that says why it is fixed.
  const inviteToken = params.get("invite");
  const invitedEmail = inviteToken ? params.get("email") : null;

  // An invitee is taking a seat the inviting organization already pays for, so
  // there is no plan to choose and the server ignores the field on that path.
  // Sending them through a pricing step would ask them to buy what they have
  // just been given.
  const [step, setStep] = useState<Step>(inviteToken ? "account" : "plan");
  const [plan, setPlan] = useState<ChoosablePlanKey>(readPlanParam(params.get("plan")));
  const [interval, setInterval] = useState<Interval>(
    params.get("interval") === "annual" ? "annual" : "monthly",
  );

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const plans = usePlans();
  const saving = (plans.data ?? []).find((row) => row.annual_saving_cents > 0);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: invitedEmail ?? "", password: "" },
  });

  const { formError, clearFormError, handleError } = useFormErrors<SignupValues>(setError);
  // useWatch, not watch(): the React Compiler cannot memoize the function
  // watch() returns, and this subscribes to one field instead of all.
  const password = useWatch({ control, name: "password" });
  const strength = passwordStrength(password ?? "");

  const paid = plan !== "free" && !inviteToken;

  const onSubmit = handleSubmit(async (values) => {
    clearFormError();
    setSubmitting(true);
    try {
      // `plan` rides along on the invite path too, always as Free. The server
      // ignores it there — an invitee takes a seat somebody else has paid for
      // — and sending it unconditionally keeps one call site instead of two
      // that can drift.
      await authApi.register({
        ...values,
        plan: inviteToken ? "free" : plan,
        interval,
        ...(inviteToken ? { invite_token: inviteToken } : {}),
      });
      if (inviteToken) {
        // The invite already proved the inbox, so there is no verification
        // round-trip — straight to sign-in and back to the accept page.
        router.push(`/login?next=${encodeURIComponent(`/invite?token=${inviteToken}`)}`);
        return;
      }
      if (paid) {
        // A chosen plan is recorded as owed, and the wall is where it gets
        // paid. Verification is not in the way of that: the address is proven
        // by the card, and holding a paying customer at an email link is the
        // easiest way to lose one. They still get the verification mail.
        router.push(`/login?next=${encodeURIComponent("/checkout")}`);
        return;
      }
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

  if (step === "plan") {
    return (
      <AuthShell
        wide
        title="Choose a plan"
        description="Start free, or take a trial of a paid plan — no card until the trial ends. You can change this at any time."
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ember hover:text-ember-hover">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <IntervalChoice
            interval={interval}
            onChange={setInterval}
            savingLabel={
              saving
                ? `save ${formatPrice(saving.annual_saving_cents, saving.currency)}`
                : undefined
            }
          />

          <PlanChoice
            plans={plans.data ?? []}
            loading={plans.isLoading}
            value={plan}
            onChange={setPlan}
            interval={interval}
          />

          <Button
            type="button"
            onClick={() => setStep("account")}
            className="h-9 w-full bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
          >
            Continue <ArrowRightIcon className="size-3.5" aria-hidden />
          </Button>

          <p className="text-center text-[11.5px] text-fg-subtle">
            Want the full comparison?{" "}
            <Link href="/pricing" className="underline hover:text-fg-muted">
              See every plan side by side
            </Link>
            .
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={inviteToken ? "Join your team" : "Create an account"}
      description={
        inviteToken
          ? "Create your account to accept the invitation."
          : "Save your work, export artifacts, and keep a project history."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={
              inviteToken
                ? `/login?next=${encodeURIComponent(`/invite?token=${inviteToken}`)}`
                : "/login"
            }
            className="font-medium text-ember hover:text-ember-hover"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormError message={formError} />

        {inviteToken ? null : <ChosenPlan plan={plan} onChange={() => setStep("plan")} />}

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
          readOnly={invitedEmail !== null}
          hint={invitedEmail !== null ? "Locked to the invited address." : undefined}
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
          {inviteToken
            ? "Create account and continue"
            : paid
              ? "Create account and continue to payment"
              : "Create account"}
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

/**
 * What was picked on the previous step, and the way back to it.
 *
 * A two-step form that does not show step one's answer on step two makes the
 * reader either remember it or guess — and the answer here is what they are
 * about to be charged.
 */
function ChosenPlan({ plan, onChange }: { plan: ChoosablePlanKey; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2 px-3 py-2">
      <span className="text-[12.5px] text-fg-muted">
        Plan: <span className="font-medium text-fg capitalize">{plan}</span>
      </span>
      <button
        type="button"
        onClick={onChange}
        className="flex items-center gap-1 text-[12px] font-medium text-ember hover:text-ember-hover"
      >
        <ArrowLeftIcon className="size-3" aria-hidden />
        Change
      </button>
    </div>
  );
}

/** Only the plans the form can actually sell. Anything else — a stale link, a
 *  hand-typed `?plan=enterprise` — falls back to Free rather than to a step
 *  that cannot be completed. */
function readPlanParam(value: string | null): ChoosablePlanKey {
  return value === "pro" || value === "team" ? value : "free";
}
