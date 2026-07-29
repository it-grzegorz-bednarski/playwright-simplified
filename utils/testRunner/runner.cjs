const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync } = require('child_process');
const { parseEnv } = require('node:util');
const testRunnerConfig = require('../../config/testRunner.config.cjs');
const aliasUtils = require('./aliases.cjs');
const helpPrinter = require('./helpPrinter.cjs');
const { triggerGithubRun } = require('./githubDispatcher.cjs');

const BUILD_DIR = 'build';
const ERROR_LOG_RELATIVE_PATH = `${BUILD_DIR}\\error.log`;
const PERCY_CONFIG_RELATIVE_PATH = path.join('config', 'feature-config', 'percy.yml');

function getBuildDir() {
  try {
    const configPath = path.resolve(process.cwd(), 'playwright.config.ts');
    if (!fs.existsSync(configPath)) {
      return BUILD_DIR;
    }

    const text = fs.readFileSync(configPath, 'utf8');
    const match = text.match(/export\s+const\s+buildDir\s*=\s*['"]([^'"]+)['"]/);
    return match && match[1] ? match[1] : BUILD_DIR;
  } catch {
    return BUILD_DIR;
  }
}

function isCiRuntime() {
  return Boolean(
    process.env.CI ||
      process.env.GITHUB_ACTIONS ||
      process.env.GITLAB_CI ||
      process.env.BUILD_BUILDID ||
      process.env.JENKINS_HOME ||
      process.env.TF_BUILD
  );
}

function ensureBuildDir() {
  const dir = path.resolve(process.cwd(), BUILD_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeErrorLog(text) {
  const logDir = ensureBuildDir();
  const logPath = path.join(logDir, 'error.log');
  fs.writeFileSync(logPath, String(text || '').trim() + '\n', 'utf8');
}

function printFailure(title, details) {
  console.error('==================================================================');
  console.error(title);
  console.error('==================================================================');

  if (details) {
    console.error(String(details));
  }

  try {
    writeErrorLog(details || title);
    console.error(`\nMore details saved to: ${ERROR_LOG_RELATIVE_PATH}\n`);
  } catch {
    // no-op
  }
}

function printSection(title) {
  console.log('==================================================================');
  console.log(title);
  console.log('==================================================================\n');
}

function runCommandCapture(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
}

function runCommandWithExit(command, args, failureTitle) {
  const res = runCommandCapture(command, args);

  if (res.error) {
    printFailure(failureTitle, res.error.stack || res.error.message || String(res.error));
    process.exit(1);
  }

  if (res.status === null) {
    printFailure(failureTitle, `Process terminated by signal: ${res.signal || 'unknown'}`);
    process.exit(1);
  }

  if (res.status !== 0) {
    const details = [
      `Command exited with code ${res.status}.`,
      'See error output above for root cause.',
      `If available, check: ${ERROR_LOG_RELATIVE_PATH}`,
    ].join('\n');
    printFailure(failureTitle, details);
    process.exit(res.status);
  }

  process.exit(res.status);
}

function runEslint() {
  printSection('Running ESLint');
  const eslintPkgPath = require.resolve('eslint/package.json');
  const eslintDir = path.dirname(eslintPkgPath);
  const eslintBin = path.resolve(eslintDir, 'bin/eslint.js');
  const res = runCommandCapture(process.execPath, [eslintBin, '.', '--ext', '.ts,.js', '--fix', '--max-warnings=0']);

  if (res.error || res.status !== 0) {
    printFailure('ESLint reported issues. See output above for details.', res.error || undefined);
    process.exit(1);
  }

  console.log('\n==================================================================');
  console.log('ESLint finished with no issues.');
  console.log('==================================================================\n');
}

function runPrettier() {
  printSection('Running Prettier formatter');
  const prettierBin = require.resolve('prettier/bin/prettier.cjs');
  const res = runCommandCapture(process.execPath, [prettierBin, '--write', '**/*.{js,ts,md,json}']);

  if (res.error || res.status !== 0) {
    printFailure('Prettier execution failed. See output above for details.', res.error || undefined);
    process.exit(1);
  }

  console.log('\n==================================================================');
  console.log('Prettier run completed. See above for any applied changes.');
  console.log('==================================================================\n');
}

function runTypecheck() {
  printSection('Running TypeScript typecheck (tsc --noEmit)');
  const tscBin = require.resolve('typescript/bin/tsc');
  const res = runCommandCapture(process.execPath, [tscBin, '--noEmit']);

  if (res.error || res.status !== 0) {
    printFailure('TypeScript typecheck failed. See output above for details.', res.error || undefined);
    process.exit(1);
  }

  console.log('\n==================================================================');
  console.log('TypeScript typecheck finished with no issues.');
  console.log('==================================================================\n');
}

function resolvePercyConfigPath() {
  return path.resolve(process.cwd(), PERCY_CONFIG_RELATIVE_PATH);
}

function isPercyVisualTag(value) {
  return String(value || '').trim().toLowerCase() === '@visual';
}

function isPercyRunRequested(args) {
  const { tags: shortcutTags } = extractShortcutTagArgs(args);
  const grepShortcutTags = findShortcutTagsMentionedInGrep(args);
  return uniqueStrings([...shortcutTags, ...grepShortcutTags]).some(isPercyVisualTag);
}

function runPlaywrightWithPercy(playwrightBin, playwrightArgs) {
  const percyBin = path.resolve(process.cwd(), 'node_modules', '@percy', 'cli', 'bin', 'run.cjs');
  const percyConfigPath = resolvePercyConfigPath();
  const percyConfigArg = path.relative(process.cwd(), percyConfigPath) || PERCY_CONFIG_RELATIVE_PATH;

  if (!fs.existsSync(percyBin)) {
    printFailure('Percy CLI is not available.', 'Install dependencies first (expected @percy/cli in node_modules).');
    process.exit(1);
  }

  if (!fs.existsSync(percyConfigPath)) {
    printFailure(
      'Percy config file was not found.',
      `Expected config path: ${PERCY_CONFIG_RELATIVE_PATH}`
    );
    process.exit(1);
  }

  if (!process.env.PERCY_TOKEN || !String(process.env.PERCY_TOKEN).trim()) {
    printFailure(
      'Missing Percy token.',
      'Set PERCY_TOKEN in env/.env.<env> (or inject it in CI) before running visual mode.'
    );
    process.exit(1);
  }

  printSection('Running Percy visual execution');
  console.log(`Percy config: ${percyConfigArg}`);
  console.log('');

  runCommandWithExit(
    process.execPath,
    [percyBin, 'exec', '--config', percyConfigArg, '--', process.execPath, playwrightBin, 'test', ...playwrightArgs],
    'Percy visual execution failed'
  );
}

function listFilesRecursively(dirPath, predicate) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractTagsFromTagOption(fileContent) {
  const tags = [];
  const tagOptionRegex = /\btag\s*:\s*(\[[\s\S]*?\]|"[^"]*"|'[^']*')/g;
  let match = tagOptionRegex.exec(fileContent);

  while (match) {
    const rawTagValue = match[1] || '';
    const found = rawTagValue.match(/@[A-Za-z0-9_-]+/g) || [];
    tags.push(...found);
    match = tagOptionRegex.exec(fileContent);
  }

  return tags;
}

function collectTagsInventory() {
  const testsDir = path.resolve(process.cwd(), 'tests');
  if (!fs.existsSync(testsDir)) {
    return { tags: [], counts: new Map(), scannedFiles: 0, error: 'Missing tests directory: tests' };
  }

  const sourceFiles = listFilesRecursively(
    testsDir,
    filePath => /\.(ts|tsx|js|mjs|cjs)$/.test(filePath)
  );

  const tagCounts = new Map();

  for (const filePath of sourceFiles) {
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      // Skip unreadable files so one broken file doesn't block inventory.
      continue;
    }

    const tags = extractTagsFromTagOption(content);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const sortedTags = sortValues(Array.from(tagCounts.keys()));

  return { tags: sortedTags, counts: tagCounts, scannedFiles: sourceFiles.length, error: null };
}

function openReport() {
  const buildDir = getBuildDir();
  const reportPath = path.resolve(process.cwd(), buildDir, 'html-report');

  if (!fs.existsSync(reportPath)) {
    printFailure(
      'No Playwright HTML report found.',
      `Run tests first. Expected location: ${path.join(buildDir, 'html-report')}`
    );
    process.exit(1);
  }

   printSection('Opening Playwright HTML report');
   console.log(`Location: ${path.join(buildDir, 'html-report')}\n`);

    const playwrightBin = require.resolve('@playwright/test/cli');
    const res = runCommandCapture(process.execPath, [playwrightBin, 'show-report', reportPath]);
  if (res.error || res.status !== 0) {
    printFailure('Failed to open Playwright report.', res.error || undefined);
    process.exit(1);
  }
}

function getAvailableEnvironments() {
  const envDir = path.resolve(process.cwd(), 'env');

  if (!fs.existsSync(envDir)) {
    return [];
  }

  return fs
    .readdirSync(envDir)
    .filter(file => file.startsWith('.env.') && file !== '.env.example')
    .map(file => file.replace('.env.', ''))
    .sort();
}

function toCsvTokens(value) {
  return String(value || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).map(value => String(value || '').trim()).filter(Boolean)));
}

