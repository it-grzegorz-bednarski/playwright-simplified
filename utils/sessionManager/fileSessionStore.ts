import * as fs from 'fs';
import * as path from 'path';

/**
 * Minimal shape of a session stored on disk.
 *
 * File location:
 * - `build/sessions/<SESSION_LOGIN_KEY>__<USER_KEY>.session.json`
 *
 * Notes:
 * - `meta` is optional and can store additional values collected during login (e.g. auth headers).
 * - `sessionStorage` / `localStorage` dumps are optional.
 */
export interface StoredSession {
  userKey: string;
  storageState: any;
  meta?: Record<string, string>;
  sessionStorage?: Array<{ origin: string; items: { name: string; value: string }[] }>;
  localStorage?: Array<{ origin: string; items: { name: string; value: string }[] }>;
}

const SESSIONS_DIR = path.join(process.cwd(), 'build', 'sessions');
const POLL_INTERVAL_MS = 200;
const WAIT_TIMEOUT_MS = 40000;

/** Ensures `build/sessions` directory exists. */
function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/** Builds session file path for the given cache key. */
function sessionFile(cacheKey: string) {
  return path.join(SESSIONS_DIR, `${cacheKey}.session.json`);
}

/** Builds lock file path for the given cache key. */
function lockFile(cacheKey: string) {
  return path.join(SESSIONS_DIR, `${cacheKey}.lock`);
}

/**
 * Creates a stable cache key used for both session and lock files.
 *
 * If `sessionLoginKey` is provided, we include it to avoid collisions between
 * different login flows for the same `userKey`.
 */
function createCacheKey(userKey: string, sessionLoginKey?: string, sessionScopeKey?: string) {
  const baseKey = sessionLoginKey ? `${sessionLoginKey}__${userKey}` : userKey;
  return sessionScopeKey ? `${sessionScopeKey}__${baseKey}` : baseKey;
}

/**
 * Read session from disk.
 *
 * @param userKey - User identifier (e.g. `ADMIN`).
 * @param sessionLoginKey - Optional login config key used in the session file name.
 * @param sessionScopeKey - Optional project scope key (e.g. brand+locale) used to isolate session files.
 * @returns Stored session or `null` if it does not exist.
 */
export function readSession(
  userKey: string,
  sessionLoginKey?: string,
  sessionScopeKey?: string
): StoredSession | null {
  ensureDir();
  const cacheKey = createCacheKey(userKey, sessionLoginKey, sessionScopeKey);
  const file = sessionFile(cacheKey);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw) as StoredSession;
}

/**
 * Write session to disk.
 *
 * @param data - Session payload.
 * @param sessionLoginKey - Optional login config key used in the session file name.
 * @param sessionScopeKey - Optional project scope key (e.g. brand+locale) used to isolate session files.
 */
export function writeSession(
  data: StoredSession,
  sessionLoginKey?: string,
  sessionScopeKey?: string
): void {
  ensureDir();
  const cacheKey = createCacheKey(data.userKey, sessionLoginKey, sessionScopeKey);
  fs.writeFileSync(sessionFile(cacheKey), JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Try to acquire a file lock for a session.
 *
 * Uses an atomic create (`wx`) to ensure only one worker acquires the lock.
 *
 * @param userKey - User identifier.
 * @param sessionLoginKey - Optional login config key used in the lock file name.
 * @param sessionScopeKey - Optional project scope key (e.g. brand+locale) used to isolate lock files.
 * @returns `true` if lock acquired, `false` otherwise.
 */
export function tryCreateLock(
  userKey: string,
  sessionLoginKey?: string,
  sessionScopeKey?: string
): boolean {
  ensureDir();
  const cacheKey = createCacheKey(userKey, sessionLoginKey, sessionScopeKey);
  try {
    const fd = fs.openSync(lockFile(cacheKey), 'wx');
    fs.writeSync(fd, String(Date.now()));
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove lock file for the session.
 *
 * @param userKey - User identifier.
 * @param sessionLoginKey - Optional login config key used in the lock file name.
 * @param sessionScopeKey - Optional project scope key (e.g. brand+locale) used to isolate lock files.
 */
export function removeLock(
  userKey: string,
  sessionLoginKey?: string,
  sessionScopeKey?: string
): void {
  const cacheKey = createCacheKey(userKey, sessionLoginKey, sessionScopeKey);
  try {
    fs.unlinkSync(lockFile(cacheKey));
  } catch {
    // ignore
  }
}

/**
 * Wait until a session exists on disk or the lock is released.
 *
 * Used by workers that didn't acquire the lock.
 *
 * @param userKey - User identifier.
 * @param sessionLoginKey - Optional login config key used in session/lock file names.
 * @param sessionScopeKey - Optional project scope key (e.g. brand+locale) used to isolate session/lock files.
 */
export async function waitForSessionOrLockRelease(
  userKey: string,
  sessionLoginKey?: string,
  sessionScopeKey?: string
): Promise<void> {
  const start = Date.now();
  const cacheKey = createCacheKey(userKey, sessionLoginKey, sessionScopeKey);

  while (Date.now() - start < WAIT_TIMEOUT_MS) {
    if (readSession(userKey, sessionLoginKey, sessionScopeKey)) return;

    if (fs.existsSync(lockFile(cacheKey))) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Timeout waiting for session of userKey '${userKey}'.`);
}
