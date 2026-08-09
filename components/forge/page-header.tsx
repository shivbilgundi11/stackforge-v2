import { cn } from "@/lib/utils";

/**
 * The page title block. The serif is scoped to exactly this and the home hero —
 * that restraint is what makes it read as considered rather than decorative.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <span className="font-mono text-[10.5px] font-medium tracking-[0.08em] text-fg-subtle uppercase">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="font-serif text-[30px] leading-[1.15] tracking-[-0.01em] text-fg">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-pretty text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