function getIgnoredTags() {
  return uniqueStrings(testRunnerConfig.ignoredTags || []);
}

function getSeparateRunTags() {
   return uniqueStrings(
     testRunnerConfig.separateRunModes || testRunnerConfig.separateRunTags || testRunnerConfig.shortcutTags || []
   );
}

function getConfiguredAliases() {
  return aliasUtils.getConfiguredAliases(testRunnerConfig);
}

function getConfiguredAliasesRaw() {
  return aliasUtils.getConfiguredAliasesRaw(testRunnerConfig);
}

function splitAliasTokens(value) {
  return aliasUtils.splitAliasTokens(value);
}

function expandAlias(aliasName) {
  return aliasUtils.expandAlias(aliasName, testRunnerConfig);
}

function isAliasName(value) {
  return aliasUtils.isAliasName(value, testRunnerConfig);
}

function sortValues(values) {
  return [...values].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function getShortcutTagAliasMap() {
  const aliasMap = new Map();

  for (const tag of getSeparateRunTags()) {
    const normalizedTag = tag.toLowerCase();
    aliasMap.set(normalizedTag, tag);

    if (tag.startsWith('@') && tag.length > 1) {
      aliasMap.set(tag.slice(1).toLowerCase(), tag);
    }
  }

  return aliasMap;
}

function getSeparateRunModeMappings() {
  return getSeparateRunTags().map(tag => {
    const mode = tag.startsWith('@') ? tag.slice(1) : tag;
    return { mode, tag };
  });
}

function getDefaultIgnoredTags() {
  return uniqueStrings([...getIgnoredTags(), ...getSeparateRunTags()]);
}

function buildTagRegex(tags) {
  const normalized = uniqueStrings(tags);
  if (normalized.length === 0) {
    return '';
  }

  if (normalized.length === 1) {
    return escapeRegex(normalized[0]);
  }

  return `(${normalized.map(escapeRegex).join('|')})`;
}

function collectOptionValues(args, optionName) {
  const values = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === optionName) {
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        values.push(value);
        i += 1;
      }
      continue;
    }

    if (arg.startsWith(`${optionName}=`)) {
      values.push(arg.slice(`${optionName}=`.length));
    }
  }

  return values;
}

function mergeRegexPatterns(existingPattern, appendedPattern) {
  if (!existingPattern) {
    return appendedPattern;
  }

  if (!appendedPattern) {
    return existingPattern;
  }

  return `(?:${existingPattern})|(?:${appendedPattern})`;
}

function appendOrMergeOption(args, optionName, pattern) {
  if (!pattern) {
    return [...args];
  }

  const nextArgs = [];
  let merged = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === optionName) {
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        nextArgs.push(arg, mergeRegexPatterns(value, pattern));
        i += 1;
        merged = true;
        continue;
      }
    }

    if (arg.startsWith(`${optionName}=`)) {
      const value = arg.slice(`${optionName}=`.length);
      nextArgs.push(`${optionName}=${mergeRegexPatterns(value, pattern)}`);
      merged = true;
      continue;
    }

    nextArgs.push(arg);
  }

  if (!merged) {
    nextArgs.push(optionName, pattern);
  }

  return nextArgs;
}

