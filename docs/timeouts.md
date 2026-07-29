# Timeouts

← [Back to main documentation](../README.md)

## Overview

Timeout presets are centralized in [`config/timeouts.ts`](../config/timeouts.ts).

This keeps timeout usage consistent across runner config, fixtures, and tests.

---

## Configuration

Example implementation (`config/timeouts.ts`):

```ts
export const timeouts = {
  veryShort: Number(process.env.TIMEOUT_VERY_SHORT) || 2_000,
  short: Number(process.env.TIMEOUT_SHORT) || 5_000,
  normal: Number(process.env.TIMEOUT_NORMAL) || 10_000,
  long: Number(process.env.TIMEOUT_LONG) || 15_000,
  veryLong: Number(process.env.TIMEOUT_VERY_LONG) || 30_000,
  ultraLong: Number(process.env.TIMEOUT_ULTRA_LONG) || 60_000,
  fiveMinutes: Number(process.env.TIMEOUT_FIVE_MINUTES) || 5 * 60_000,
  tenMinutes: Number(process.env.TIMEOUT_TEN_MINUTES) || 10 * 60_000,
  thirtyMinutes: Number(process.env.TIMEOUT_THIRTY_MINUTES) || 30 * 60_000,
  sixtyMinutes: Number(process.env.TIMEOUT_SIXTY_MINUTES) || 60 * 60_000,
  ninetyMinutes: Number(process.env.TIMEOUT_NINETY_MINUTES) || 90 * 60_000,
  twoHours: Number(process.env.TIMEOUT_TWO_HOURS) || 120 * 60_000,
} as const;
```

Available timeout presets:

- `veryShort`
- `short`
- `normal`
- `long`
- `veryLong`
- `ultraLong`
- `fiveMinutes`
- `tenMinutes`
- `thirtyMinutes`
- `sixtyMinutes`
- `ninetyMinutes`
- `twoHours`

Optional environment overrides (numeric milliseconds):

- `TIMEOUT_VERY_SHORT`
- `TIMEOUT_SHORT`
- `TIMEOUT_NORMAL`
- `TIMEOUT_LONG`
- `TIMEOUT_VERY_LONG`
- `TIMEOUT_ULTRA_LONG`
- `TIMEOUT_FIVE_MINUTES`
- `TIMEOUT_TEN_MINUTES`
- `TIMEOUT_THIRTY_MINUTES`
- `TIMEOUT_SIXTY_MINUTES`
- `TIMEOUT_NINETY_MINUTES`
- `TIMEOUT_TWO_HOURS`

Example:

```env
TIMEOUT_SHORT=3000
TIMEOUT_LONG=20000
TIMEOUT_FIVE_MINUTES=300000
TIMEOUT_NINETY_MINUTES=5400000
TIMEOUT_TWO_HOURS=7200000
```

---

## Usage

Timeout presets are consumed in [`playwright.config.ts`](../playwright.config.ts) and can also be used in tests/helpers.

Example:

```ts
import { timeouts } from '../config/timeouts';

await page.waitForSelector('[data-testid="loading"]', {
  timeout: timeouts.normal,
});
```
