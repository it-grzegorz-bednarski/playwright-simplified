export type ApiLogEvent = {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
};

/**
 * Safely preview large payloads for logging (truncates long strings/JSON).
 *
 * @param value - Any value to stringify.
 * @param maxLen - Max serialized length before truncation.
 */
function safePreview(value: any, maxLen = 8000): any {
  if (value === undefined) return undefined;
  try {
    const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    if (str.length <= maxLen) return typeof value === 'string' ? str : JSON.parse(str);
    return str.slice(0, maxLen) + `\n... (truncated, ${str.length} chars)`;
  } catch {
    return value;
  }
}

/**
 * Print request/response log in a readable format.
 *
 * @param e - Log event payload.
 *
 * @example
 * logApiEvent({ method: 'GET', url: '/health', status: 200, durationMs: 12 });
 */
export function logApiEvent(e: ApiLogEvent) {
  const header = `[Api] ${e.method} ${e.url} -> ${e.status} (${e.durationMs} ms)`;

  // No masking: always print real header values.
  const reqHeaders = e.requestHeaders;
  const resHeaders = e.responseHeaders;

  console.log(header);
  console.log(`===== [Api] Request =====`);
  console.log(JSON.stringify({ headers: reqHeaders, body: safePreview(e.requestBody) }, null, 2));
  console.log(`===== [Api] Response =====`);
  console.log(JSON.stringify({ headers: resHeaders, body: safePreview(e.responseBody) }, null, 2));
}

// Mark as used when imported conditionally.
void logApiEvent;
