export function formatPrice(
  amount: number,
  currency: string,
  interval: string,
) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
  return { formatted, interval };
}
