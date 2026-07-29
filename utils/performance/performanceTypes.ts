import type { PerformanceDeviceKey } from '@config/feature-config/performanceDevices.config';

export const performanceCategories = [
  'performance',
  'accessibility',
  'bestPractices',
  'seo',
  'pwa',
] as const;

export type PerformanceCategory = (typeof performanceCategories)[number];

export type PerformanceThresholds = Partial<Record<PerformanceCategory, number>>;

export interface PerformanceChromeConfig {
  headless?: boolean;
  flags?: readonly string[];
}

export interface PerformanceUrlToTestConfig {
  name: string;
  path: string;
  devices?: readonly PerformanceDeviceKey[];
  logs?: boolean;
  chrome?: PerformanceChromeConfig;
  extraHeaders?: Record<string, string>;
  extraLighthouseFlags?: readonly string[];
  skipAudits?: readonly string[];
  onlyCategories?: readonly PerformanceCategory[];
  thresholds?: PerformanceThresholds;
}

export interface BuiltPerformanceUrlConfig {
  name: string;
  url: string;
  devices: readonly PerformanceDeviceKey[];
  logs: boolean;
  chrome: PerformanceChromeConfig;
  extraHeaders: Record<string, string>;
  extraLighthouseFlags: readonly string[];
  skipAudits: readonly string[];
  onlyCategories: readonly PerformanceCategory[];
  thresholds: Record<PerformanceCategory, number>;
}

/** Runtime options passed directly to runPerformanceTest */
export interface PerformanceTestOptions {
  devices?: readonly PerformanceDeviceKey[];
  logs?: boolean;
  chrome?: PerformanceChromeConfig;
  extraHeaders?: Record<string, string>;
  extraLighthouseFlags?: readonly string[];
  skipAudits?: readonly string[];
  onlyCategories?: readonly PerformanceCategory[];
  thresholds?: PerformanceThresholds;
}

/** Runtime options passed directly to runPerformanceMonitoring */
export interface PerformanceMonitoringOptions {
  devices?: readonly PerformanceDeviceKey[];
  logs?: boolean;
  chrome?: PerformanceChromeConfig;
  extraHeaders?: Record<string, string>;
  extraLighthouseFlags?: readonly string[];
  skipAudits?: readonly string[];
  onlyCategories?: readonly PerformanceCategory[];
  /** Override number of Lighthouse runs (default: from performanceMonitoring.config.ts) */
  numberOfRuns?: number;
}
