# mdToPdf Utility

← [Back to main documentation](../README.md)

## Overview

Utility for converting Markdown files to PDF documents (used e.g. for accessibility reports).

---

## Configuration

To use this utility, install **`md-to-pdf`** as a dev dependency:

```bash
yarn add -D md-to-pdf
```

- **`inputPath`** – path to the source `.md` file
- **`outputPath`** _(optional)_ – custom output `.pdf` path (defaults to input name with `.pdf`)
- **`cssPath`** _(optional)_ – path to a CSS file used for styling the PDF
- **`format`** _(optional)_ – page format, for example **`A4`** or **`Letter`**
- **`margin`** _(optional)_ – page margins (top, right, bottom, left)
- **`displayHeaderFooter`** _(optional)_ – whether to render header and footer
- **`headerTemplate`** _(optional)_ – HTML template for the header (requires `displayHeaderFooter`)
- **`footerTemplate`** _(optional)_ – HTML template for the footer (requires `displayHeaderFooter`)

---

## Usage

```typescript
import { convertMarkdownToPdf, convertAccessibilityReportToPdf } from '../utils/mdToPdf';

// Generic Markdown -> PDF
const pdfPath = await convertMarkdownToPdf('./docs/example.md');

// Markdown accessibility report -> PDF (preconfigured styling)
const accessibilityPdfPath = await convertAccessibilityReportToPdf('./build/reports/example.md');
```

---

## Advanced usage

Use a custom stylesheet and page options for a specific Markdown file:

```typescript
import { convertMarkdownToPdf } from '../utils/mdToPdf';

await convertMarkdownToPdf('./docs/example.md', {
  outputPath: './build/reports/example.pdf',
  cssPath: './docs/styles/example-pdf.css',
  format: 'A4',
  margin: {
    top: '10mm',
    right: '15mm',
    bottom: '15mm',
    left: '15mm',
  },
  displayHeaderFooter: true,
  headerTemplate: '<span style="font-size:10px;">Example report</span>',
  footerTemplate:
    '<span style="font-size:10px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>',
});
```

The utility automatically handles styling and page formatting for accessibility reports. Custom CSS styling can be applied by providing a **`cssPath`** option when calling **`convertMarkdownToPdf`** (accessibility reports use **`accessibility-report.css`**).
