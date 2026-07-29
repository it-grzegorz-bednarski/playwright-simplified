# Core Web Vitals Report

_Generated on 16.06.2026, 11:05:10_

**Test name:** homePage-sample
**URL:** https://example.com/
**Environment:** dev
**Device preset:** desktop
**Interaction action:** flipBothCheckboxes

## Results

| Metric   | Value                                       | Google result                          | Threshold                                   | Status                                           |
| -------- | ------------------------------------------- | -------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| **LCP**  | 2200 ms                                     | <span style="color:green;">GOOD</span> | <= 2500 ms                                  | <span style="color:green;">PASS</span>           |
| **CLS**  | 0.040                                       | <span style="color:green;">GOOD</span> | <= 0.1                                      | <span style="color:green;">PASS</span>           |
| **INP**  | 190 ms                                      | <span style="color:green;">GOOD</span> | <= 200 ms                                   | <span style="color:green;">PASS</span>           |
| **FCP**  | <span style="color:#6b7280;">1700 ms</span> | <span style="color:green;">GOOD</span> | <span style="color:#6b7280;">not set</span> | <span style="color:#6b7280;">NOT ASSERTED</span> |
| **TTFB** | 640 ms                                      | <span style="color:green;">GOOD</span> | <= 800 ms                                   | <span style="color:green;">PASS</span>           |

<sub>Gray "NOT ASSERTED" means the metric was measured, but no custom threshold was configured so it does not affect pass/fail.</sub>

## Metric descriptions

| Metric | Full name                 | Unit  | Google status bands                                              |
| ------ | ------------------------- | ----- | ---------------------------------------------------------------- |
| LCP    | Largest Contentful Paint  | ms    | Good: <= 2500 ms; Needs improvement: < 4000 ms; Poor: >= 4000 ms |
| CLS    | Cumulative Layout Shift   | score | Good: <= 0.10; Needs improvement: < 0.25; Poor: >= 0.25          |
| INP    | Interaction to Next Paint | ms    | Good: <= 200 ms; Needs improvement: < 500 ms; Poor: >= 500 ms    |
| FCP    | First Contentful Paint    | ms    | Good: <= 1800 ms; Needs improvement: < 3000 ms; Poor: >= 3000 ms |
| TTFB   | Time to First Byte        | ms    | Good: <= 800 ms; Needs improvement: < 1800 ms; Poor: >= 1800 ms  |
