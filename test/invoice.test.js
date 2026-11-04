import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateDueDate, calculateInvoice, formatMoney, lineNet, toCents } from "../src/invoice.js";

test("calculateDueDate defaults to 14 calendar days and formats DD.MM.YYYY", () => {
  assert.equal(calculateDueDate("2026-11-04"), "18.11.2026");
});

test("calculateDueDate rejects payment terms other than whole numbers from 1 to 90", () => {
  for (const days of [0, -1, 91, 1.5, NaN, Infinity, "14", "", null, true]) {
    assert.throws(() => calculateDueDate("2026-11-04", days), /Payment term must be a whole number from 1 to 90 days/);
  }
  assert.equal(calculateDueDate("2026-11-04", 1), "05.11.2026");
  assert.equal(calculateDueDate("2026-11-04", 90), "02.02.2027");
});

test("calculateDueDate moves Saturday and Sunday deadlines to Monday", () => {
  assert.equal(calculateDueDate("2026-11-06", 1), "09.11.2026");
  assert.equal(calculateDueDate("2026-11-06", 2), "09.11.2026");
  assert.equal(calculateDueDate("2026-11-06", 3), "09.11.2026");
});

test("calculateDueDate rejects missing, malformed and impossible issue dates", () => {
  for (const date of ["", undefined, null, "04.11.2026", "2026-2-03", "2026-02-30", "2026-13-01", "0000-01-01"]) {
    assert.throws(() => calculateDueDate(date), /Issue date must be a valid date/);
  }
});

test("calculateDueDate handles month, year and leap-day boundaries", () => {
  assert.equal(calculateDueDate("2026-01-30", 1), "02.02.2026");
  assert.equal(calculateDueDate("2027-12-31", 1), "03.01.2028");
  assert.equal(calculateDueDate("2024-02-28", 1), "29.02.2024");
  assert.equal(calculateDueDate("2026-02-28", 2), "02.03.2026");
  assert.equal(calculateDueDate("2026-03-27", 3), "30.03.2026");
});

test("calculateDueDate rejects deadlines beyond year 9999", () => {
  assert.equal(calculateDueDate("9999-12-30", 1), "31.12.9999");
  assert.throws(() => calculateDueDate("9999-12-31", 1), /Due date must not exceed year 9999/);
});

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
