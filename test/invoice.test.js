import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateInvoice, formatMoney, lineNet, toCents } from "../src/invoice.js";

test("toCents converts and rounds to whole cents", () => {
  assert.equal(toCents("12.34"), 1234);
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.throws(() => toCents("abc"));
});

test("lineNet multiplies quantity by unit price", () => {
  assert.equal(lineNet({ quantity: 3, unitPriceCents: 1999 }), 5997);
  assert.throws(() => lineNet({ quantity: 0, unitPriceCents: 100 }));
  assert.throws(() => lineNet({ quantity: 1, unitPriceCents: -1 }));
});

test("calculateInvoice sums lines and adds VAT", () => {
  const result = calculateInvoice({
    lines: [
      { quantity: 2, unitPriceCents: 10000 },
      { quantity: 1, unitPriceCents: 5050 },
    ],
    vatRate: 23,
  });
  assert.deepEqual(result, { net: 25050, vat: 5762, gross: 30812 });
});

test("calculateInvoice handles the 0% rate", () => {
  const result = calculateInvoice({ lines: [{ quantity: 1, unitPriceCents: 999 }], vatRate: 0 });
  assert.deepEqual(result, { net: 999, vat: 0, gross: 999 });
});

test("calculateInvoice rejects unknown VAT rates and empty invoices", () => {
  assert.throws(() => calculateInvoice({ lines: [{ quantity: 1, unitPriceCents: 100 }], vatRate: 7 }));
  assert.throws(() => calculateInvoice({ lines: [], vatRate: 23 }));
});

test("formatMoney formats cents as Polish currency", () => {
  assert.match(formatMoney(123456), /1\s?234,56\s?zł/);
});
