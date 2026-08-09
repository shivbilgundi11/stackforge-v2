import { cn } from "@/lib/utils";

/**
 * The container everything in the app sits in.
 *
 * A hairline-bounded white surface on the cream page. No drop shadow — the
 * shell is flat, and separation comes from the 1px line. Shadows are reserved
 * for overlays that are genuinely detached.
 */
export function Panel({ children, className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("overflow-hidden rounded-md border border-line bg-surface", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 shrink-0 text-fg-muted">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="truncate text-[13.5px] font-semibold text-fg">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({ children, className }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

export function PanelFooter({ children, className }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-line bg-surface-2/60 px-4 py-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Every data surface ships four states. These exist as components specifically
 * so that rule stays cheap enough to actually follow — the previous build
 * shipped tool pages with no empty state and a bare error string.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}
    >
      {icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-subtle">
          {icon}
        </div>
      ) : null}
      <p className="text-[13.5px] font-medium text-fg">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-pretty text-fg-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
