# playwright executors

This library was generated with [Nx](https://nx.dev).

## Executors

### `@riwi/playwright:test`

Runs `playwright test` in the project root, so the project's `playwright.config.ts` is picked up automatically.

```json
"e2e": {
  "executor": "@riwi/playwright:test",
  "options": {
    "testFiles": ["src/e2e/snapshot.spec.ts"],
    "project": ["chromium"]
  }
}
```

## Building

Run `nx build playwright` to build the library.

## Running unit tests

Run `nx test playwright` to execute the unit tests via [Bun test](https://bun.com/docs/test).
