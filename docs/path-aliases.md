# Path Aliases

← [Back to main documentation](../README.md)

Path aliases let you use short imports instead of relative paths.

---

## Configuration

Defined in [`tsconfig.json`](../tsconfig.json) under `compilerOptions.paths`. ESLint resolves them via `eslint-import-resolver-typescript` in [`eslint.config.js`](../eslint.config.js). Playwright's built-in TypeScript transformer picks them up automatically.

```json
// tsconfig.json
"paths": {
  "@config/*": ["./config/*"],
  "@utils/*":  ["./utils/*"]
  // add more aliases here as needed
}
```

---

## Usage

```ts
// Instead of:
import { timeouts } from '../../config/timeouts';
import { data } from '../../data/brandb';
import { test } from '../../utils/baseTest';

// You can write:
import { timeouts } from '@config/timeouts';
import { data } from '@data/brandb';
import { test } from '@utils/baseTest';
```