function extractShortcutTagArgs(args) {
  const shortcutAliasMap = getShortcutTagAliasMap();
  const extractedTags = [];
  const remainingArgs = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const normalized = String(arg || '').trim().toLowerCase();
    const previousArg = i > 0 ? String(args[i - 1] || '') : '';
    const isOptionValue = previousArg.startsWith('-') && !previousArg.includes('=');

    if (!isOptionValue && shortcutAliasMap.has(normalized)) {
      extractedTags.push(shortcutAliasMap.get(normalized));
      continue;
    }

    remainingArgs.push(arg);
  }

  return {
    args: remainingArgs,
    tags: uniqueStrings(extractedTags),
  };
}

function findShortcutTagsMentionedInGrep(args) {
  const grepValues = collectOptionValues(args, '--grep');
  const shortcutTags = getSeparateRunTags();

  return shortcutTags.filter(tag => {
    const withoutAt = tag.startsWith('@') ? tag.slice(1) : tag;
    return grepValues.some(value => String(value).includes(tag) || (withoutAt && String(value).includes(withoutAt)));
  });
}

function buildRequiredTagsGrepPattern(requiredTags, grepPattern) {
  const requiredPattern = buildTagRegex(requiredTags);
  const existingPattern = String(grepPattern || '').trim();

  if (!requiredPattern) {
    return existingPattern;
  }

  if (!existingPattern) {
    return requiredPattern;
  }

  // Combine dedicated mode tags with user grep as logical AND.
  return `(?=.*(?:${requiredPattern}))(?=.*(?:${existingPattern})).*`;
}

function applyRequiredTagsToGrepArgs(args, requiredTags) {
  if (!requiredTags || requiredTags.length === 0) {
    return [...args];
  }

  const nextArgs = [];
  let hasGrep = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--grep') {
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        nextArgs.push(arg, buildRequiredTagsGrepPattern(requiredTags, value));
        i += 1;
        hasGrep = true;
        continue;
      }
    }

    if (arg.startsWith('--grep=')) {
      nextArgs.push(`--grep=${buildRequiredTagsGrepPattern(requiredTags, arg.slice('--grep='.length))}`);
      hasGrep = true;
      continue;
    }

    nextArgs.push(arg);
  }

  if (!hasGrep) {
    nextArgs.push('--grep', buildTagRegex(requiredTags));
  }

  return nextArgs;
}

function applyConfiguredTagFilters(envName, args) {
  const { args: nextArgsWithoutShortcuts, tags: shortcutTags } = extractShortcutTagArgs(args);

  let nextArgs = applyRequiredTagsToGrepArgs(nextArgsWithoutShortcuts, shortcutTags);

  const explicitlyRequestedShortcutTags = uniqueStrings([...shortcutTags, ...findShortcutTagsMentionedInGrep(nextArgs)]);
  const autoIgnoredTags = getDefaultIgnoredTags().filter(tag => !explicitlyRequestedShortcutTags.includes(tag));

  if (autoIgnoredTags.length > 0) {
    nextArgs = appendOrMergeOption(nextArgs, '--grep-invert', buildTagRegex(autoIgnoredTags));
  }

  return nextArgs;
}

function normalizeLocaleKey(locale) {
  const normalized = String(locale || '').trim().replace('-', '_').toLowerCase();
  return normalized.split('_')[0];
}

function readEnvFileMap(envName) {
  const envFile = path.resolve(process.cwd(), 'env', `.env.${envName}`);
  if (!fs.existsSync(envFile)) {
    return {};
  }

  const content = fs.readFileSync(envFile, 'utf8');
  return parseEnv(content);
}

