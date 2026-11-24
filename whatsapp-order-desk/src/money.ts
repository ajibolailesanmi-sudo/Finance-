/** "₦12,500" — prices are whole naira in practice, kobo shown only if present. */
export function naira(amount: number): string {
  return "₦" + amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Paystack amounts are integers in kobo. */
export function toKobo(amount: number): number {
  return Math.round(amount * 100);
}
