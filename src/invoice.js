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

// Half-up rounding of a non-negative percentage using exact decimal arithmetic.
function percentOf(cents, percent) {
  const [coefficient, exponent = "0"] = String(percent).split("e");
  const [whole, fraction = ""] = coefficient.split(".");
  const scale = fraction.length - Number(exponent);
  const denominator = 100n * 10n ** BigInt(Math.max(0, scale));
  const numerator = BigInt(cents) * BigInt(whole + fraction) * 10n ** BigInt(Math.max(0, -scale));
  return Number((numerator + denominator / 2n) / denominator);
}

export function lineNet({ quantity, unitPriceCents }) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("Quantity must be a positive integer");
  if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) throw new Error("Unit price must be 0 or more");
  return quantity * unitPriceCents;
}

export function calculateInvoice({ lines, vatRate, discountPercent = 0 }) {
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 50) {
    throw new Error("Discount must be a number between 0 and 50%");
  }
  if (!VAT_RATES.includes(vatRate)) throw new Error(`Unsupported VAT rate: ${vatRate}`);
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("An invoice needs at least one line");

  const net = lines.reduce((sum, line) => sum + lineNet(line), 0);
  const discount = percentOf(net, discountPercent);
  const discountedNet = net - discount;
  const vat = percentOf(discountedNet, vatRate);

  return { net, discount, vat, gross: discountedNet + vat };
}
