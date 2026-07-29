# Core Web Vitals Summary

_Generated on 16.06.2026, 11:12:10_

**Environment:** dev

## Results

| Page                                                                            | Device  |                                                                        LCP                                                                        |                                                                              CLS                                                                              |                                                                              INP                                                                               |                                                                                    FCP                                                                                    |                                                                             TTFB                                                                              |
| ------------------------------------------------------------------------------- | ------- | :-----------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------: |
| [homePage](https://example.com/)<br/><sub>Action: flipBothCheckboxes</sub>      | desktop | <span style="color:#e5e7eb;">2100 ms</span><br/><span style="color:green;">Google: GOOD</span><br/><span style="color:green;">Custom: PASS</span> |        <span style="color:#e5e7eb;">0.060</span><br/><span style="color:green;">Google: GOOD</span><br/><span style="color:green;">Custom: PASS</span>        |        <span style="color:#e5e7eb;">185 ms</span><br/><span style="color:green;">Google: GOOD</span><br/><span style="color:green;">Custom: PASS</span>        | <span style="color:#9ca3af;">1950 ms</span><br/><span style="color:orange;">Google: NEEDS IMPROVEMENT</span><br/><span style="color:#6b7280;">Custom: NOT ASSERTED</span> |       <span style="color:#e5e7eb;">620 ms</span><br/><span style="color:green;">Google: GOOD</span><br/><span style="color:green;">Custom: PASS</span>        |
| [checkoutPage](https://example.com/checkout)<br/><sub>Action: centerClick</sub> | mobile  |   <span style="color:#e5e7eb;">4350 ms</span><br/><span style="color:red;">Google: POOR</span><br/><span style="color:red;">Custom: FAIL</span>   | <span style="color:#e5e7eb;">0.110</span><br/><span style="color:orange;">Google: NEEDS IMPROVEMENT</span><br/><span style="color:green;">Custom: PASS</span> | <span style="color:#e5e7eb;">340 ms</span><br/><span style="color:orange;">Google: NEEDS IMPROVEMENT</span><br/><span style="color:green;">Custom: PASS</span> | <span style="color:#9ca3af;">2600 ms</span><br/><span style="color:orange;">Google: NEEDS IMPROVEMENT</span><br/><span style="color:#6b7280;">Custom: NOT ASSERTED</span> | <span style="color:#e5e7eb;">1020 ms</span><br/><span style="color:orange;">Google: NEEDS IMPROVEMENT</span><br/><span style="color:red;">Custom: FAIL</span> |

<sub>Gray "Custom: NOT ASSERTED" means the metric was measured, but no custom threshold was configured so it does not affect pass/fail.</sub>

<div style="color:red; font-weight:700;">✗ Some web vitals checks failed</div>

## Metric descriptions

| Metric | Full name                 | Unit  | Google status bands                                              |
| ------ | ------------------------- | ----- | ---------------------------------------------------------------- |
| LCP    | Largest Contentful Paint  | ms    | Good: <= 2500 ms; Needs improvement: < 4000 ms; Poor: >= 4000 ms |
| CLS    | Cumulative Layout Shift   | score | Good: <= 0.10; Needs improvement: < 0.25; Poor: >= 0.25          |
| INP    | Interaction to Next Paint | ms    | Good: <= 200 ms; Needs improvement: < 500 ms; Poor: >= 500 ms    |
| FCP    | First Contentful Paint    | ms    | Good: <= 1800 ms; Needs improvement: < 3000 ms; Poor: >= 3000 ms |
| TTFB   | Time to First Byte        | ms    | Good: <= 800 ms; Needs improvement: < 1800 ms; Poor: >= 1800 ms  |
