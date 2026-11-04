import { VAT_RATES, calculateDueDate, calculateInvoice, formatMoney, lineNet, toCents } from "./invoice.js";

const tbody = document.querySelector("#lines tbody");
const vatSelect = document.querySelector("#vat-rate");
const errorBox = document.querySelector("#error");
const issueDateInput = document.querySelector("#issue-date");
const paymentDaysInput = document.querySelector("#payment-days");
const dueDateOutput = document.querySelector("[data-due-date]");

// Initialize the date input using the user's local calendar date, not UTC.
const today = new Date();
issueDateInput.value = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0")].join("-");

for (const rate of VAT_RATES) {
  vatSelect.append(new Option(`${rate}%`, rate));
}

function addLine({ name = "", quantity = 1, price = "" } = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input name="name" placeholder="Service"></td>
    <td><input name="quantity" type="number" min="1" step="1"></td>
    <td><input name="price" type="number" min="0" step="0.01" placeholder="0.00"></td>
    <td data-line-net>–</td>
    <td><button type="button" data-remove aria-label="Remove line">×</button></td>`;
  row.querySelector('[name="name"]').value = name;
  row.querySelector('[name="quantity"]').value = quantity;
  row.querySelector('[name="price"]').value = price;
  tbody.append(row);
}

function readLines() {
  return [...tbody.rows].map((row) => ({
    row,
    quantity: Number(row.querySelector('[name="quantity"]').value),
    unitPriceCents: toCents(row.querySelector('[name="price"]').value || 0),
  }));
}

function render() {
  errorBox.textContent = "";
  dueDateOutput.textContent = "–";
  try {
    const dueDate = calculateDueDate(issueDateInput.value, paymentDaysInput.valueAsNumber);
    const lines = readLines();
    for (const line of lines) {
      line.row.querySelector("[data-line-net]").textContent = formatMoney(lineNet(line));
    }
    const totals = calculateInvoice({ lines, vatRate: Number(vatSelect.value) });
    for (const [key, cents] of Object.entries(totals)) {
      document.querySelector(`[data-total="${key}"]`).textContent = formatMoney(cents);
    }
    dueDateOutput.textContent = dueDate;
  } catch (error) {
    errorBox.textContent = error.message;
  }
}

document.querySelector("#add-line").addEventListener("click", () => {
  addLine();
  render();
});

tbody.addEventListener("click", (event) => {
  if (!event.target.matches("[data-remove]")) return;
  event.target.closest("tr").remove();
  render();
});

document.addEventListener("input", render);

addLine({ name: "Development", quantity: 10, price: "150.00" });
addLine({ name: "Code review", quantity: 2, price: "120.00" });
render();
