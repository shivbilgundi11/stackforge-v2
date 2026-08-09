import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { MetricStrip, MetricTile } from "@/components/forge/metric-tile";
import { ProvenanceChip } from "@/components/forge/provenance-chip";
import { BrandLockup } from "@/components/shell/brand";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS } from "@/lib/navigation";

/**
 * Intro only. The marketing site — features, pricing, docs, blog, programmatic
 * SEO — is a later module. This page exists to say what the product is and to
 * get someone into the workbench.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 backdrop-blur-md">
        <div className="absolute inset-0 -z-10 bg-bg/85" />
        <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-5">
          <BrandLockup />
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="text-fg-muted hover:text-fg">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
            >
              <Link href="/dashboard">Open workbench</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] opacity-[0.5]"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-[1120px] px-5 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] text-fg-muted">
            <span className="size-1.5 rounded-full bg-ember" aria-hidden />
            In development · building in the open
          </span>

          <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-balance text-fg">
            Plan your AI stack before you build.
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-pretty text-fg-muted">
            StackForge is an engineering workbench for costing, comparing, and designing AI systems.
            Estimate what it will actually spend, decide between the tools, and leave with the
            architecture document, the Compose file, and the numbers to justify it.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-10 bg-ember text-ember-fg shadow-none hover:bg-ember-hover"
            >
              <Link href="/dashboard">
                Open the workbench
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10">
              <Link href="/cost">Try a calculator</Link>
            </Button>
            <span className="text-[12px] text-fg-subtle">No account needed to start.</span>
          </div>

          {/* A real result rather than an abstract illustration. This audience
              trusts artifacts over claims, so the hero shows the output. */}
          <div className="mt-14">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium tracking-[0.06em] text-fg-subtle uppercase">
                Example · Claude Sonnet, 1k in / 500 out, 100 requests a day
              </span>
              <ProvenanceChip variant="computed" />
            </div>
            <MetricStrip columns={4}>
              <MetricTile label="Cost / request" value="$0.004200" emphasis />
              <MetricTile
                label="Monthly"
                value="$126.00"
                emphasis
                delta={{ value: "34%", tone: "positive", direction: "down", label: "vs GPT-4o" }}
              />
              <MetricTile label="Annual" value="$1,533.00" emphasis />
              <MetricTile
                label="Tokens / month"
                value="4.5M"
                emphasis
                footnote="tiktoken o200k_base"
              />
            </MetricStrip>
          </div>
        </div>
      </section>

      {/* What is inside */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-[1120px] px-5 py-16">
          <h2 className="font-serif text-[26px] leading-tight tracking-[-0.01em] text-fg">
            Seven groups. Twenty-eight tools.
          </h2>
          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-pretty text-fg-muted">
            Each one produces something you can export — a report, a diagram, a config file, or a
            business case. Not a number on a screen you have to copy by hand.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NAV_GROUPS.map((group) => (
              <Link
                key={group.id}
                href={group.href}
                className="group flex flex-col rounded-md border border-line bg-surface p-4 transition-colors hover:border-line-strong"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={
                      group.intelligent
                        ? "flex size-8 items-center justify-center rounded-md bg-forge-quiet text-forge"
                        : "flex size-8 items-center justify-center rounded-md bg-surface-2 text-fg-muted transition-colors group-hover:bg-surface-3"
                    }
                  >
                    <group.icon className="size-4" />
                  </span>
                  <span className="text-[13.5px] font-semibold text-fg">{group.label}</span>
                  {group.eyebrow ? (
                    <span className="ml-auto font-mono text-[10px] text-fg-subtle">
                      {group.eyebrow}
                    </span>
                  ) : null}
                </span>
                <span className="mt-2.5 text-[12.5px] leading-relaxed text-pretty text-fg-muted">
                  {group.summary}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Principles — the three commitments that shape the product */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto grid w-full max-w-[1120px] gap-8 px-5 py-16 sm:grid-cols-3">
          {[
            {
              title: "Every number shows its source",
              body: "Pricing carries the date it was last verified against the provider, and where it came from. A figure older than thirty days says so, loudly.",
            },
            {
              title: "Calculated first, explained second",
              body: "The arithmetic is deterministic and tested. A model is asked to explain and caveat the result — never to invent it, and never as a condition of getting an answer.",
            },
            {
              title: "You leave with artifacts",
              body: "An architecture document, a Mermaid diagram, a Compose file, an MCP server, a board-ready business case. Planning that ends in a deliverable.",
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-[13.5px] font-semibold text-fg">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-pretty text-fg-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-5 py-6 text-[12px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <span>StackForge · AI engineering workbench</span>
          <span>Marketing pages, docs, and pricing are still being built.</span>
        </div>
      </footer>
    </div>
  );
}
