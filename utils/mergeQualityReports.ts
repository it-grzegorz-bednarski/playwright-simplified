import { mergeAccessibilityReports } from '@utils/accessibility/accessibilityReport';
import { mergeConsoleErrorsReports } from '@utils/assertNoConsoleErrorsReport';
import { mergeCspReports } from '@utils/cspCheck/cspReport';
import { mergeHtmlValidateReports } from '@utils/htmlValidator/htmlValidatorReport';
import { mergeLinkCheckReports } from '@utils/linkCheck/linkCheckReport';
import { mergePerformanceMonitoringReports } from '@utils/performance/performanceMonitoringReport';
import { mergePerformanceTestReports } from '@utils/performance/performanceTestReport';
import { mergeSecurityHeadersReports } from '@utils/securityHeaders/securityHeadersReport';
import { mergeWebVitalsReports } from '@utils/webVitals/webVitalsReport';

/**
 * Runs all quality-report merge/PDF-generation tasks unconditionally.
 *
 * Background:
 * In `global-teardown.ts` every merge*Reports() call is wrapped with
 * `runWithoutCiSharding(...)`, which intentionally skips the task when
 * running as a CI shard (each shard only has a partial slice of results,
 * so per-shard aggregated reports/PDFs would be incomplete/misleading).
 *
 * For sharded CI runs, this helper must be run exactly once, after all
 * shard artifacts have been combined into a single `build/artifacts`
 * directory (see `.github/workflows/playwright-dispatch-sharded.yml`,
 * `merge-reports` job). It bypasses `runWithoutCiSharding` on purpose so
 * the merged/aggregated reports and PDFs are generated from the complete,
 * combined dataset.
 *
 * Invoked directly from the CI workflow via `ts-node`/`tsconfig-paths`
 * (no dedicated Playwright config or test file needed), so `@utils` path
 * aliases resolve the same way they do everywhere else in the project.
 */
export default async function mergeQualityReports(): Promise<void> {
  console.log(
    '[mergeQualityReports] Starting merge of quality reports (accessibility, CSP, etc.)...'
  );

  await mergeAccessibilityReports();
  await mergeConsoleErrorsReports();
  await mergeCspReports();
  await mergeHtmlValidateReports();
  await mergeLinkCheckReports();
  await mergePerformanceMonitoringReports();
  await mergePerformanceTestReports();
  await mergeSecurityHeadersReports();
  await mergeWebVitalsReports();

  console.log('[mergeQualityReports] Done.');
}
