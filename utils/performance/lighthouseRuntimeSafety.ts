import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isRetriableWindowsLighthouseTempError(error: unknown): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  const message = String((error as { message?: string })?.message || error || '');
  const lowered = message.toLowerCase();
  const hasPermissionSignal =
    lowered.includes('eperm') ||
    lowered.includes('permission denied') ||
    lowered.includes('operation not permitted');

  return (
    hasPermissionSignal &&
    (lowered.includes('\\temp\\lighthouse.') || lowered.includes('/temp/lighthouse.'))
  );
}

export function createIsolatedChromeUserDataDir(prefix = 'pw-lighthouse-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function createIsolatedLighthouseTempDir(prefix = 'pw-lighthouse-tmp-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export async function withTemporarySystemTempDir<T>(
  tempDir: string,
  action: () => Promise<T>
): Promise<T> {
  const previousTemp = process.env.TEMP;
  const previousTmp = process.env.TMP;
  const previousTmpDir = process.env.TMPDIR;

  process.env.TEMP = tempDir;
  process.env.TMP = tempDir;
  process.env.TMPDIR = tempDir;

  try {
    return await action();
  } finally {
    if (previousTemp === undefined) delete process.env.TEMP;
    else process.env.TEMP = previousTemp;

    if (previousTmp === undefined) delete process.env.TMP;
    else process.env.TMP = previousTmp;

    if (previousTmpDir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = previousTmpDir;
  }
}

export async function removeDirWithRetry(
  dirPath: string,
  attempts = 5,
  delayMs = 250
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return;
    } catch {
      if (attempt === attempts) {
        return;
      }
      await sleep(delayMs * attempt);
    }
  }
}

export async function killLauncherWithRetry(
  launcher: { kill: () => Promise<void> },
  attempts = 3,
  delayMs = 200
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await launcher.kill();
      await sleep(delayMs);
      return;
    } catch {
      if (attempt === attempts) {
        return;
      }
      await sleep(delayMs * attempt);
    }
  }
}

export async function backoffBeforeRetry(attempt: number): Promise<void> {
  await sleep(400 * attempt);
}
