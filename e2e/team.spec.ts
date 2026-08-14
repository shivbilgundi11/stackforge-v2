import { execSync } from "node:child_process";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { E2E_PASSWORD, signUpAndIn, uniqueEmail } from "./helpers";

/**
 * M21 — teams, against the real backend.
 *
 * One long journey, because the thing worth proving end to end is the
 * *sequence*: an owner builds a team, an invitee who has never had an account
 * joins through the signup-from-invite path (the highest-value and most often
 * broken of the three acceptance paths), and the two of them collaborate on a
 * shared project — comment, approval, decision.
 *
 * Two backend CLI commands stand in for what a browser cannot do: `set-plan`
 * (reaching the Team tier without authorizing a mandate on Razorpay's hosted
 * page, which a browser test has no business driving — the plan-choice and
 * payment-wall halves live in `checkout.spec.ts`) and `invite-link` (the token
 * lives only in an email; the CLI rotates it and prints the link, exactly like
 * an operator handling "the invite never arrived").
 */

const BACKEND_DIR = path.resolve(__dirname, "..", "..", "backend");

function cli(command: string): string {
  return execSync(`uv run python -m app.cli ${command}`, {
    cwd: BACKEND_DIR,
    encoding: "utf-8",
  }).trim();
}

test("a team forms, grows by invitation, and reviews shared work", async ({ page, browser }) => {
  test.setTimeout(240_000);

  const ownerEmail = uniqueEmail("team-owner", true);
  const memberEmail = uniqueEmail("team-member", true);
  const orgName = `E2E Guild ${test.info().workerIndex}`;

  // ── The owner builds the team ─────────────────────────────────────────────
  await signUpAndIn(page, ownerEmail, { name: "Olive Owner" });
  cli(`set-plan ${ownerEmail} team`);

  await page.goto("/team");
  await page.getByLabel("Organization name").fill(orgName);
  await page.getByRole("button", { name: /create team/i }).click();
  await page.waitForURL(/\/team\/invitations/);

  await page.getByLabel("Email address").fill(memberEmail);
  await page.getByRole("button", { name: /send invite/i }).click();
  // Exact, because the confirmation toast also carries the address.
  await expect(page.getByText(memberEmail, { exact: true })).toBeVisible();

  const inviteLink = cli(`invite-link ${memberEmail}`);
  const token = inviteLink.match(/token=([\w~.-]+)/)?.[1];
  expect(token, `no token in: ${inviteLink}`).toBeTruthy();

  // ── The invitee joins in a second browser context, via signup ─────────────
  const inviteeContext = await browser.newContext();
  try {
    const invitee = await inviteeContext.newPage();

    await invitee.goto(`/invite?token=${token}`);
    await expect(invitee.getByRole("heading", { name: `Join ${orgName}` })).toBeVisible();

    await invitee.getByRole("link", { name: /create an account/i }).click();
    await invitee.waitForURL(/\/signup\?invite=/);

    // The email is prefilled from the invitation and locked.
    const emailField = invitee.getByLabel("Email");
    await expect(emailField).toHaveValue(memberEmail);
    await expect(emailField).toHaveAttribute("readonly", "");

    await invitee.getByLabel("Name").fill("Ivy Invitee");
    await invitee.getByLabel("Password", { exact: false }).fill(E2E_PASSWORD);
    await invitee.getByRole("button", { name: /create account and continue/i }).click();

    // No "check your email" — the invite proved the inbox. Straight to login,
    // with `next` carrying them back to the accept page.
    await invitee.waitForURL(/\/login\?next=/);
    await invitee.getByLabel("Email").fill(memberEmail);
    await invitee.getByLabel("Password", { exact: false }).fill(E2E_PASSWORD);
    await invitee.getByRole("button", { name: /sign in|log in/i }).click();

    await invitee.waitForURL(/\/invite\?token=/);
    await invitee.getByRole("button", { name: `Join ${orgName}` }).click();
    await invitee.waitForURL(/\/team/);
    await expect(invitee.getByText("Olive Owner")).toBeVisible();
    await expect(invitee.getByText("Ivy Invitee")).toBeVisible();

    // ── The owner shares a project with the team ────────────────────────────
    await page.goto("/projects");
    await page.getByLabel("Project name").fill("Guild RAG Rollout");
    await page.getByRole("button", { name: /^create$/i }).click();
    await page.getByRole("link", { name: "Guild RAG Rollout" }).click();
    await page.waitForURL(/\/projects\//);
    const projectUrl = new URL(page.url()).pathname;

    await page.getByRole("button", { name: /share with team/i }).click();
    await expect(page.getByText("team", { exact: true })).toBeVisible();

    // ── The member comments and asks for approval ───────────────────────────
    await invitee.goto(projectUrl);
    await expect(invitee.getByText("Guild RAG Rollout")).toBeVisible();

    await invitee.getByLabel("Comment").fill("Costs look right — ready for sign-off?");
    await invitee.getByRole("button", { name: /^comment$/i }).click();
    await expect(invitee.getByText("Costs look right — ready for sign-off?")).toBeVisible();

    await invitee.getByRole("button", { name: /request approval/i }).click();
    await expect(invitee.getByText("pending", { exact: true })).toBeVisible();

    // ── The owner sees both and signs off ───────────────────────────────────
    await page.goto(projectUrl);
    await expect(page.getByText("Costs look right — ready for sign-off?")).toBeVisible();
    await expect(page.getByText(/requested by ivy invitee/i)).toBeVisible();

    await page.getByLabel("Decision note").fill("Budget confirmed.");
    await page.getByRole("button", { name: /^approve$/i }).click();
    await expect(page.getByText("approved", { exact: true })).toBeVisible();

    // The member sees the decision, note and all.
    await invitee.reload();
    await expect(invitee.getByText("approved", { exact: true })).toBeVisible();
    await expect(invitee.getByText(/budget confirmed/i)).toBeVisible();
  } finally {
    await inviteeContext.close();
  }
});

test("the org switcher appears only for members and scopes the team pages", async ({ page }) => {
  const soloEmail = uniqueEmail("solo", true);
  await signUpAndIn(page, soloEmail, { name: "Solo Sam" });

  // Both assertions on one page load, deliberately. Each full navigation
  // bootstraps its own token refresh, and refresh rotates; two of them racing
  // straight after a login is read as token reuse and revokes the family,
  // which lands on the login page for reasons that have nothing to do with
  // teams.
  await page.goto("/team");

  // A user in no organization never sees a switcher that would only ever say
  // "Personal".
  await expect(page.getByRole("button", { name: /switch workspace scope/i })).toBeHidden();

  // And the team page offers the create flow rather than an empty shell.
  await expect(
    page.getByText(/start a team|name your organization|team plan/i).first(),
  ).toBeVisible();
});
