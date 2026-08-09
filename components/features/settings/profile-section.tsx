"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2Icon, MailIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { FormField } from "@/components/features/auth/form-field";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/forge/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authApi, type User } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-provider";

const schema = z.object({
  name: z.string("Enter your name.").trim().min(1, "Enter your name.").max(120),
  timezone: z.string().min(1),
});

type Values = z.infer<typeof schema>;

/**
 * Timezones from the platform, not a hardcoded list.
 *
 * A bundled list is wrong the next time a country changes its rules, and it is
 * a few kilobytes to ship something the browser already knows.
 */
function timezones(): string[] {
  const supported = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;

  if (typeof supported === "function") return supported("timeZone");
  return [Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC"];
}

export function ProfileSection({ user }: { user: User }) {
  const { refreshUser } = useAuth();
  const zones = timezones();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, timezone: user.timezone },
  });

  const mutation = useMutation({
    mutationFn: (values: Values) => authApi.updateProfile(values),
    onSuccess: async (updated) => {
      // Reset to what the server returned, not to what was submitted. The
      // server trims and normalises, and a form still holding the untrimmed
      // value reports itself dirty forever.
      form.reset({ name: updated.name, timezone: updated.timezone });
      await refreshUser();
      toast.success("Profile updated.");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        for (const field of error.fieldErrors) {
          form.setError(field.path as keyof Values, { message: field.message });
        }
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Could not save your profile.");
    },
  });

  return (
    <Panel>
      <PanelHeader title="Profile" description="How you appear across the workspace." />

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <PanelBody className="flex flex-col gap-4">
          <FormField
            label="Name"
            autoComplete="name"
            error={form.formState.errors.name?.message}
            {...form.register("name")}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timezone" className="text-[12.5px] font-medium text-fg">
              Timezone
            </Label>
            {/* Controller rather than `watch` + `setValue`: `watch` returns a
                fresh function identity on every render, which makes the React
                Compiler skip memoising this whole component. */}
            <Controller
              name="timezone"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="timezone" className="w-full">
                    <SelectValue placeholder="Select a timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {zones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-fg-muted">
              Used for run timestamps and the daily quota reset.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-medium text-fg">Email</Label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-inset px-3 py-2">
              <MailIcon className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
              <span className="min-w-0 truncate text-[13px] text-fg">{user.email}</span>
              {user.email_verified ? (
                <Badge variant="outline" className="ml-auto border-success-line text-success">
                  <CheckCircle2Icon className="size-3" aria-hidden />
                  Verified
                </Badge>
              ) : (
                <ResendVerification />
              )}
            </div>
            <p className="text-xs text-fg-muted">
              Changing the address on an account is not supported yet — it needs re-verification on
              both addresses to be safe, which is its own piece of work.
            </p>
          </div>
        </PanelBody>

        <PanelFooter>
          <span className="text-xs text-fg-subtle">
            {form.formState.isDirty ? "Unsaved changes" : " "}
          </span>
          <Button type="submit" size="sm" disabled={mutation.isPending || !form.formState.isDirty}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </PanelFooter>
      </form>
    </Panel>
  );
}

function ResendVerification() {
  const mutation = useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess: () => toast.success("Verification email sent."),
    onError: () => toast.error("Could not send the email. Try again shortly."),
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="ml-auto h-6 text-xs"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {mutation.isPending ? "Sending…" : "Resend verification"}
    </Button>
  );
}
