"use client";

import Image from "next/image";
import Link from "next/link";

import { Parallax } from "@/components/home/fx/scroll";
import { Counter, MaskLines, Reveal, Rule, Stagger, StaggerItem } from "@/components/home/fx/type";
import { Magnetic } from "@/components/home/fx/ui";
import { Section } from "@/components/home/sections/head";
import { ProductShot } from "@/components/marketing/product-shot";

/**
 * Chapter four: one run of the engine, and what came back.
 *
 * This is the only part of the page that shows real product output, and it is
 * the part that argues the numbers, so the two belong together. The screenshot
 * is a capture of the running app; everything else drawn on this page is an
 * illustration in a deliberately flatter register, so the difference between
 * "here is the product" and "here is the idea" stays visible rather than
 * asserted.
 *
 * Every figure below — 85.0, eight components, compatibility 72, seven options
 * eliminated, $2,042 a month, and the seven dimension scores with their
 * weights — is what this run returns. They are quoted results, so they are not
 * rounded, reordered for looks, or topped up to a full ten. The counters
 * animate to them; they do not invent them, and the HTML carries the final
 * values whether or not the animation runs.
 *
 * Seven dimensions and not ten because the list is illustrating that the score
 * is decomposed, and the note under it says so explicitly rather than letting
 * the reader count.
 */

const HEADLINE: {
  label: string;
  value: number;
  decimals?: number;
  note: string;
  prefix?: string;
}[] = [
  { label: "Stack score", value: 85, decimals: 1, note: "of 100" },
  { label: "Components", value: 8, note: "one per role" },
  { label: "Compatibility", value: 72, note: "worst pairing" },
  { label: "Eliminated", value: 7, note: "by hard constraints" },
  { label: "Monthly", value: 2042, note: "estimated spend", prefix: "$" },
];

const STACK: [string, string][] = [
  ["LLM provider", "Anthropic API"],
  ["Framework", "LangChain"],
  ["Vector store", "Qdrant"],
  ["Database", "SQLite"],
  ["Cache", "Valkey"],
  ["Orchestration", "Apache Airflow"],
  ["Observability", "Grafana"],
  ["Deployment", "Vercel"],
];

const DIMENSIONS: [string, number, number][] = [
  ["Scalability", 9.8, 12],
  ["Documentation quality", 9.9, 5],
  ["Community maturity", 9.0, 6],
  ["Production readiness", 8.7, 12],
  ["Cost efficiency", 8.6, 15],
  ["Integration compatibility", 7.2, 10],
  ["Deployment complexity", 6.9, 8],
];