function readStaticPlaywrightProjects() {
  try {
    const configPath = path.resolve(process.cwd(), 'playwright.config.ts');
    if (!fs.existsSync(configPath)) {
      return [];
    }

    const text = fs.readFileSync(configPath, 'utf8');
    const projectsBlockMatch = text.match(/const\s+projects\s*=\s*\[([\s\S]*?)\];/);
    if (!projectsBlockMatch || !projectsBlockMatch[1]) {
      return [];
    }

    const projectsBlock = projectsBlockMatch[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const names = Array.from(projectsBlock.matchAll(/name\s*:\s*['"]([^'"]+)['"]/g), match => match[1]);
    return uniqueStrings(names);
  } catch {
    return [];
  }
}

function getAvailableProjects(envName) {
  const source = isCiRuntime() ? process.env : readEnvFileMap(envName);
  const projects = [];

  const brands = toCsvTokens(source.BRANDS);
  if (brands.length > 0) {
    for (const brand of brands) {
      const localeTokens = toCsvTokens(source[`${brand}_LOCALES`]);
      for (const token of localeTokens) {
        const localeKey = normalizeLocaleKey(token);
        if (!localeKey) {
          continue;
        }
        projects.push(`${brand.toLowerCase()}-${localeKey}`);
      }
    }
  } else {
    const locales = toCsvTokens(source.LOCALES);
    for (const token of locales) {
      const localeKey = normalizeLocaleKey(token);
      if (!localeKey) {
        continue;
      }
      projects.push(localeKey);
    }
  }

  projects.push(...readStaticPlaywrightProjects());

  return Array.from(new Set(projects));
}

function getProjectPrefixSelectors(envName) {
  const counts = new Map();

  for (const project of getAvailableProjects(envName)) {
    const dashIndex = project.lastIndexOf('-');
    if (dashIndex <= 0) {
      continue;
    }

    const prefix = project.slice(0, dashIndex);
    counts.set(prefix, (counts.get(prefix) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([prefix]) => prefix)
    .sort();
}

function getNonUiProjectSelectorHintLines(envName) {
  const prefixes = getProjectPrefixSelectors(envName);
  if (prefixes.length === 0) {
    return [];
  }

  return [
    '',
    'Prefix selectors marked with (*) are supported in non-UI runs.',
    `Example: yarn test ${envName} --project ${prefixes[0]}`,
  ];
}

function getUiProjectSelectorHintLines(envName) {
  const prefixes = getProjectPrefixSelectors(envName);
  if (prefixes.length === 0) {
    return [];
  }

  return [
    '',
    'UI mode accepts one concrete project at a time.',
    `Prefixes like "${prefixes[0]}" are not supported in UI mode.`,
  ];
}

function getProjectPrefixExample(envName) {
  return getProjectPrefixSelectors(envName)[0] || '';
}

function buildProjectListLines(envName) {
  const availableProjects = sortValues(getAvailableProjects(envName));
  const grouped = new Map();
  const plain = [];
  let hasSharedSelector = false;

  for (const project of availableProjects) {
    const dashIndex = project.lastIndexOf('-');
    if (dashIndex <= 0) {
      plain.push(project);
      continue;
    }

    const prefix = project.slice(0, dashIndex);
    if (!grouped.has(prefix)) {
      grouped.set(prefix, []);
    }
    grouped.get(prefix).push(project);
  }

  const lines = [];
  const groupPrefixes = sortValues(Array.from(grouped.keys()));

  // Show top-level single projects and group prefixes in alphabetical order.
  const topLevelEntries = sortValues([
    ...plain.map(value => ({ type: 'plain', value })),
    ...groupPrefixes.map(value => ({ type: 'group', value })),
  ].map(entry => `${entry.type}:${entry.value}`));

  for (const encodedEntry of topLevelEntries) {
    const [type, value] = encodedEntry.split(':');

    if (type === 'plain') {
      lines.push(`  - ${value}`);
      continue;
    }

    const children = sortValues(grouped.get(value) || []);
    if (children.length > 1) {
      hasSharedSelector = true;
      lines.push(`  - ${value} (*)`);
      children.forEach(child => lines.push(`    - ${child}`));
      continue;
    }

    // When only one locale exists, show concrete project value.
    lines.push(`  - ${children[0]}`);
  }

  if (hasSharedSelector) {
    lines.push('');
    lines.push('  (*) selector runs all nested projects from this group');
  }

  return lines;
}

function getProjectDerivedTagSet(envName) {
  const excludedTags = new Set();
  const projects = getAvailableProjects(envName);

  for (const project of projects) {
    const normalized = String(project || '').trim().toLowerCase();
    if (!normalized) {
      continue;
    }

    excludedTags.add(`@${normalized}`);

    const dashIndex = normalized.lastIndexOf('-');
    if (dashIndex > 0) {
      const prefix = normalized.slice(0, dashIndex);
      const suffix = normalized.slice(dashIndex + 1);
      if (prefix) excludedTags.add(`@${prefix}`);
      if (suffix) excludedTags.add(`@${suffix}`);
    }
  }

  return excludedTags;
}

function getDisplayableDetectedTags(tagInventory, envName) {
  if (!tagInventory || tagInventory.error) {
    return [];
  }

  const excludedTags = getProjectDerivedTagSet(envName);
  const displayableTags = tagInventory.tags.filter(tag => !excludedTags.has(String(tag).toLowerCase()));

  return uniqueStrings([...displayableTags, ...getSeparateRunTags()]);
}

function parseRequestedProjects(args) {
  const requested = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--project' || arg === '-p') {
      const value = args[i + 1];
      if (value) {
        requested.push(...toCsvTokens(value));
        i += 1;
      }
      continue;
    }

    if (arg.startsWith('--project=')) {
      requested.push(...toCsvTokens(arg.slice('--project='.length)));
    }
  }

  return requested;
}

/**
 * Check if --project flag was provided but without a value.
 * Returns true if flag exists but no value follows.
 */
function hasProjectFlagWithoutValue(args) {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--project' || arg === '-p') {
      const value = args[i + 1];
      // If next arg is missing or starts with --, it's a flag without value
      if (!value || value.startsWith('-')) {
        return true;
      }
    }
  }
  return false;
}

function resolveProjectSelectors(envName, selectors) {
  const availableProjects = getAvailableProjects(envName);
  const byLower = new Map(availableProjects.map(project => [project.toLowerCase(), project]));
  const resolved = [];

  for (const selector of selectors) {
    const key = String(selector || '').trim().toLowerCase();
    if (!key) {
      continue;
    }

    const exact = byLower.get(key);
    if (exact) {
      resolved.push(exact);
      continue;
    }

    const prefixedMatches = availableProjects.filter(project => project.toLowerCase().startsWith(`${key}-`));
    if (prefixedMatches.length > 0) {
      resolved.push(...prefixedMatches);
      continue;
    }

    resolved.push(String(selector));
  }

  return Array.from(new Set(resolved));
}

function expandProjectArgs(envName, args) {
  const expanded = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--project' || arg === '-p') {
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        const selectors = toCsvTokens(value);
        const resolvedProjects = resolveProjectSelectors(envName, selectors);
        for (const project of resolvedProjects) {
          expanded.push('--project', project);
        }
        i += 1;
      } else {
        expanded.push(arg);
      }
      continue;
    }

    if (arg.startsWith('--project=')) {
      const selectors = toCsvTokens(arg.slice('--project='.length));
      const resolvedProjects = resolveProjectSelectors(envName, selectors);
      for (const project of resolvedProjects) {
        expanded.push('--project', project);
      }
      continue;
    }

    expanded.push(arg);
  }

  return expanded;
}

function stripProjectArgs(args) {
  const cleaned = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--project' || arg === '-p') {
      i += 1;
      continue;
    }

    if (arg.startsWith('--project=')) {
      continue;
    }

    cleaned.push(arg);
  }

  return cleaned;
}

function hasInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

