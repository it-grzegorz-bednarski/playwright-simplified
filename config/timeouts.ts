/**
 * Centralized timeout presets.
 *
 * Use these named constants instead of raw millisecond values to keep
 * timeouts consistent and easy to adjust across the entire framework.
 *
 * Environment overrides are supported via `TIMEOUT_*` variables, for example:
 * `TIMEOUT_SHORT=3000` or `TIMEOUT_LONG=20000`.
 */
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
