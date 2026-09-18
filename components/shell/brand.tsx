import { cn } from "@/lib/utils";

/**
 * The mark. A hexagonal shell with a spark inside, reduced to three strokes —
 * legible at 16px, which is the only size that matters for a sidebar and a
 * favicon.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-full", className)}>
      <path
        d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path
        d="m8 13.5 3.2-5.4a.6.6 0 0 1 1.07.06L14 12h2.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="13.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function BrandLockup({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-ember text-ember-fg">
        <BrandMark className="size-[18px]" />
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-fg">
            Buildtact
          </span>
          {/* Slotted so a caller can drop the tagline at a width where it does
              not fit. The marketing header does exactly that: its row is the
              lockup plus a theme control plus a CTA plus a menu button, which
              is 55px too wide for a 390px phone with the tagline in. */}
          <span
            data-slot="brand-tagline"
            className="mt-0.5 truncate text-[10.5px] tracking-[0.03em] text-fg-subtle"
          >
            AI engineering workbench
          </span>
        </span>
      )}
    </span>
  );
}
