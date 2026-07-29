import { performanceTestConfig } from '@config/feature-config/performanceTest.config';
import type { BuiltPerformanceUrlConfig, PerformanceUrlToTestConfig } from './performanceTypes';

export interface PerformanceUrlContext {
  env: string;
  baseUrl: string;
}

function buildContext(env: string): PerformanceUrlContext {
  const baseUrl = process.env.BASE_URL || '';
  return { env, baseUrl };
}

function resolvePath(entry: { path: string }, ctx: PerformanceUrlContext): string {
  if (entry.path.startsWith('http://') || entry.path.startsWith('https://')) {
    return entry.path;
  }

  if (!ctx.baseUrl) {
    throw new Error(
      `Cannot resolve relative performance path "${entry.path}" without BASE_URL. ` +
        'Provide absolute URLs in entries or set BASE_URL in environment.'
    );
  }

  const normalizedPath = entry.path.startsWith('/') ? entry.path.slice(1) : entry.path;
  const base = ctx.baseUrl.replace(/\/+$/, '');
  return `${base}/${normalizedPath}`;
}

function normalizeTestEntry(
  entry: PerformanceUrlToTestConfig,
  ctx: PerformanceUrlContext
): BuiltPerformanceUrlConfig {
  const thresholds = {
    performance: entry.thresholds?.performance ?? performanceTestConfig.thresholds.performance,
    accessibility:
      entry.thresholds?.accessibility ?? performanceTestConfig.thresholds.accessibility,
    bestPractices:
      entry.thresholds?.bestPractices ?? performanceTestConfig.thresholds.bestPractices,
    seo: entry.thresholds?.seo ?? performanceTestConfig.thresholds.seo,
    pwa: entry.thresholds?.pwa ?? performanceTestConfig.thresholds.pwa,
  };

  return {
    name: entry.name,
    url: resolvePath(entry, ctx),

    devices: entry.devices ?? performanceTestConfig.devices,
    logs: entry.logs ?? performanceTestConfig.logs,
    chrome: entry.chrome ?? performanceTestConfig.chrome,
    extraHeaders: entry.extraHeaders ?? performanceTestConfig.extraHeaders,
    extraLighthouseFlags: entry.extraLighthouseFlags ?? performanceTestConfig.extraLighthouseFlags,
    skipAudits: entry.skipAudits ?? performanceTestConfig.skipAudits,

    onlyCategories: entry.onlyCategories ?? performanceTestConfig.onlyCategories,
    thresholds,
  };
}

export function buildPerformanceUrls(
  env: string,
  entries: readonly PerformanceUrlToTestConfig[] = []
): BuiltPerformanceUrlConfig[] {
  const ctx = buildContext(env);
  return entries.map(entry => normalizeTestEntry(entry, ctx));
}
