/**
 * The currency prices are *read* in.
 *
 * Not the currency anything is charged in. Razorpay settles in INR on a
 * standard Indian account, so every plan in the catalog carries a rupee price
 * that is debited and a hand-set dollar price that is only ever displayed
 * (`PlanPriceOut.charged` marks which is which). This setting picks which of
 * them the marketing surfaces show; the pay button always quotes the charged
 * one, because the number on it has to equal the number on the statement.
 *
 * Stored in the browser rather than on the account, like the theme. Two
 * reasons: the pricing page is public, so half the people who want dollars
 * have no account to store it on, and it is a reading preference of the
 * device, not a fact about the customer.
 */

export type DisplayCurrency = "inr" | "usd";

export const DEFAULT_CURRENCY: DisplayCurrency = "inr";

export const CURRENCY_STORAGE_KEY = "stackforge-currency";

export const DISPLAY_CURRENCIES: {
  value: DisplayCurrency;
  label: string;
  symbol: string;
  hint: string;
}[] = [
  { value: "inr", label: "Indian rupee", symbol: "₹", hint: "INR — what you are charged" },
  { value: "usd", label: "US dollar", symbol: "$", hint: "USD — shown for reference" },
];

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return value === "inr" || value === "usd";
}

/**
 * The locale a price is formatted in, chosen by the currency rather than by
 * the browser.
 *
 * A rupee price in a Western browser groups as `₹15,999` instead of the
 * lakh-style `₹15,999` / `₹1,00,000` an Indian reader expects, and a dollar
 * price in a German browser renders `59,99 $`. Either reads as a foreign
 * price on a page selling to that reader.
 */
export function localeFor(currency: string): string {
  return currency.toLowerCase() === "inr" ? "en-IN" : "en-US";
}
