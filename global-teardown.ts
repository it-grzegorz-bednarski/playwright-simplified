import { runWithoutCiSharding } from '@utils/runWithoutCiSharding';
import { mergeAccessibilityReports } from '@utils/accessibility/accessibilityReport';
import { mergeConsoleErrorsReports } from '@utils/assertNoConsoleErrorsReport';
import { mergeCspReports } from '@utils/cspCheck/cspReport';
import { mergeHtmlValidateReports } from '@utils/htmlValidator/htmlValidatorReport';
import { mergeLinkCheckReports } from '@utils/linkCheck/linkCheckReport';
import { mergePerformanceMonitoringReports } from '@utils/performance/performanceMonitoringReport';
import { mergePerformanceTestReports } from '@utils/performance/performanceTestReport';
import { mergeSecurityHeadersReports } from '@utils/securityHeaders/securityHeadersReport';
import { mergeWebVitalsReports } from '@utils/webVitals/webVitalsReport';

export default async function globalTeardown(): Promise<void> {
  await runWithoutCiSharding(mergeAccessibilityReports);
  await runWithoutCiSharding(mergeConsoleErrorsReports);
  await runWithoutCiSharding(mergeCspReports);
  await runWithoutCiSharding(mergeHtmlValidateReports);
  await runWithoutCiSharding(mergeLinkCheckReports);
  await runWithoutCiSharding(mergePerformanceMonitoringReports);
  await runWithoutCiSharding(mergePerformanceTestReports);
  await runWithoutCiSharding(mergeSecurityHeadersReports);
  await runWithoutCiSharding(mergeWebVitalsReports);
}
