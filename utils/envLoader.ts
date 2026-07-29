import * as fs from 'fs';
import * as path from 'path';
import { parseEnv } from 'node:util';

export interface EnvLoaderOptions {
  override: boolean;
  enableLogging: boolean;
}

const ENV_DIRECTORY = 'env';

function resolveEnvDirectory(envDirectory: string): string {
  return path.isAbsolute(envDirectory) ? envDirectory : path.resolve(process.cwd(), envDirectory);
}

function resolveEnvironmentFilePath(env: string, envDirectory = ENV_DIRECTORY): string {
  const envName = env.trim();

  if (!envName) {
    throw new Error(
      '[env-loader] Environment name cannot be empty. Set ENV to a value like "dev".'
    );
  }

  return path.resolve(resolveEnvDirectory(envDirectory), `.env.${envName}`);
}

/**
 * Loads environment variables from env/.env.<env>.
 *
 * Throws when the target file does not exist.
 */
export function loadEnvironmentConfig(
  env: string,
  options: EnvLoaderOptions,
  envDirectory = ENV_DIRECTORY
): string {
  const { override, enableLogging } = options;
  const envName = env.trim();
  const envFile = resolveEnvironmentFilePath(envName, envDirectory);

  if (!fs.existsSync(envFile)) {
    throw new Error(
      `[env-loader] Environment file not found: ${path.relative(process.cwd(), envFile)}`
    );
  }

  const fileContent = fs.readFileSync(envFile, 'utf8');
  const parsed = parseEnv(fileContent);

  for (const [key, value] of Object.entries(parsed)) {
    if (!override && typeof process.env[key] !== 'undefined') {
      continue;
    }

    process.env[key] = value;
  }

  if (enableLogging && process.env.__ENV_FILE_LOGGED__ !== 'true') {
    process.env.__ENV_FILE_LOGGED__ = 'true';
    console.log(`[env-loader] Loaded environment: ${envName}`);
  }

  return envFile;
}

/**
 * Initializes env loader with defaults and exits the process on configuration error.
 */
export function initializeEnvLoader(env: string, options?: Partial<EnvLoaderOptions>): void {
  const defaultOptions: EnvLoaderOptions = {
    override: true,
    enableLogging: true,
  };

  const mergedOptions: EnvLoaderOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    loadEnvironmentConfig(env, mergedOptions);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : '[env-loader] Unknown error while loading environment config';
    console.error(message);
    process.exit(1);
  }
}

/**
 * Initializes env loading based on process.env.ENV (opt-in).
 */
export function initializeEnvFromProcess(options?: Partial<EnvLoaderOptions>): void {
  const requestedEnvironment = process.env.ENV?.trim();

  if (!requestedEnvironment) {
    return;
  }

  initializeEnvLoader(requestedEnvironment, options);
}
