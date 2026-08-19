"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LogOutIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { FormField } from "@/components/features/auth/form-field";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/forge/panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type User } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/auth/schemas";
import { useAuth } from "@/lib/auth/auth-provider";

type Values = ChangePasswordValues;

export function SecuritySection({ user }: { user: User }) {
  const form = useForm<Values>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      }),
    onSuccess: (result) => {
      form.reset();
      toast.success(result.message);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        for (const field of error.fieldErrors) {
          form.setError(field.path as keyof Values, { message: field.message });
        }
        return;
      }
      // A wrong current password is the common case and belongs on the field
      // it refers to, not in a toast the user has to map back themselves.
      form.setError("current_password", {
        message: error instanceof ApiError ? error.message : "Could not change your password.",
      });
    },
  });

  return (
    <Panel>
      <PanelHeader
        title="Security"
        description={
          user.must_set_password
            ? "You signed up with a provider, so there is no password on this account yet."
            : "Changing your password signs out every other device."
        }
      />

      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <PanelBody className="flex flex-col gap-4">
          {!user.must_set_password ? (
            <FormField
              label="Current password"
              type="password"
              autoComplete="current-password"
              error={form.formState.errors.current_password?.message}
              {...form.register("current_password")}
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="8+ characters, with uppercase, lowercase, number, and symbol."
              error={form.formState.errors.new_password?.message}
              {...form.register("new_password")}
            />
            <FormField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={form.formState.errors.confirm?.message}
              {...form.register("confirm")}
            />
          </div>
        </PanelBody>

        <PanelFooter>
          <SignOutEverywhere />
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending ? "Changing…" : "Change password"}
          </Button>
        </PanelFooter>
      </form>
    </Panel>
  );
}

function SignOutEverywhere() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: () => {
      toast.success("Signed out everywhere.");
      router.push("/login");
    },
    onError: () => toast.error("Could not sign out the other sessions."),
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <LogOutIcon className="size-3.5" aria-hidden />
      Sign out everywhere
    </Button>
  );
}

/**
 * Deleting an account is irreversible and sits behind a typed confirmation.
 *
 * A second "are you sure" dialog is dismissed reflexively; typing the word is
 * the smallest thing that requires actually reading the sentence.
 */
export function DangerSection({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const { signOut } = useAuth();

  const mutation = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: async () => {
      toast.success("Account scheduled for deletion.");
      await signOut();
    },
    onError: () => toast.error("Could not delete the account."),
  });

  const confirmed = typed.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <Panel className="border-danger-line">
      <PanelHeader
        title="Delete account"
        description="Your projects, saved runs, and stacks go with it."
        icon={<TriangleAlertIcon className="size-3.5 text-danger" aria-hidden />}
      />

      <PanelBody className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-md text-[13px] leading-relaxed text-fg-muted">
          The account is scheduled for deletion and signed out immediately. Anonymous runs made
          before you signed up are not linked to it and are unaffected.
        </p>
        <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </PanelBody>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setTyped("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type your email address to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-email" className="text-[12.5px] font-medium text-fg">
              {user.email}
            </Label>
            <Input
              id="confirm-email"
              value={typed}
              autoComplete="off"
              placeholder="Type your email"
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!confirmed || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