async function selectFromList(title, items, confirmationLabel) {
  if (items.length === 0) {
    throw new Error('No items available for selection.');
  }

  if (!hasInteractiveTerminal()) {
    throw new Error('Interactive selection requires a TTY terminal.');
  }

  const normalizedItems = [...items];
  let index = 0;
  let renderedLines = 0;

  readline.emitKeypressEvents(process.stdin);
  if (typeof process.stdin.setRawMode === 'function') {
    process.stdin.setRawMode(true);
  }

  return new Promise((resolve, reject) => {
    function render() {
      if (renderedLines > 0) {
        readline.moveCursor(process.stdout, 0, -renderedLines);
        readline.cursorTo(process.stdout, 0);
        readline.clearScreenDown(process.stdout);
      }

      const lines = [
        '',
        title,
        'Use ↑/↓ to navigate and Enter to confirm.',
        '',
        ...normalizedItems.map((item, itemIndex) => {
          const prefix = itemIndex === index ? '❯' : ' ';
          return `${prefix} ${item}`;
        }),
        '',
      ];

      process.stdout.write(lines.join('\n'));
      renderedLines = lines.length - 1;
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress);
      if (typeof process.stdin.setRawMode === 'function') {
        process.stdin.setRawMode(false);
      }
      readline.cursorTo(process.stdout, 0);
      readline.clearScreenDown(process.stdout);
    }

    function onKeypress(_, key) {
      if (!key) {
        return;
      }

      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('Selection cancelled by user.'));
        return;
      }

      if (key.name === 'up') {
        index = index === 0 ? normalizedItems.length - 1 : index - 1;
        render();
        return;
      }

      if (key.name === 'down') {
        index = index === normalizedItems.length - 1 ? 0 : index + 1;
        render();
        return;
      }

      if (key.name === 'return') {
        const selected = normalizedItems[index];
        cleanup();
        console.log('');
        console.log(`${confirmationLabel || title} ${selected}`);
        resolve(selected);
      }
    }

    process.stdin.on('keypress', onKeypress);
    render();
  });
}

function getProjectSelectionError(envName) {
  const availableProjects = getAvailableProjects(envName);
  const exampleProject = availableProjects[0] || 'project-name';
  const projectListLines = buildProjectListLines(envName);
  return [
    'Interactive project selection is not available in this terminal.',
    '',
    'Run UI with an explicit project, for example:',
    `  yarn test ${envName} ui --project ${exampleProject}`,
    '',
    'Available projects:',
    ...projectListLines,
    ...getUiProjectSelectorHintLines(envName),
  ].join('\n');
}

/**
 * Print available projects when --project flag is used without a value.
 */
function printProjectSelectionError(envName) {
  const availableProjects = getAvailableProjects(envName);
  const exampleProject = availableProjects[0] || 'project-name';
  const projectListLines = buildProjectListLines(envName);
  const prefixExample = getProjectPrefixExample(envName);
  const lines = [
    '',
    'The --project flag requires a value.',
    '',
    'Available projects:',
    ...projectListLines,
    ...getNonUiProjectSelectorHintLines(envName),
    '',
    'Usage examples:',
    `  yarn test ${envName} --project ${exampleProject}`,
    ...(prefixExample ? [`  yarn test ${envName} --project ${prefixExample}`] : []),
    `  yarn test ${envName} --project=${exampleProject} --grep "@smoke"`,
    `  yarn test ${envName} ui --project ${exampleProject}`,
    `  yarn test ${envName} ui -p ${exampleProject}`,
    `  yarn test ${envName} ui --project=${exampleProject}`,
    '',
  ];

  console.error('==================================================================');
  console.error('Missing --project value');
  console.error('==================================================================');
  lines.forEach(line => console.error(line));
  console.error('==================================================================\n');
}

function printUiProjectSelectionError(envName) {
  const availableProjects = getAvailableProjects(envName);
  const exampleProject = availableProjects[0] || 'project-name';
  const projectListLines = buildProjectListLines(envName);
  const lines = [
    '',
    'The --project flag requires a value.',
    '',
    'Available projects:',
    ...projectListLines,
    ...getUiProjectSelectorHintLines(envName),
    '',
    'Usage examples:',
    `  yarn test ${envName} ui --project ${exampleProject}`,
    `  yarn test ${envName} ui -p ${exampleProject}`,
    `  yarn test ${envName} ui --project=${exampleProject}`,
    '',
  ];

  console.error('==================================================================');
  console.error('Missing --project value');
  console.error('==================================================================');
  lines.forEach(line => console.error(line));
  console.error('==================================================================\n');
}

async function resolveUiEnvironment(explicitEnv) {
  if (explicitEnv) {
    return explicitEnv;
  }

  const override = process.env.PW_RUNNER_UI_ENV?.trim();
  if (override) {
    return override;
  }

  const envs = getAvailableEnvironments();
  if (envs.length === 0) {
    printFailure('No local environments available for UI mode.', 'Create env/.env.<env> first.');
    process.exit(1);
  }

  try {
    return await selectFromList('Select environment:', envs, 'Selected environment:');
  } catch (error) {
    printFailure('Environment selection failed.', error.message || String(error));
    process.exit(1);
  }
}

async function resolveUiProject(envName, args) {
  // Check if --project was provided but without a value
  if (hasProjectFlagWithoutValue(args)) {
    printUiProjectSelectionError(envName);
    process.exit(1);
  }

  const explicitProjects = parseRequestedProjects(args);
  if (explicitProjects.length > 0) {
    const resolved = resolveProjectSelectors(envName, explicitProjects);
    return resolved[0] || explicitProjects[0];
  }

  const override = process.env.PW_RUNNER_UI_PROJECT?.trim();
  if (override) {
    return override;
  }

  const availableProjects = getAvailableProjects(envName);

  if (!hasInteractiveTerminal()) {
    printFailure('Interactive project selection is not available.', getProjectSelectionError(envName));
    process.exit(1);
  }

  try {
    return await selectFromList(
      `Select project for env "${envName}":`,
      availableProjects,
      `Selected project for env "${envName}":`
    );
  } catch (error) {
    printFailure('Project selection failed.', error.message || String(error));
    process.exit(1);
  }
}

function validateRequestedProjects(envName, args) {
   const requestedProjects = parseRequestedProjects(args);
   if (requestedProjects.length === 0) {
     return;
   }

   const availableProjects = getAvailableProjects(envName);
   const projectListLines = buildProjectListLines(envName);
   const availableSet = new Set(availableProjects);

   for (const requested of requestedProjects) {
     if (availableSet.has(requested)) {
       continue;
     }

     const lines = [
       `Project "${requested}" is not recognized.`,
       '',
       'Available projects:',
       ...projectListLines,
       ...getNonUiProjectSelectorHintLines(envName),
       '',
       'Example:',
       `  yarn test ${envName} --project ${availableProjects[0] || 'project-name'}`,
       '',
       'For more information:',
       '  yarn test help',
     ];

     printFailure('Invalid --project value', lines.join('\n'));
     process.exit(1);
   }
}

