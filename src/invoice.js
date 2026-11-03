// Money is kept in integer cents everywhere. Convert only at the edges (input and display).

export const VAT_RATES = [23, 8, 5, 0];

export function toCents(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) throw new Error(`Not a number: ${amount}`);
  return Math.round(value * 100);
}

export function formatMoney(cents, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency }).format(cents / 100);
}

// Half-up rounding of a percentage of an amount in cents.
function percentOf(cents, percent) {
  return Math.round((cents * percent) / 100);
}

export function lineNet({ quantity, unitPriceCents }) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Quantity must be a positive integer");
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) throw new Error("Unit price must be 0 or more");
  return quantity * unitPriceCents;
}

export function calculateInvoice({ lines, vatRate }) {
  if (!VAT_RATES.includes(vatRate)) throw new Error(`Unsupported VAT rate: ${vatRate}`);
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("An invoice needs at least one line");

  const net = lines.reduce((sum, line) => sum + lineNet(line), 0);
  const vat = percentOf(net, vatRate);

  return { net, vat, gross: net + vat };
}
