import { Reveal, Rule } from "@/components/home/fx/type";
import { Prose } from "@/components/home/sections/prose";
import { readDates, readLegalDocument, type LegalDocument } from "@/lib/marketing/legal";

/**
 * A legal document, rendered.
 *
 * A **server** component with no client boundary below it except the reveals,
 * so the policy is in the HTML a crawler and a regulator receive rather than
 * assembled after hydration, and `/legal/*` stays in the statically
 * prerendered set.
 *
 * ## The restraint is the design here
 *
 * This surface is set at a display scale, and a document of numbered clauses
 * is the one thing on it that must not be. Enlarging a privacy policy does not
 * make it more readable; it makes it longer, and it buries the clause someone
 * came to find under three screens of typography. So the page takes the
 * palette, the mono eyebrow, the hairline and the shell — and then sets the
 * body at a reading size on a single measure. See `sections/prose.tsx`.
 *
 * ## The dates come out of the document
 *
 * Lifted into the header rather than left in the body, and parsed from the
 * Markdown rather than maintained here — the file on disk is what counsel
 * edits, and a date kept separately from it is the one that goes stale. Either
 * may be `null`, and a missing date renders as absent rather than as today.
 */
export async function LegalPage({ name, title }: { name: LegalDocument; title: string }) {
  const { effective, updated, body } = readDates(await readLegalDocument(name));

  return (
    <section className="grain-layer relative px-5 pt-36 pb-24 sm:px-8 sm:pt-44 sm:pb-32">
      <div className="mx-auto w-full max-w-[110rem]">
        <Reveal from="none" duration={0.6}>
          <p className="t-mono text-(--h-fg-45)">Legal</p>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="t-display mt-7 text-[clamp(2.25rem,6vw,4.5rem)]">{title}</h1>
        </Reveal>

        {effective || updated ? (
          <Reveal delay={0.16}>
            <dl className="t-mono mt-8 flex flex-wrap gap-x-10 gap-y-2 text-(--h-fg-45)">
              {effective ? (
                <div className="flex gap-2">
                  <dt>Effective</dt>
                  <dd className="text-(--h-fg)">{effective}</dd>
                </div>
              ) : null}
              {updated ? (
                <div className="flex gap-2">
                  <dt>Last updated</dt>
                  <dd className="text-(--h-fg)">{updated}</dd>
                </div>
              ) : null}
            </dl>
          </Reveal>
        ) : null}

        <Rule className="mt-12" />

        <div className="mt-14 max-w-[72ch]">
          <DraftNotice />
          <Prose content={body} className="mt-12" />
        </div>
      </div>
    </section>
  );
}

/**
 * The banner both documents carry.
 *
 * Counsel review is a calendar dependency, not a build task. Until it lands,
 * these pages describe what the product actually does with data — which is
 * verifiable — and say plainly that they are not yet the binding instrument.
 * Publishing unreviewed text as though it were reviewed would be the worst
 * version of this page.
 *
 * This is the home surface's version of `marketing/legal-draft-notice.tsx`,
 * separate for the same reason `Prose` is separate from the console's
 * `Markdown`: that one is built from the product's warning tokens, which are
 * not defined against a bone-and-ink ground.
 */
function DraftNotice() {
  return (
    <Reveal role="note" className="border-l-2 border-(--h-acc) bg-(--h-panel) px-6 py-5">
      <p className="t-mono text-(--h-acc)">Draft: pending legal review</p>
      <p className="t-body mt-3 text-[14.5px]">
        This document describes how the product currently behaves and is accurate to the
        implementation, but it has not yet been reviewed by counsel and is not in force. It will be
        replaced by the reviewed version before launch.
      </p>
    </Reveal>
  );
}
