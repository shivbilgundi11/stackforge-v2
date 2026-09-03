/**
 * Every disclaimer the product shows, in one place.
 *
 * `Stackforge_Disclaimer_Checklist_and_Copy.md` closes with the reason: this
 * language will be revised — new jurisdictions, counsel's wording, a tweak
 * after a vendor complains — and hunting it through a dozen components is how
 * one copy of it silently stays wrong. Components import a key; nobody types
 * the sentence twice.
 *
 * ## Which tone goes where
 *
 * The checklist recommends the friendlier variant everywhere and the formal
 * one for the ROI calculator and exported artefacts, where the stakes are
 * highest. That is what is implemented: `ROI_*` are the strict wording, and
 * every other entry here is the friendly one. Both are legally meaningful —
 * proximity to the number matters more than the register.
 *
 * ## Dates
 *
 * The checklist asks for a visible "last verified" date on comparisons and
 * cost output, pulled from the data rather than hardcoded. It already exists:
 * every tool result carries `provenance.sources[].last_verified_at`, which is
 * the verification date of the exact catalog rows *that run* read, and the
 * provenance chips render it beside every result. So these sentences do not
 * repeat a date — they sit next to the one the product already proves.
 *
 * The three locations in the checklist with no feature behind them yet —
 * affiliate links, the "Verified Partner" badge, the homepage logo strip and
 * blog posts — are deliberately absent rather than written and unused. A
 * disclosure with nothing to disclose is a sentence someone has to reconcile
 * later.
 */

/** Location 2 — beside any figure the result renders as money. */
export const ESTIMATE =
  "Estimate based on your inputs and the pricing dates shown above — real-world costs " +
  "can run higher or lower depending on how you actually use it. Treat this as a strong " +
  "starting point, not a locked-in number.";

/** Location 1 — under every comparison table. */
export const COMPARISON =
  "Based on public data verified on the dates shown above — always double-check with the " +
  "provider before you commit, since pricing and features change fast. Nobody pays to be " +
  "ranked here.";

/** Location 3 — under the Stack Score, which on its own implies false precision. */
export const SCORE =
  "This score is computed from what you told us and our compatibility data — a strong " +
  "starting point, not gospel.";

/** Location 3 — under the recommended components. */
export const RECOMMENDATION =
  "An automated recommendation, not professional engineering advice. Have someone on your " +
  "team sanity-check it before you build.";

/**
 * Location 4 — the strict wording, on the ROI calculator's *output*.
 *
 * The one place the checklist singles out for the formal register, because a
 * payback period in a board deck is a different kind of claim from a token
 * price.
 */
export const ROI_OUTPUT =
  "This tool is provided for internal planning and educational purposes only. It does not " +
  "constitute financial, tax, investment, or legal advice. All projections, savings " +
  "estimates, and payback periods are based solely on assumptions and figures you provide, " +
  "are illustrative only, and are not guaranteed outcomes. Consult a qualified financial or " +
  "legal professional before making business decisions based on this output.";

/** Location 4 — on the ROI input form, before anything is calculated. */
export const ROI_INPUT =
  "Planning tool, not financial advice. The figures below are assumptions you supply, and " +
  "the result is only ever as good as they are.";

/** Location 8 — on a catalog or graveyard entry. */
export const CATALOG =
  "Status and maturity reflect our assessment on the review date shown — this space moves " +
  "fast, so if something looks out of date, tell us and we will take another look.";

/** Location 9 — the first-run notice, shown once per tool per browser. */
export const FIRST_RUN =
  "Everything here is generated guidance based on what you tell us and the data in our " +
  "catalog — a starting point, not a final answer. Always check it against your own " +
  "situation before acting on it.";

/** Location 11 — the sitewide line, beside a link to the Terms. */
export const FOOTER =
  "Comparisons, cost estimates and recommendations on StackForge are planning guidance, " +
  "not professional, financial or legal advice.";

/** Location 11, in the app shell, where there is no footer and less room. */
export const FOOTER_COMPACT = "Planning guidance, not financial or engineering advice.";