function extractSimpleTagCandidatesFromGrepPattern(pattern) {
  const value = String(pattern || '').trim();
  if (!value) {
    return [];
  }

  // Validate only simple tag patterns (e.g. @smoke or @smoke|@sanity).
  // Skip advanced regex to avoid false-positive validation failures.
  if (/[^@A-Za-z0-9_|-]/.test(value)) {
    return null;
  }

  const tokens = value
    .split('|')
    .map(token => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return [];
  }

  if (tokens.some(token => !/^@?[A-Za-z0-9_-]+$/.test(token))) {
    return null;
  }

  return uniqueStrings(tokens.map(token => (token.startsWith('@') ? token : `@${token}`)));
}

function normalizeScopeToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return '';
  return raw.startsWith('@') ? raw.slice(1) : raw;
}

function buildUserScopeFromArgs(args) {
  const grepValues = collectOptionValues(args, '--grep');
  const { tags: shortcutTags } = extractShortcutTagArgs(args);

  const scopeTokens = [];

  for (const tag of shortcutTags) {
    const normalized = normalizeScopeToken(tag);
    if (normalized) scopeTokens.push(normalized);
  }

  for (const grepValue of grepValues) {
    const candidates = extractSimpleTagCandidatesFromGrepPattern(grepValue);
    if (candidates && candidates.length > 0) {
      for (const candidate of candidates) {
        const normalized = normalizeScopeToken(candidate);
        if (normalized) scopeTokens.push(normalized);
      }
      continue;
    }

    const fallback = String(grepValue || '').trim();
    if (fallback) scopeTokens.push(fallback);
  }

  return uniqueStrings(scopeTokens).join(', ');
}

function applyUserScopeEnv(args) {
  const scope = buildUserScopeFromArgs(args);
  if (!scope) {
    delete process.env.PW_USER_SCOPE;
    return;
  }

  process.env.PW_USER_SCOPE = scope;
}

function buildMissingEnvironmentErrorDetails(args) {
  const envs = sortValues(getAvailableEnvironments());
  const grepValues = collectOptionValues(args, '--grep');
  const lines = [
    'Pass an environment before options.',
    '',
    'Available environments:',
    ...(envs.length > 0 ? envs.map(name => `  - ${name}`) : ['  (no environments found in /env)']),
  ];

  if (grepValues.length > 0) {
    const tagInventory = collectTagsInventory();
    const envForTagView = envs[0] || 'dev';
    const availableTags = tagInventory.error ? [] : sortValues(getDisplayableDetectedTags(tagInventory, envForTagView));

    if (availableTags.length > 0) {
      const availableSet = new Set(availableTags.map(tag => tag.toLowerCase()));
      const invalidTags = [];

      for (const grepValue of grepValues) {
        const candidates = extractSimpleTagCandidatesFromGrepPattern(grepValue);
        if (candidates === null || candidates.length === 0) {
          continue;
        }

        for (const candidate of candidates) {
          if (!availableSet.has(candidate.toLowerCase()) && !invalidTags.includes(candidate)) {
            invalidTags.push(candidate);
          }
        }
      }

      if (invalidTags.length > 0) {
        lines.push('');
        lines.push('Provided --grep contains unknown tag(s):');
        invalidTags.forEach(tag => lines.push(`  - ${tag}`));
        lines.push('');
        lines.push('Available grep tags:');
        availableTags.forEach(tag => lines.push(`  - ${tag}`));
      }
    }
  }

  lines.push('');
  lines.push('Examples:');
  lines.push(`  yarn test ${envs[0] || 'dev'}`);
  lines.push(`  yarn test ${envs[0] || 'dev'} --grep "@smoke"`);
  lines.push('');
  lines.push('For full command list, projects and grep patterns:');
  lines.push('  yarn test help');

  return lines.join('\n');
}

function validateRequestedGrepPatterns(envName, args) {
  const grepValues = collectOptionValues(args, '--grep');
  if (grepValues.length === 0) {
    return;
  }

  const tagInventory = collectTagsInventory();
  if (tagInventory.error) {
    return;
  }

  const availableTags = sortValues([...tagInventory.tags, ...getSeparateRunTags()]);
  if (availableTags.length === 0) {
    return;
  }

  const displayableTags = sortValues(getDisplayableDetectedTags(tagInventory, envName));

  const availableSet = new Set(availableTags);

  for (const grepValue of grepValues) {
    const candidates = extractSimpleTagCandidatesFromGrepPattern(grepValue);
    if (candidates === null || candidates.length === 0) {
      continue;
    }

    const invalidTags = candidates.filter(tag => !availableSet.has(tag));
    if (invalidTags.length === 0) {
      continue;
    }

    const lines = [
      `Grep value "${grepValue}" is not recognized.`,
      '',
      'Invalid tag(s):',
      ...invalidTags.map(tag => `  - ${tag}`),
      '',
      'Available grep tags:',
      ...displayableTags.map(tag => `  - ${tag}`),
      '',
      'Example:',
      `  yarn test ${envName} --grep "${displayableTags[0] || availableTags[0]}"`,
      '',
      'For full command list, projects and grep patterns:',
      '  yarn test help',
    ];

    printFailure('Invalid --grep value', lines.join('\n'));
    process.exit(1);
  }
}

