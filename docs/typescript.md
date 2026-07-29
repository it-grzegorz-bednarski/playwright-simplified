# TypeScript

← [Back to main documentation](../README.md)

## Overview

This repository uses TypeScript for test code and framework configuration.

---

## Configuration

TypeScript configuration is defined in [`tsconfig.json`](../tsconfig.json).

Example configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "types": ["node", "@playwright/test"],
    "strict": true,
    "noEmit": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}
```

`tsconfig.json` is the source of truth. Update this document when compiler options change.

Key points:

- `types` includes Node.js and Playwright test globals.
- `strict` keeps strong type safety from the beginning.
- `noEmit` keeps this config focused on type-checking only.

---

## Usage

- Write framework and test files as `.ts` files.
- Use `yarn tsc --noEmit` to run a manual type-check:

```sh
yarn tsc --noEmit
```

**Automatic typecheck:** **[Husky](./husky.md)** runs `tsc --noEmit` automatically via the `pre-push` hook before every `git push`.

---

## References

- **[TypeScript Documentation](https://www.typescriptlang.org/docs/)**
- **[Playwright + TypeScript](https://playwright.dev/docs/test-typescript)**
