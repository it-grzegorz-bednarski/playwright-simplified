import * as fs from 'fs';
import * as path from 'path';
// Use default import; md-to-pdf exports a default function
import mdToPdf from 'md-to-pdf';
import { chromium } from 'playwright';

export interface MdToPdfOptions {
  /** Output PDF file path. If not provided, uses same name as input with .pdf extension */
  outputPath?: string;
  /** CSS file path for styling the PDF */
  cssPath?: string;
  /** Page format (A4, Letter, etc.) */
  format?: string;
  /** Page margins */
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** Enable or disable header and footer */
  displayHeaderFooter?: boolean;
  /** Custom header template */
  headerTemplate?: string;
  /** Custom footer template */
  footerTemplate?: string;
}

/**
 * Resolves the Chromium executable path for Puppeteer.
 * Priority:
 *  1. PUPPETEER_EXECUTABLE_PATH env var (explicit override)
 *  2. Playwright's bundled Chromium (already installed in CI via `playwright install`)
 *  3. undefined — Puppeteer uses its own default (may fail if not downloaded)
 */
function resolveChromiumExecutablePath(): string | undefined {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath) return envPath;

  try {
    const execPath = chromium.executablePath();
    if (execPath && fs.existsSync(execPath)) return execPath;
  } catch {
    // playwright not available or executable not found
  }

  return undefined;
}

/**
 * Converts markdown file to PDF using md-to-pdf API
 * @param inputPath Path to the markdown file
 * @param options Conversion options
 * @returns Promise<string> Path to the generated PDF file
 */
export async function convertMarkdownToPdf(
  inputPath: string,
  options: MdToPdfOptions = {}
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Markdown file not found: ${inputPath}`);
  }

  const outputPath = options.outputPath || inputPath.replace(/\.md$/, '.pdf');

  try {
    const executablePath = resolveChromiumExecutablePath();

    const pdfOptions = {
      pdf_options: {
        format: options.format || 'A4',
        margin: {
          top: options.margin?.top || '20mm',
          right: options.margin?.right || '20mm',
          bottom: options.margin?.bottom || '20mm',
          left: options.margin?.left || '20mm',
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
      },
      stylesheet: options.cssPath ? [options.cssPath] : undefined,
      ...(executablePath
        ? { launch_options: { executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] } }
        : {}),
    };

    const pdf = await mdToPdf({ path: inputPath }, pdfOptions as any);

    if (pdf.content) {
      fs.writeFileSync(outputPath, pdf.content);
      return outputPath;
    }
    throw new Error('PDF content is empty');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mdToPdf] PDF generation failed for: ${inputPath} — ${message}`);
    throw error;
  }
}

/**
 * Converts accessibility report markdown to PDF with predefined styling
 * @param markdownPath Path to the accessibility report markdown file
 * @param outputDir Directory where to save the PDF (optional, defaults to same as markdown)
 * @returns Promise<string> Path to the generated PDF file
 */
export async function convertAccessibilityReportToPdf(
  markdownPath: string,
  outputDir?: string
): Promise<string> {
  const outputPath = outputDir
    ? path.join(outputDir, 'accessibility-report.pdf')
    : markdownPath.replace(/\.md$/, '.pdf');

  const cssPath = path.join(__dirname, 'accessibility', 'accessibility-report.css');

  const options: MdToPdfOptions = {
    outputPath,
    cssPath,
    format: 'A4',
    margin: {
      top: '5mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm',
    },
    displayHeaderFooter: false,
    headerTemplate: '',
    footerTemplate: '',
  };

  return convertMarkdownToPdf(markdownPath, options);
}
