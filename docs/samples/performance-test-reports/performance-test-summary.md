<h1 style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px;">
      <span>Performance Test Summary</span>
      <span style="font-size: 12px; font-weight: normal; color: #555;">16.01.2026, 18:58:29</span>
    </h1>

Device configurations:

- desktop: 1920x1080 (desktop)
- mobile: 375x667 (mobile)
- desktopWide: 2560x1440 (desktop)
- tablet: 768x1024 (mobile)

## Results [Environment: dev]

### Results table (Main config)

| Page                                                                 | Device  |           Accessibility (>=80%)           |          Best Practices (>=40%)           |           Performance (>=50%)           |                SEO (>=90%)                 |
| -------------------------------------------------------------------- | ------- | :---------------------------------------: | :---------------------------------------: | :-------------------------------------: | :----------------------------------------: |
| [dynamicTablePage](https://practice.expandtesting.com/dynamic-table) | desktop | <span style="color:green">95.0% ✅</span> | <span style="color:green">59.0% ✅</span> | <span style="color:red">45.0% ❌</span> | <span style="color:green">100.0% ✅</span> |
| [dynamicTablePage](https://practice.expandtesting.com/dynamic-table) | mobile  | <span style="color:green">95.0% ✅</span> | <span style="color:green">57.0% ✅</span> | <span style="color:red">35.0% ❌</span> | <span style="color:green">100.0% ✅</span> |
| [inputsPage](https://practice.expandtesting.com/inputs)              | desktop | <span style="color:green">95.0% ✅</span> | <span style="color:green">59.0% ✅</span> | <span style="color:red">39.0% ❌</span> | <span style="color:green">100.0% ✅</span> |
| [inputsPage](https://practice.expandtesting.com/inputs)              | mobile  | <span style="color:green">95.0% ✅</span> | <span style="color:green">57.0% ✅</span> | <span style="color:red">34.0% ❌</span> | <span style="color:green">100.0% ✅</span> |

### Results table (Override profile 1)

| Page                                     | Device      |            Performance (>=50%)             |                SEO (>=60%)                |
| ---------------------------------------- | ----------- | :----------------------------------------: | :---------------------------------------: |
| [homePage](https://www.example.com?dev/) | desktopWide | <span style="color:green">100.0% ✅</span> | <span style="color:green">80.0% ✅</span> |
| [homePage](https://www.example.com?dev/) | tablet      | <span style="color:green">100.0% ✅</span> | <span style="color:green">80.0% ✅</span> |

## Summary

<div style="color:red; font-size:12px; font-weight:bold">❌ [FAIL] Some performance tests did not meet the threshold requirements.</div>

<div style="page-break-before: always;"></div>

## Configuration summary

### Main config

- devices: desktop, mobile
- logs: false
- onlyCategories: performance, accessibility, bestPractices, seo
- thresholds: performance=50, accessibility=80, bestPractices=40, seo=90, pwa=50
- skipAudits: uses-http2
- extraHeaders: none
- extraLighthouseFlags: none

### Per-URL overrides

- **[Override profile 1] homePage**
  - devices: desktopWide, tablet
  - onlyCategories: performance, seo
  - thresholds: performance=50, accessibility=undefined, bestPractices=undefined, seo=60, pwa=undefined
  - skipAudits: uses-http2, is-on-https
  - extraHeaders: hidden
  - extraLighthouseFlags: hidden
  - chrome: headless=true; flags=hidden
