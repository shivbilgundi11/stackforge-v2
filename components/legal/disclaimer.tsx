/**
 * A disclaimer, rendered the same way everywhere it appears.
 *
 * Deliberately quiet and deliberately not dismissible. The checklist's whole
 * argument is proximity — a sentence beside the number is worth more than a
 * page of terms nobody opens — and proximity only works if the sentence is
 * still there. A collapsed or dismissed disclaimer is a disclaimer that was
 * not shown.
 *
 * `tone="strict"` is the ROI calculator's, and the only visual difference is
 * that it is bordered rather than bare. That is not decoration: the strict
 * wording is three sentences rather than one, and three sentences of ungrouped
 * grey text below a figure reads as a caption someone forgot to delete.
 */
export function Disclaimer({
  children,
  tone = "quiet",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "quiet" | "strict";
  className?: string;
}) {
  const base = "text-[11.5px] leading-relaxed text-pretty text-fg-subtle";

  if (tone === "strict") {
    return (
      <p
        data-slot="disclaimer"
        className={`rounded-md border border-line bg-surface-2/40 px-3 py-2.5 ${base} ${className}`}
      >
        {children}
      </p>
    );
  }

  return (
    <p data-slot="disclaimer" className={`px-1 ${base} ${className}`}>
      {children}
    </p>
  );
}