export function Evidence() {
  return (
    // Clipped for the same reason as the premise: the illustration waits past
    // the page edge before it slides in.
    <Section className="overflow-x-clip">
      <Rule />
      {/* Chapter mark, prompt, illustration — the same three-column row as
          the premise, at the same 1.25:1 between the last two, so the two
          illustrated chapters read as a pair. */}
      <div className="grid gap-8 pt-7 lg:grid-cols-[minmax(0,14rem)_minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono flex items-baseline gap-3 text-(--h-fg-45)">
            <span className="text-(--h-acc)">04</span>
            The evidence
          </p>
        </Reveal>

        <div>
          <p className="t-mono text-(--h-fg-45)">The prompt</p>
          <MaskLines
            as="blockquote"
            lines={[
              "“RAG over internal docs,",
              "medium scale,",
              <>
                $2,000 a month<span className="text-(--h-acc)">.”</span>
              </>,
            ]}
            className="t-head mt-5 text-[clamp(1.8rem,5vw,4rem)]"
          />
          <Reveal delay={0.25}>
            <p className="t-body mt-8 max-w-[50ch]">
              Run against the live engine. What follows are the figures it returns — not an
              illustration of what it might return.
            </p>
          </Reveal>
        </div>

        <EvidenceVisual />
      </div>

      {/* ── The headline figures ───────────────────────────────────────────── */}
      <Stagger
        step={0.07}
        className="mt-20 grid grid-cols-2 border-t border-(--h-line) sm:grid-cols-3 lg:grid-cols-5"
      >
        {HEADLINE.map((tile) => (
          <StaggerItem
            key={tile.label}
            className="border-r border-b border-(--h-line) px-5 py-8 last:border-r-0 sm:px-6"
          >
            <p className="t-mono text-(--h-fg-45)">{tile.label}</p>
            <p className="t-display mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)]">
              <Counter
                value={tile.value}
                decimals={tile.decimals ?? 0}
                format={
                  tile.prefix
                    ? (n) => `${tile.prefix}${Math.round(n).toLocaleString("en-GB")}`
                    : undefined
                }
              />
            </p>
            <p className="t-mono mt-3 text-[9px] text-(--h-fg-45)">{tile.note}</p>
          </StaggerItem>
        ))}
      </Stagger>

      {/* ── The capture, and the detail ────────────────────────────────────── */}
      <div className="mt-20 grid gap-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          {/* Named as the RAG Planner specifically, and the list opposite is
              named as Stack Architect, because they are two different tools on
              two different runs — the capture shows Pinecone as its vector
              store and the list returns Qdrant. Side by side under one
              unqualified "actual product output" they would read as one
              result, and a visitor who noticed the mismatch would be right to
              stop trusting the rest of the page. */}
          <Reveal>
            <div className="flex items-baseline justify-between gap-4 pb-4">
              <p className="t-mono text-(--h-fg-45)">RAG Planner · the pipeline it returned</p>
              <p className="t-mono text-(--h-acc)">Screen capture</p>
            </div>
          </Reveal>
          <Parallax distance={54}>
            <Reveal from="none" duration={1.1}>
              <ProductShot
                src="rag-architecture"
                alt="The RAG architecture planner showing the pipeline it returned for internal documentation at medium scale on a $2,000 monthly budget, with the estimated cost, component count, and the options its constraints eliminated."
              />
            </Reveal>
          </Parallax>

          <Reveal delay={0.1} className="mt-9 flex flex-wrap items-center gap-3">
            <Magnetic strength={12}>
              <Link href="/signup" data-cursor="Run it" className="btn btn-acc">
                Try this example
              </Link>
            </Magnetic>
            <Magnetic strength={9}>
              <Link href="/features" className="btn">
                See the full walkthrough
              </Link>
            </Magnetic>
          </Reveal>
        </div>

        <div>
          {/* The stack it returned. */}
          <Reveal>
            <p className="t-mono border-b border-(--h-line) pb-4 text-(--h-fg-45)">
              Stack Architect · the stack it returned
            </p>
          </Reveal>
          <Stagger step={0.04}>
            {STACK.map(([role, name]) => (
              <StaggerItem
                key={role}
                from="none"
                className="group flex items-baseline justify-between gap-6 border-b border-(--h-line) py-3.5"
              >
                <span className="t-mono text-(--h-fg-45)">{role}</span>
                <span className="text-[15px] font-medium transition-transform duration-500 ease-(--h-ease) group-hover:-translate-x-1">
                  {name}
                </span>
              </StaggerItem>
            ))}
          </Stagger>

          {/* Where the score came from. */}
          <Reveal className="mt-14">
            <p className="t-mono border-b border-(--h-line) pb-4 text-(--h-fg-45)">
              Where the score came from
            </p>
          </Reveal>
          <Stagger step={0.05}>
            {DIMENSIONS.map(([label, score, weight]) => (
              <StaggerItem
                key={label}
                from="none"
                className="flex items-center gap-4 border-b border-(--h-line) py-3"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] text-(--h-fg-70)">
                  {label}
                </span>
                <span className="t-mono w-12 text-right text-[9px] text-(--h-fg-45)">
                  {weight}%
                </span>
                <span className="font-mono text-[14px] tabular-nums">{score.toFixed(1)}</span>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal delay={0.1}>
            <p className="t-body mt-5 text-[13px]">
              Ten weighted dimensions in total. The contributions sum to the headline, so the number
              is checkable rather than merely stated.
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/**
 * The prompt, drawn: sources flowing into retrieval and out as a grounded
 * answer.
 *
 * ## Labelled as an illustration, on purpose
 *
 * This chapter's whole claim is that its figures are *returned*, not drawn —
 * the copy beside this says so in as many words, and the capture further
 * down is labelled "Screen capture" for the same reason. So this carries the
 * opposite label. Its $2,042 agrees with the run; its "$6,400 without RAG"
 * and "68%" are the picture's, not the engine's, and an unlabelled image
 * quoting them next to "not an illustration" would be the one unsourced
 * number on the page. The alt text leaves them out for the same reason.
 *
 * Transparent, glow and all, so like the premise it is not a framed `Shot`.
 */
function EvidenceVisual() {
  return (
    <Parallax distance={36} className="lg:pt-6">
      <Reveal from="right" distance={96} duration={1.1}>
        <figure>
          <Image
            src="/marketing/evidence-rag-flow.webp"
            alt="Illustration of retrieval-augmented generation: internal PDFs, Notion, Drive, Confluence, GitHub and web research feeding one retrieval step, which answers a question with relevant context, a grounded answer and citations."
            width={1536}
            height={1024}
            loading="lazy"
            // Same column as the premise's, measured the same way.
            sizes="(max-width: 1024px) 100vw, (max-width: 1824px) 35vw, 38rem"
            className="h-auto w-full"
          />
          <figcaption className="t-mono mt-3 text-(--h-fg-45)">Illustration</figcaption>
        </figure>
      </Reveal>
    </Parallax>
  );
}
