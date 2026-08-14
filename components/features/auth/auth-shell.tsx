import Link from "next/link";

import { BrandLockup } from "@/components/shell/brand";

export function AuthShell({
  title,
  description,
  children,
  footer,
  /** The plan step needs room for three side-by-side figures per row; the
   *  form steps do not, and a 460px-wide password field looks unfinished. */
  wide = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 items-center px-5">
        <Link href="/" aria-label="StackForge home" className="rounded-md">
          <BrandLockup />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 pt-6 pb-16 sm:items-center sm:pt-0 sm:pb-24">
        <div className={wide ? "w-full max-w-[460px]" : "w-full max-w-[400px]"}>
          <h1 className="font-serif text-[28px] leading-tight tracking-[-0.01em] text-fg">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-pretty text-fg-muted">
              {description}
            </p>
          ) : null}

          <div className="mt-6 rounded-md border border-line bg-surface p-5">{children}</div>

          {footer ? (
            <div className="mt-4 text-center text-[12.5px] text-fg-muted">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