function formatArgsForDisplay(args) {
  return args
    .map(arg => {
      const s = String(arg);
      // Quote values that contain spaces or special shell characters for readability.
      if (/[\s|"'&<>]/.test(s)) {
        return `"${s.replace(/"/g, '\\"')}"`;
      }
      return s;
    })
    .join(' ');
}

function isVerbose() {
  return Boolean(testRunnerConfig.verbose) || Boolean(process.env.PW_VERBOSE);
}

function extractBooleanFlag(args, flagName) {
  const cleaned = [];
  let enabled = false;

  for (const arg of args) {
    if (arg === flagName) {
      enabled = true;
      continue;
    }
    cleaned.push(arg);
  }

  return { enabled, args: cleaned };
}

function printExpandedCommand(envName, extraArgs) {
  if (!isVerbose()) return;
  const parts = ['yarn test', envName, formatArgsForDisplay(extraArgs)].filter(Boolean);
  console.log(`[testRunner] Running: ${parts.join(' ')}`);
}

function printExpandedUiCommand(envName, project, extraArgs) {
  if (!isVerbose()) return;
  const parts = ['yarn test', envName, 'ui', '--project', project, formatArgsForDisplay(extraArgs)].filter(Boolean);
  console.log(`[testRunner] Running: ${parts.join(' ')}`);
}

async function runInGithub(envName, finalArgs) {
  const githubConfig = testRunnerConfig.github || {};
  const shardingConfig = testRunnerConfig.sharding || {};
  printSection('Dispatching GitHub Actions workflow');

  const result = await triggerGithubRun({
    envName,
    finalArgs,
    config: githubConfig,
    shardingConfig,
  });

  console.log(`Repository source: ${result.repositorySource}`);
  console.log(`Token source: ${result.tokenSource}`);
  console.log(`Ref: ${result.ref}`);
  console.log(`Environment: ${result.environment}`);
  console.log(`Secret used in workflow: ${result.envSecretName}`);
  console.log('');
  console.log('Workflow dispatched successfully.');
  console.log(`Open run details: ${result.runUrl}`);
}

function expandAliasesInArgs(args, maxPasses = 20) {
  return aliasUtils.expandAliasesInArgs(args, testRunnerConfig, maxPasses);
}

function isLikelyTestTargetArg(value) {
  const token = String(value || '').trim();
  if (!token) {
    return false;
  }

  // Allow explicit test paths, globs and file-like selectors.
  if (/[/\\]/.test(token)) return true;
  if (/\*/.test(token)) return true;
  if (/\.(spec|test)\.[cm]?[jt]sx?$/i.test(token)) return true;
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(token)) return true;
  return false;
}

function validateUnknownPositionalArgs(envName, args) {
  const allowedModes = new Set(getSeparateRunModeMappings().map(item => String(item.mode || '').toLowerCase()));
  const unknown = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] || '').trim();
    if (!arg) {
      continue;
    }

    if (arg.startsWith('-')) {
      continue;
    }

    const previousArg = i > 0 ? String(args[i - 1] || '').trim() : '';
    const isOptionValue = previousArg.startsWith('-') && !previousArg.includes('=');
    if (isOptionValue) {
      continue;
    }

    if (allowedModes.has(arg.toLowerCase())) {
      continue;
    }

    if (isLikelyTestTargetArg(arg)) {
      continue;
    }

    unknown.push(arg);
  }

  if (unknown.length === 0) {
    return;
  }

  const availableModes = sortValues(getSeparateRunModeMappings().map(item => item.mode)).map(mode => `  - ${mode}`);
  const lines = [
    'One or more positional arguments are not recognized.',
    '',
    'Invalid value(s):',
    ...uniqueStrings(unknown).map(value => `  - ${value}`),
    '',
    'Use one of these forms:',
    `  yarn test ${envName}`,
    `  yarn test ${envName} --project project-name`,
    `  yarn test ${envName} ui --project project-name`,
    `  yarn test ${envName} --grep "@smoke"`,
    `  yarn test ${envName} tests/path/to/spec.ts`,
  ];

  if (availableModes.length > 0) {
    lines.push('');
    lines.push('Available run modes:');
    lines.push(...availableModes);
  }

  lines.push('');
  lines.push('Quick help:');
  lines.push('  yarn test');
  lines.push('Full help:');
  lines.push('  yarn test help');

  printFailure('Invalid positional argument value.', lines.join('\n'));
  printMinimalUsage();
  process.exit(1);
}

function printMinimalUsage() {
  helpPrinter.printMinimalUsage({
    isGithubEnabled: (testRunnerConfig.github || {}).enabled !== false,
    sortValues,
    getAvailableEnvironments,
    getConfiguredAliasesRaw,
    getSeparateRunModeMappings,
  });
}

function printFullUsage() {
  helpPrinter.printFullUsage({
    isGithubEnabled: (testRunnerConfig.github || {}).enabled !== false,
    sortValues,
    getAvailableEnvironments,
    getIgnoredTags,
    getSeparateRunTags,
    getSeparateRunModeMappings,
    getProjectPrefixExample,
    buildProjectListLines,
    collectTagsInventory,
    getDisplayableDetectedTags,
    getConfiguredAliasesRaw,
  });
}

function printUsage() {
  printMinimalUsage();
}

