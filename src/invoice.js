// Money is kept in integer cents everywhere. Convert only at the edges (input and display).

export const VAT_RATES = [23, 8, 5, 0];

export function calculateDueDate(issueDate, paymentDays = 14) {
  if (!Number.isInteger(paymentDays) || paymentDays < 1 || paymentDays > 90) {
    throw new Error("Payment term must be a whole number from 1 to 90 days");
  }
  const date = new Date(`${issueDate}T00:00:00.000Z`);
  if (typeof issueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(issueDate)
      || !Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1
      || date.toISOString().slice(0, 10) !== issueDate) {
    throw new Error("Issue date must be a valid date");
  }
  date.setUTCDate(date.getUTCDate() + paymentDays);
  // Use UTC calendar dates so local timezone and DST cannot shift the deadline.
  if (date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 2);
  if (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  if (date.getUTCFullYear() > 9999) {
    throw new Error("Due date must not exceed year 9999");
  }
  return date.toISOString().slice(0, 10).split("-").reverse().join(".");
}

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
