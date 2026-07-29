import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect, test } from '@playwright/test';
import { loadEnvironmentConfig } from '@utils/envLoader';

const snapshotKeys = [
  'LOCALES',
  'BASE_URL_PL',
  'BASE_URL_CS',
  'BASE_URL_EN',
  'BASE_URL_AR',
  'USER_PL',
  'PASS_PL',
  'GROUP_SLAVIC',
  'GROUP_TAG_SLAVIC',
] as const;

test.describe('env loader', { tag: '@testBrand' }, () => {
  test.describe.configure({ mode: 'serial' });

  test('loads multi-locale values from env/.env.<env> file', async () => {
    const previousValues = new Map<string, string | undefined>();

    for (const key of snapshotKeys) {
      previousValues.set(key, process.env[key]);
      delete process.env[key];
    }

    const tempEnvDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-simplified-env-'));
    const envFilePath = path.join(tempEnvDirectory, '.env.qa');

    fs.writeFileSync(
      envFilePath,
      [
        'LOCALES=pl,cs,en,ar',
        'BASE_URL_PL=https://qa.example.com/pl',
        'BASE_URL_CS=https://qa.example.com/cs',
        'BASE_URL_EN=https://qa.example.com/en',
        'BASE_URL_AR=https://qa.example.com/ar',
        'USER_PL=qa_pl',
        'PASS_PL=qa_pl_secret',
        'GROUP_SLAVIC=pl,cs',
        'GROUP_TAG_SLAVIC=slavic',
      ].join('\n'),
      'utf8'
    );

    try {
      const loadedFile = loadEnvironmentConfig(
        'qa',
        {
          override: true,
          enableLogging: false,
        },
        tempEnvDirectory
      );

      expect(loadedFile).toBe(envFilePath);
      expect(process.env.LOCALES).toBe('pl,cs,en,ar');
      expect(process.env.BASE_URL_PL).toBe('https://qa.example.com/pl');
      expect(process.env.BASE_URL_CS).toBe('https://qa.example.com/cs');
      expect(process.env.BASE_URL_EN).toBe('https://qa.example.com/en');
      expect(process.env.BASE_URL_AR).toBe('https://qa.example.com/ar');
      expect(process.env.USER_PL).toBe('qa_pl');
      expect(process.env.PASS_PL).toBe('qa_pl_secret');
      expect(process.env.GROUP_SLAVIC).toBe('pl,cs');
      expect(process.env.GROUP_TAG_SLAVIC).toBe('slavic');
    } finally {
      fs.rmSync(tempEnvDirectory, { recursive: true, force: true });

      for (const key of snapshotKeys) {
        const value = previousValues.get(key);
        if (typeof value === 'undefined') {
          delete process.env[key];
          continue;
        }

        process.env[key] = value;
      }
    }
  });

  test('throws clear error when target env file is missing', async () => {
    const tempEnvDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-simplified-env-missing-'));

    try {
      expect(() =>
        loadEnvironmentConfig(
          'staging',
          {
            override: true,
            enableLogging: false,
          },
          tempEnvDirectory
        )
      ).toThrow(/Environment file not found/);
    } finally {
      fs.rmSync(tempEnvDirectory, { recursive: true, force: true });
    }
  });

  test('does not overwrite existing values when override=false', async () => {
    const tempEnvDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'pw-simplified-env-no-override-')
    );
    const envFilePath = path.join(tempEnvDirectory, '.env.dev');
    const previousBaseUrl = process.env.BASE_URL_PL;

    process.env.BASE_URL_PL = 'https://existing.example.com/pl';
    fs.writeFileSync(envFilePath, 'BASE_URL_PL=https://from-file.example.com/pl', 'utf8');

    try {
      loadEnvironmentConfig(
        'dev',
        {
          override: false,
          enableLogging: false,
        },
        tempEnvDirectory
      );

      expect(process.env.BASE_URL_PL).toBe('https://existing.example.com/pl');
    } finally {
      fs.rmSync(tempEnvDirectory, { recursive: true, force: true });

      if (typeof previousBaseUrl === 'undefined') {
        delete process.env.BASE_URL_PL;
      } else {
        process.env.BASE_URL_PL = previousBaseUrl;
      }
    }
  });

  test('overwrites existing values when override=true', async () => {
    const tempEnvDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-simplified-env-override-'));
    const envFilePath = path.join(tempEnvDirectory, '.env.dev');
    const previousBaseUrl = process.env.BASE_URL_PL;

    process.env.BASE_URL_PL = 'https://existing.example.com/pl';
    fs.writeFileSync(envFilePath, 'BASE_URL_PL=https://from-file.example.com/pl', 'utf8');

    try {
      loadEnvironmentConfig(
        'dev',
        {
          override: true,
          enableLogging: false,
        },
        tempEnvDirectory
      );

      expect(process.env.BASE_URL_PL).toBe('https://from-file.example.com/pl');
    } finally {
      fs.rmSync(tempEnvDirectory, { recursive: true, force: true });

      if (typeof previousBaseUrl === 'undefined') {
        delete process.env.BASE_URL_PL;
      } else {
        process.env.BASE_URL_PL = previousBaseUrl;
      }
    }
  });

  test('logs loaded environment only once per process when enableLogging=true', async () => {
    const tempEnvDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-simplified-env-logging-'));
    const originalConsoleLog = console.log;
    const previousEnvFileLoggedFlag = process.env.__ENV_FILE_LOGGED__;
    const messages: string[] = [];

    fs.writeFileSync(
      path.join(tempEnvDirectory, '.env.dev'),
      'BASE_URL_PL=https://dev.example.com/pl',
      'utf8'
    );
    fs.writeFileSync(
      path.join(tempEnvDirectory, '.env.qa'),
      'BASE_URL_PL=https://qa.example.com/pl',
      'utf8'
    );

    console.log = (message?: unknown, ...optionalParams: unknown[]) => {
      messages.push([message, ...optionalParams].map(String).join(' '));
    };
    delete process.env.__ENV_FILE_LOGGED__;

    try {
      loadEnvironmentConfig(
        'dev',
        {
          override: true,
          enableLogging: true,
        },
        tempEnvDirectory
      );

      loadEnvironmentConfig(
        'qa',
        {
          override: true,
          enableLogging: true,
        },
        tempEnvDirectory
      );

      expect(messages).toEqual(['[env-loader] Loaded environment: dev']);
    } finally {
      console.log = originalConsoleLog;

      if (typeof previousEnvFileLoggedFlag === 'undefined') {
        delete process.env.__ENV_FILE_LOGGED__;
      } else {
        process.env.__ENV_FILE_LOGGED__ = previousEnvFileLoggedFlag;
      }

      fs.rmSync(tempEnvDirectory, { recursive: true, force: true });
    }
  });
});
