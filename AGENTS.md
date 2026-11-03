# Invoice calculator: agent guide

A single-page invoice calculator. No framework, no build step, no dependencies.

## Layout

- `src/invoice.js`: all calculation logic, pure functions. Every rule about money lives here.
- `src/app.js`: the UI. It reads inputs and renders results, and holds no business rules.
- `test/invoice.test.js`: tests for `src/invoice.js` (Node's built-in test runner).
- `scripts/serve.js`: a static server for local preview.

## Commands

- `npm test`: run the tests.
- `npm run check`: syntax check of every source file.
- `npm start`: serve the app on http://localhost:3000.

## Rules

- Money is integer cents in all logic. Convert with `toCents` on input and `formatMoney` on display.
- Every change to `src/invoice.js` comes with a test in `test/invoice.test.js`.
- Keep the UI in `src/app.js` and `index.html` free of calculations.
- Run `npm run check` and `npm test` before opening a pull request, and fill in every section of the pull request template.
