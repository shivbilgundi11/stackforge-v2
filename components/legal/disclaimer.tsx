/**
 * A disclaimer, rendered the same way everywhere it appears.
 *
 * Deliberately not dismissible. The checklist's whole argument is proximity —
 * a sentence beside the number is worth more than a page of terms nobody
 * opens — and proximity only works if the sentence is still there. A collapsed
 * or dismissed disclaimer is a disclaimer that was not shown.
 *
 * It reads as a warning rather than as a caption. The previous treatment was
 * `text-fg-subtle`, which is the placeholder/disabled grey: 3.34:1 on light and
 * 3.24:1 on dark, below AA for text this size, and visually indistinguishable
 * from a hint someone forgot to delete. The warning palette carries the meaning
 * and the contrast at once.
 *
 * Text is `--warning-strong`, not `--warning`. The latter is 3.30:1 on
 * `--warning-quiet` in light mode — fine for the border and an icon, not for an
 * 11.5px sentence. See the note beside the token in `globals.css`.
 *
 * `tone="strict"` is the ROI calculator's: the strict wording is three
 * sentences rather than one, so it gets the heavier box. `tone="bare"` is for
 * callers that already draw their own warning box and only need the text to
 * match — `FirstRunNotice` is the one.
 */
export function Disclaimer({
  children,
  tone = "quiet",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "quiet" | "strict" | "bare";
  className?: string;
}) {
  const base = "text-[11.5px] leading-relaxed text-pretty text-warning-strong";

  if (tone === "bare") {
    return (
      <p data-slot="disclaimer" className={`${base} ${className}`}>
        {children}
      </p>
    );
  }

  const box = "rounded-md border border-warning-line bg-warning-quiet";

  return (
    <p
      data-slot="disclaimer"
      data-tone={tone}
      className={
        tone === "strict"
          ? `${box} px-3 py-2.5 ${base} ${className}`
          : `${box} px-2.5 py-2 ${base} ${className}`
      }
    >
      {children}
    </p>
  );
}
