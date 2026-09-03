"use client";

import { CheckIcon } from "lucide-react";

import { Panel, PanelBody, PanelHeader } from "@/components/forge/panel";
import { DISPLAY_CURRENCIES, type DisplayCurrency } from "@/lib/currency/display-currency";
import { useDisplayCurrency } from "@/lib/currency/use-display-currency";
import { cn } from "@/lib/utils";

/**
 * Which currency prices are read in.
 *
 * A display setting, not a billing one — and the copy has to say so. Razorpay
 * settles in INR on a standard Indian account, so choosing dollars changes
 * what the pricing page says and nothing about what the card is debited. A
 * toggle that looked like it changed the charge would be the most expensive
 * misunderstanding on this page, which is why the rupee amount stays visible
 * next to every converted price and the pay button never leaves INR.
 *
 * Stored in this browser, like the theme above it. The pricing page is public,
 * so a preference kept on the account would be unavailable to exactly the
 * people deciding whether to make one.
 */
export function CurrencySection() {
  const { currency, setCurrency } = useDisplayCurrency();

  return (
    <Panel>
      <PanelHeader
        title="Currency"
        description="What prices are shown in. Payments are always taken in Indian rupees."
      />

      <PanelBody className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="Display currency" className="grid gap-2 sm:grid-cols-2">
          {DISPLAY_CURRENCIES.map(({ value, label, symbol, hint }) => {
            const active = currency === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCurrency(value as DisplayCurrency)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                  active
                    ? "border-ember bg-ember-quiet/40"
                    : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
                )}
              >
                <span className="flex w-full items-center gap-2">
                  <span
                    aria-hidden
                    className={cn(
                      "font-mono text-[15px] leading-none",
                      active ? "text-ember" : "text-fg-subtle",
                    )}
                  >
                    {symbol}
                  </span>
                  <span className="text-[13px] font-medium text-fg">{label}</span>
                  {active ? (
                    <CheckIcon className="ml-auto size-3.5 text-ember" aria-hidden />
                  ) : null}
                </span>
                <span className="text-xs text-fg-muted">{hint}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-fg-muted">
          Dollar prices are set by hand, not converted at a live rate, so they do not move between
          page loads. Whichever you pick, checkout charges the rupee price — it is shown alongside
          every plan.
        </p>
      </PanelBody>
    </Panel>
  );
}