function hydrateProcessEnvFromFile(envName) {
  const fileVars = readEnvFileMap(envName);

  for (const [key, value] of Object.entries(fileVars)) {
    // Keep explicit shell/CI overrides while filling missing values from env file.
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function validateEnvironment(env) {
   const envName = String(env || '').trim();

   if (!envName) {
     printFailure('Missing environment argument.', 'Pass an environment like: yarn test <env>');
     printMinimalUsage();
     process.exit(1);
   }

   if (isCiRuntime()) {
     process.env.ENV = envName;
     return;
   }

   const envFile = path.resolve(process.cwd(), 'env', `.env.${envName}`);

   if (!fs.existsSync(envFile)) {
     const availableEnvs = sortValues(getAvailableEnvironments());
     const lines = [
       `Environment "${envName}" is not configured.`,
       '',
       `Missing file: env/.env.${envName} (or run in CI with injected process.env).`,
       '',
       'Available environments:',
       ...(availableEnvs.length > 0
         ? availableEnvs.map(name => `  - ${name}`)
         : ['  (no environments found in /env)']),
       '',
       'Example:',
       `  yarn test ${availableEnvs[0] || 'dev'}`,
       '',
       'For full command list, projects and grep patterns:',
       '  yarn test help',
     ];

     printFailure('Invalid environment value.', lines.join('\n'));
     process.exit(1);
   }

   process.env.ENV = envName;
   hydrateProcessEnvFromFile(envName);
}

async function main(rawArgs) {
   // First, expand any composable aliases (env:alias pattern) in rawArgs
   let expandedArgs = rawArgs;
   for (let i = 0; i < expandedArgs.length; i += 1) {
     const arg = String(expandedArgs[i] || '').trim();
     // Only expand if it contains: and is at position 0 (first arg)
     // This handles composable aliases like "dev:sanity:multi"
     if (i === 0 && arg.includes(':') && isAliasName(arg)) {
       const aliasExpansion = expandAlias(arg);
       if (aliasExpansion) {
         expandedArgs = [...aliasExpansion, ...expandedArgs.slice(1)];
       }
     }
   }

   if (!expandedArgs.length) {
     printMinimalUsage();
     process.exit(1);
   }

   const [first, ...rest] = expandedArgs;
   const command = String(first).toLowerCase();

   if (String(first).startsWith('-')) {
     printFailure('Missing environment argument.', buildMissingEnvironmentErrorDetails(expandedArgs));
     process.exit(1);
   }

   if (command === 'help') {
     printFullUsage();
     process.exit(0);
   }

   if (command === 'eslint') {
     runEslint();
     return;
   }

   if (command === 'prettier') {
     runPrettier();
     return;
   }

   if (command === 'tscheck') {
     runTypecheck();
     return;
   }

   if (command === 'report') {
     openReport();
     return;
   }

    if (command === 'ui') {
      const envName = await resolveUiEnvironment(undefined);
      validateEnvironment(envName);

      // Handle rest args that might be aliases
      let expandedRest = expandAliasesInArgs(rest);
      const uiFlag = extractBooleanFlag(expandedRest, '--ui');
      expandedRest = uiFlag.args;

      // Check if --project flag is provided without a value
      if (hasProjectFlagWithoutValue(expandedRest)) {
        printUiProjectSelectionError(envName);
        process.exit(1);
      }

      const selectedProject = await resolveUiProject(envName, expandedRest);
      applyUserScopeEnv(expandedRest);
      const argsWithoutProject = applyConfiguredTagFilters(envName, stripProjectArgs(expandedRest));

     validateRequestedProjects(envName, ['--project', selectedProject]);
      validateUnknownPositionalArgs(envName, argsWithoutProject);
      validateRequestedGrepPatterns(envName, argsWithoutProject);
      printExpandedUiCommand(envName, selectedProject, argsWithoutProject);
      console.log('Starting Playwright UI...');
      const playwrightBin = require.resolve('@playwright/test/cli');
      runCommandWithExit(
        process.execPath,
        [playwrightBin, 'test', '--ui', '--project', selectedProject, ...argsWithoutProject],
        'Failed to open Playwright UI.'
      );
     return;
   }

    validateEnvironment(first);

    // Handle rest args that might be aliases
    let expandedRest = expandAliasesInArgs(rest);

    const uiAsPositional = expandedRest[0] === 'ui';
    if (uiAsPositional) {
      expandedRest = expandedRest.slice(1);
    }

    const uiFlag = extractBooleanFlag(expandedRest, '--ui');
    expandedRest = uiFlag.args;

    if (uiAsPositional || uiFlag.enabled) {
      const uiArgs = expandedRest;

     // Check if --project flag is provided without a value
     if (hasProjectFlagWithoutValue(uiArgs)) {
       printUiProjectSelectionError(first);
       process.exit(1);
     }

     const selectedProject = await resolveUiProject(first, uiArgs);
      applyUserScopeEnv(uiArgs);
     const strippedArgs = applyConfiguredTagFilters(first, stripProjectArgs(uiArgs));

    validateRequestedProjects(first, ['--project', selectedProject]);
    validateUnknownPositionalArgs(first, strippedArgs);
    validateRequestedGrepPatterns(first, strippedArgs);
     printExpandedUiCommand(first, selectedProject, strippedArgs);
     console.log('Starting Playwright UI...');
     const playwrightBin = require.resolve('@playwright/test/cli');
      runCommandWithExit(
        process.execPath,
         [playwrightBin, 'test', '--ui', '--project', selectedProject, ...strippedArgs],
        'Failed to open Playwright UI.'
      );
    return;
  }

    const githubMode = extractBooleanFlag(expandedRest, '--github');
    expandedRest = githubMode.args;

    // Handle missing --project value in regular (non-UI) runs as well.
    if (hasProjectFlagWithoutValue(expandedRest)) {
      printProjectSelectionError(first);
      process.exit(1);
    }

    applyUserScopeEnv(expandedRest);
    const finalArgs = applyConfiguredTagFilters(first, expandProjectArgs(first, expandedRest));
    validateRequestedProjects(first, finalArgs);
    validateUnknownPositionalArgs(first, finalArgs);
    validateRequestedGrepPatterns(first, finalArgs);

    if (githubMode.enabled) {
      if ((testRunnerConfig.github || {}).enabled === false) {
        printFailure(
          'GitHub dispatch is disabled in test runner config.',
          'Set config/testRunner.config.cjs -> github.enabled to true to use --github.'
        );
        process.exit(1);
      }

      if (finalArgs[0] === 'ui') {
        printFailure('GitHub dispatch does not support UI mode.', 'Use regular mode with --github (without "ui").');
        process.exit(1);
      }

      try {
        await runInGithub(first, finalArgs);
        process.exit(0);
      } catch (error) {
        printFailure('Failed to dispatch GitHub workflow.', error && error.message ? error.message : String(error));
        process.exit(1);
      }
    }

    printExpandedCommand(first, finalArgs);

    const playwrightBin = require.resolve('@playwright/test/cli');

    if (isPercyRunRequested(expandedRest)) {
      runPlaywrightWithPercy(playwrightBin, finalArgs);
      return;
    }

    runCommandWithExit(
      process.execPath,
      [playwrightBin, 'test', ...finalArgs],
      'Playwright test execution failed'
    );
}

function run(rawArgs = process.argv.slice(2)) {
  return main(rawArgs);
}

module.exports = {
  run,
};

if (require.main === module) {
  run(process.argv.slice(2));
}


