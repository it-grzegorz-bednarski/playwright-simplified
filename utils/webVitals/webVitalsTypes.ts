import type { Page } from '@playwright/test';
import { cwvMetricKeys } from './webVitalsCore.types';
import type {
  CwvMetricKey,
  CwvThresholds,
  WebVitalsDeviceKey,
  WebVitalsDevicePreset,
} from './webVitalsCore.types';

// ─── Metric keys ─────────────────────────────────────────────────────────────

export { cwvMetricKeys };

/**
 * Supported Core Web Vitals + supporting metrics:
 *
 * LCP  – Largest Contentful Paint   – how quickly the main content loads (ms)
 * CLS  – Cumulative Layout Shift    – visual stability; how much the page shifts during load (unitless score, lower = better)
 * INP  – Interaction to Next Paint  – responsiveness to user input (ms)
 * FCP  – First Contentful Paint     – when the first content appears on screen (ms)
 * TTFB – Time to First Byte         – server response time; network and server speed (ms)
 */
export type { CwvMetricKey };

/**
 * Partial thresholds – define only the metrics you want to assert.
 * Metrics without a threshold are still collected and reported, but never fail the test.
 *
 * Units:
 *   LCP / FCP / TTFB / INP  →  milliseconds (ms)
 *   CLS                      →  unitless decimal score (e.g. 0.1)
 */
export type { CwvThresholds };

export type CwvRating = 'good' | 'needs-improvement' | 'poor';

export type { WebVitalsDeviceKey, WebVitalsDevicePreset };

// ─── Result types ─────────────────────────────────────────────────────────────

export interface CwvMetricResult {
  /** Metric name */
  metric: CwvMetricKey;
  /** Measured value; undefined if the metric could not be collected */
  value: number | undefined;
  /** Unit of the value */
  unit: 'ms' | 'score';
  /** Google-defined rating for the collected value */
  rating: CwvRating | undefined;
  /** Configured threshold for pass/fail; undefined if not configured */
  threshold: number | undefined;
  /** Whether the metric passed its threshold; undefined if no threshold is configured */
  passed: boolean | undefined;
}

export interface WebVitalsPageResult {
  name: string;
  url: string;
  deviceName?: WebVitalsDeviceKey;
  interactionActionUsed?: string;
  metrics: CwvMetricResult[];
  /** true if all configured thresholds pass (or no thresholds are configured) */
  allPassed: boolean;
}

export interface WebVitalsRunSummary {
  startedAt: string;
  env: string;
  allPassed: boolean;
  results: WebVitalsPageResult[];
}

// ─── Public options ───────────────────────────────────────────────────────────

export interface WebVitalsInteractionContext {
  page: Page;
  target: unknown;
}

export type WebVitalsInteractionAction = (context: WebVitalsInteractionContext) => Promise<void>;

/**
 * Per-call options for runWebVitals — all fields override the global config.
 */
export interface WebVitalsOptions {
  /**
   * Thresholds for pass/fail — define only the metrics you want to assert.
   * Omit a metric or set to undefined to collect it without asserting.
   */
  thresholds?: CwvThresholds;
  /**
   * How long (ms) to wait after network idle before reading metrics.
   * Increase for pages with late-loading or deferred content.
   */
  collectTimeout?: number;
  /**
   * Device presets to execute in a single run (e.g. desktop + mobile).
   * If provided, runWebVitals executes all of them and writes one multi-device report.
   */
  devices?: readonly WebVitalsDeviceKey[];
  /**
   * Enable the configured interaction action to generate an INP timing entry.
   * Disable if you want a pure non-interactive collection run.
   */
  triggerInteractionForInp?: boolean;
  /**
   * Name of a reusable interaction action defined in webVitalsActions config.
   * Useful for page-specific INP flows such as toggling a checkbox or selecting a dropdown option.
   */
  interactionActionName?: string;
  /**
   * Inline custom interaction action. Takes priority over interactionActionName.
   */
  interactionAction?: WebVitalsInteractionAction;
  /**
   * How long (ms) to wait after the interaction action before reading metrics.
   */
  interactionDelayMs?: number;
}
