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
  assert.deepEqual(result, { net: 25050, discount: 0, vat: 5762, gross: 30812 });
});

test("calculateInvoice subtracts a percentage of net before VAT", () => {
  const result = calculateInvoice({
    lines: [{ quantity: 2, unitPriceCents: 10000 }, { quantity: 1, unitPriceCents: 5000 }],
    vatRate: 23,
    discountPercent: 10,
  });
  assert.deepEqual(result, { net: 25000, discount: 2500, vat: 5175, gross: 27675 });
});

test("calculateInvoice handles the 0% rate", () => {
  const result = calculateInvoice({ lines: [{ quantity: 1, unitPriceCents: 999 }], vatRate: 0 });
  assert.deepEqual(result, { net: 999, discount: 0, vat: 0, gross: 999 });
});

test("calculateInvoice rejects discounts outside 0–50% and non-finite/non-numeric values", () => {
  for (const discountPercent of [-0.01, 50.01, NaN, Infinity, -Infinity, "10", null]) {
    assert.throws(() => calculateInvoice({
      lines: [{ quantity: 1, unitPriceCents: 10000 }], vatRate: 23, discountPercent,
    }), /Discount must be a number between 0 and 50/);
  }
});

test("calculateInvoice rejects unknown VAT rates and empty invoices", () => {
  assert.throws(() => calculateInvoice({ lines: [{ quantity: 1, unitPriceCents: 100 }], vatRate: 7 }));
  assert.throws(() => calculateInvoice({ lines: [], vatRate: 23 }));
});

test("calculateInvoice accepts zero discount explicitly", () => {
  assert.deepEqual(calculateInvoice({
    lines: [{ quantity: 1, unitPriceCents: 999 }], vatRate: 23, discountPercent: 0,
  }), { net: 999, discount: 0, vat: 230, gross: 1229 });
});

test("calculateInvoice rounds a 50% half-cent discount up before calculating VAT", () => {
  assert.deepEqual(calculateInvoice({
    lines: [{ quantity: 1, unitPriceCents: 101 }], vatRate: 23, discountPercent: 50,
  }), { net: 101, discount: 51, vat: 12, gross: 62 });
});

test("calculateInvoice rounds fractional discounts on the invoice net, not each line", () => {
  assert.deepEqual(calculateInvoice({
    lines: [{ quantity: 1, unitPriceCents: 4 }, { quantity: 1, unitPriceCents: 4 }],
    vatRate: 0, discountPercent: 12.5,
  }), { net: 8, discount: 1, vat: 0, gross: 7 });
});

test("calculateInvoice rounds decimal percentage ties half up without floating-point drift", () => {
  assert.deepEqual(calculateInvoice({
    lines: [{ quantity: 1, unitPriceCents: 10000 }], vatRate: 0, discountPercent: 1.005,
  }), { net: 10000, discount: 101, vat: 0, gross: 9899 });
});

test("calculateInvoice rounds VAT half up on the discounted net", () => {
  assert.deepEqual(calculateInvoice({
    lines: [{ quantity: 1, unitPriceCents: 200 }], vatRate: 23, discountPercent: 25,
  }), { net: 200, discount: 50, vat: 35, gross: 185 });
});

test("calculateInvoice handles a zero-value invoice with a discount", () => {
  assert.deepEqual(calculateInvoice({
    lines: [{ quantity: 1, unitPriceCents: 0 }], vatRate: 8, discountPercent: 50,
  }), { net: 0, discount: 0, vat: 0, gross: 0 });
});

test("formatMoney formats cents as Polish currency", () => {
  assert.match(formatMoney(123456), /1\s?234,56\s?zł/);
});
