import { performanceTestConfig } from '@config/feature-config/performanceTest.config';

export function isHideSensitiveDataEnabled(): boolean {
  return Boolean((performanceTestConfig as any).hideSensitiveDataInReport);
}

export function formatExtraHeadersKeysForReport(
  headerKeys: readonly string[],
  hideSensitive: boolean
): string {
  if (hideSensitive) return headerKeys.length ? 'hidden' : 'none';
  return headerKeys.length ? headerKeys.join(', ') : 'none';
}

export function formatExtraLighthouseFlagsForReport(
  flags: readonly string[],
  hideSensitive: boolean
): string {
  if (hideSensitive) return flags.length ? 'hidden' : 'none';
  return flags.length ? flags.join(', ') : 'none';
}

export function formatChromeFlagsForReport(
  flags: readonly string[],
  hideSensitive: boolean
): string {
  if (hideSensitive) return flags.length ? 'flags=hidden' : 'flags=none';
  return flags.length ? `flags=${flags.join(' ')}` : 'flags=none';
}
