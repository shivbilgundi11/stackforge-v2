/**
 * Display formatters.
 *
 * Money arrives from the API as a decimal *string* — never a float — so these
 * take `string | number` and parse defensively. A float loses cents at the
 * per-token scale this product operates on, and the frontend must not be where
 * that is discovered.
 */

const num = (v: string | number): number => (typeof v === "number" ? v : Number.parseFloat(v));

/** `$126.00` · `$0.004200` when the value is sub-cent and precision matters. */
export function currency(value: string | number, opts?: { precise?: boolean }): string {
  const n = num(value);
  if (!Number.isFinite(n)) return "—";

  const precise = opts?.precise ?? (n !== 0 && Math.abs(n) < 0.01);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: precise ? 6 : 2,
    maximumFractionDigits: precise ? 6 : 2,
  }).format(n);
}

/** `1,600,000` → `1.6M`. Keeps a metric tile from wrapping. */
export function compactNumber(value: string | number): string {
  const n = num(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    n,
  );
}

/** `1,600,000` — full precision, grouped. */
export function number(value: string | number): string {
  const n = num(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

/** `1.6M tokens` */
export function tokens(value: string | number): string {
  return `${compactNumber(value)}`;
}

/** `14.2 GB` — binary units, which is what VRAM and index sizing use. */
export function bytes(value: string | number): string {
  const n = num(value);
  if (!Number.isFinite(n)) return "—";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

/** `842ms` · `1.4s` · `2m 13s` */
export function duration(ms: string | number): string {
  const n = num(ms);
  if (!Number.isFinite(n)) return "—";
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)}s`;
  const m = Math.floor(n / 60_000);
  const s = Math.round((n % 60_000) / 1000);
  return `${m}m ${s}s`;
}

/** `+34%` · `−12%` — signed, for delta chips. */
export function percentDelta(value: string | number): string {
  const n = num(value);
  if (!Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(n % 1 === 0 ? 0 : 1)}%`;
}

/** `3d ago` · `just now` — used by the provenance chip. */
export function relativeAge(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (Number.isNaN(seconds)) return "—";
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86_400);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/** Whole days since a date. Drives the provenance chip's staleness variant. */
export function ageInDays(date: string | Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
