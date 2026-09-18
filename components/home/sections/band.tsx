"use client";

import { Marquee } from "@/components/home/fx/ui";

/**
 * The catalog band.
 *
 * ## Why this is not a logo wall
 *
 * A row of vendor marks under a hero says one thing, and it is not "we have
 * priced these" — it is "these companies use us". Nobody named here has
 * endorsed this product, so no mark is redrawn and the band is labelled with
 * what it actually is: catalog contents. Names set as text make the real point
 * (the coverage is broad and specific) without making the false one.
 *
 * Every name below is a row in the catalog the recommendation engine reads —
 * the same catalog the hero's counts come from. The band shows what fits; the
 * counts beside it give the totals.
 *
 * Two rows travelling in opposite directions, both reacting to scroll
 * velocity, so the band registers as part of the page's motion rather than as
 * a widget looping on its own clock. See `Marquee`.
 */

const MODELS = [
  "Claude",
  "GPT-4o",
  "Gemini",
  "Llama 3",
  "Mistral",
  "Command R+",
  "DeepSeek",
  "Qwen",
  "Phi-3",
  "text-embedding-3",
  "Cohere Embed",
  "Voyage",
];

const TOOLS = [
  "Qdrant",
  "Pinecone",
  "Weaviate",
  "Milvus",
  "pgvector",
  "Chroma",
  "LangChain",
  "LlamaIndex",
  "Haystack",
  "Apache Airflow",
  "Valkey",
  "Grafana",
  "Docker",
  "Kubernetes",
  "H100",
  "A100",
  "L40S",
  "RTX 4090",
];

export function CatalogBand({ verified }: { verified: string }) {
  return (
    <section data-chapter="ink" className="grain-layer relative overflow-hidden py-14">
      <div className="mx-auto mb-10 flex w-full max-w-[110rem] flex-wrap items-center justify-between gap-4 px-5 sm:px-8">
        <p className="t-mono text-(--h-fg-45)">In the catalog</p>
        <p className="t-mono text-(--h-fg-45)">
          Every row carries its source · oldest verified {verified}
        </p>
      </div>

      <Marquee speed={44} className="border-y border-(--h-line) py-5">
        {MODELS.map((name) => (
          <Item key={name} label={name} />
        ))}
      </Marquee>

      <Marquee speed={56} reverse className="border-b border-(--h-line) py-5">
        {TOOLS.map((name) => (
          <Item key={name} label={name} />
        ))}
      </Marquee>
    </section>
  );
}

function Item({ label }: { label: string }) {
  return (
    <span className="t-head flex shrink-0 items-center gap-8 px-8 text-[clamp(1.3rem,2.6vw,2.1rem)] whitespace-nowrap text-(--h-fg-70)">
      {label}
      <span aria-hidden className="size-1 rounded-full bg-(--h-acc)" />
    </span>
  );
}
