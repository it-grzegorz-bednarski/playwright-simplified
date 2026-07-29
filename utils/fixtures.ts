import * as fs from 'fs';
import * as path from 'path';

function sanitizeLenientJson(input: string): string {
  let result = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escape) {
      // previous char was backslash, keep as-is
      result += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      // start escape sequence
      result += ch;
      escape = true;
      continue;
    }
    if (ch === '"') {
      // toggle string state
      inString = !inString;
      result += ch;
      continue;
    }
    if (inString) {
      const code = ch.charCodeAt(0);
      if (code === 0x0a) {
        // LF inside string -> escape
        result += '\\n';
        continue;
      }
      if (code === 0x0d) {
        // CR inside string -> escape
        result += '\\r';
        continue;
      }
      if (code === 0x09) {
        // TAB inside string -> escape
        result += '\\t';
        continue;
      }
      if (code < 0x20) {
        // other control chars -> unicode escape
        result += '\\u' + code.toString(16).padStart(4, '0');
        continue;
      }
    }
    result += ch;
  }
  return result;
}

/**
 * Loads a JSON file and applies dynamic replacements to its content.
 *
 * @param projectRelativePath - Path to the file relative to the project root (e.g., 'fixtures/intercepts/userList.json')
 * @param replacements - Optional object containing placeholder-value pairs for replacement (e.g., { '%USER_NAME%': 'Alice' })
 * @returns The parsed JSON object with all placeholders replaced by their corresponding values
 *
 * @example
 * ```typescript
 * const mockResponse = loadFixtureWithReplacements('fixtures/intercepts/userGreeting.json', {
 *   '%USER_NAME%': 'Alice',
 * });
 *
 * const expectedEvent = loadFixtureWithReplacements('data/analytics/pageView.json', {
 *   '%PAGE_NAME%': 'Home',
 * });
 * ```
 */
export function loadFixtureWithReplacements(
  projectRelativePath: string,
  replacements?: Record<string, string | number>
) {
  const fromProjectRoot = path.join(__dirname, '..', projectRelativePath);
  const fromFixturesRoot = path.join(__dirname, '..', 'fixtures', projectRelativePath);
  const filePath = fs.existsSync(fromProjectRoot) ? fromProjectRoot : fromFixturesRoot;
  const raw = fs.readFileSync(filePath, 'utf-8');

  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (err: any) {
    try {
      const sanitized = sanitizeLenientJson(raw);
      json = JSON.parse(sanitized);
    } catch {
      const message = `Failed to parse JSON fixture: ${projectRelativePath}. Original error: ${err.message}.`;
      throw new Error(message);
    }
  }

  const applyReplacements = (obj: any) => {
    if (Array.isArray(obj)) {
      obj.forEach(item => applyReplacements(item));
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (typeof obj[key] === 'object') {
          applyReplacements(obj[key]);
        } else if (typeof obj[key] === 'string') {
          for (const [placeholder, value] of Object.entries(replacements || {})) {
            if (obj[key].includes(placeholder)) {
              obj[key] = obj[key].replace(placeholder, String(value));
            }
          }
        }
      }
    }
  };

  applyReplacements(json);
  return json;
}
