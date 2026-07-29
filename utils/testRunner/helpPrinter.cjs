function printMinimalUsage(ctx) {
  const {
    sortValues,
    getAvailableEnvironments,
    getConfiguredAliasesRaw,
    getSeparateRunModeMappings,
  } = ctx;

  const envs = sortValues(getAvailableEnvironments());
  const aliases = getConfiguredAliasesRaw();
  const aliasNames = Object.keys(aliases).sort();
  const separateRunModes = sortValues(getSeparateRunModeMappings().map(item => item.mode));
  const exampleEnv = envs[0] || 'dev';
  const isGithubEnabled = ctx.isGithubEnabled !== false;

  console.log('==================================================================');
  console.log('Usage: yarn test <env> [options]');
  console.log('==================================================================');
  console.log('');
  console.log('Commands:');
  console.log('  eslint     Run ESLint linter');
  console.log('  prettier   Run Prettier formatter');
  console.log('  tscheck    Run TypeScript typecheck');
  console.log('  report     Open Playwright HTML report');
  console.log('');
  console.log('Available environments:');
  if (envs.length === 0) {
    console.log('  (no environments found in /env)');
  } else {
    envs.forEach(env => console.log(`  - ${env}`));
  }
  console.log('');

  if (aliasNames.length > 0) {
    console.log('Available aliases:');
    aliasNames.forEach(alias => console.log(`  - ${alias}`));
    console.log('');
  }

  if (separateRunModes.length > 0) {
    console.log('Available run modes:');
    separateRunModes.forEach(mode => console.log(`  - ${mode}`));
    console.log('');
  }

  console.log('Examples:');
  console.log(`  yarn test ${exampleEnv}`);
  console.log(`  yarn test ${exampleEnv} --project testBrand`);
  console.log(`  yarn test ${exampleEnv} ui`);
  console.log(`  yarn test ${exampleEnv} ui --project testBrand`);
  console.log(`  yarn test ${exampleEnv} --grep "@smoke"`);
  if (isGithubEnabled) {
    console.log(`  yarn test ${exampleEnv} --grep "@smoke" --github`);
  }
  console.log('  yarn test eslint');
  console.log('  yarn test prettier');
  console.log('');
  console.log('For detailed help:');
  console.log('  yarn test help');
  console.log('');
  console.log('Full help includes:');
  console.log('  - Complete list of available projects');
  console.log('  - All grep patterns and tags');
  console.log('  - UI mode usage and examples');
  console.log('  - Available run modes');
  console.log('  - Detailed examples');
  console.log('  - Configuration file location');
  console.log('==================================================================\n');
}

function printFullUsage(ctx) {
  const {
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
  } = ctx;

  const envs = sortValues(getAvailableEnvironments());
  const ignoredTags = sortValues(getIgnoredTags());
  const separateRunTags = sortValues(getSeparateRunTags());
  const separateRunModes = getSeparateRunModeMappings().map(item => item.mode);
  const exampleEnv = envs[0] || 'example';
  const prefixExample = getProjectPrefixExample(exampleEnv) || 'testBrand';
  const projectListLines = buildProjectListLines(exampleEnv);
  const tagInventory = collectTagsInventory();
  const displayableDetectedTags = getDisplayableDetectedTags(tagInventory, exampleEnv);
  const aliases = getConfiguredAliasesRaw();
  const aliasNames = Object.keys(aliases).sort();
  const isGithubEnabled = ctx.isGithubEnabled !== false;

  console.log('==================================================================');
  console.log('Full Usage Guide');
  console.log('==================================================================');
  console.log('');
  console.log('Basic syntax:');
  console.log('  yarn test ui --project <project>');
  console.log('  yarn test <env>');
  console.log('  yarn test <env> --project <project>');
  console.log('  yarn test <env> --project <project> --grep "<grepPattern>"');
  if (isGithubEnabled) {
    console.log('  yarn test <env> --project <project> --grep "<grepPattern>" --github');
  }
  console.log('  yarn test <env> --project <project> --grep-invert "<grepPattern>"');
  console.log('  yarn test <env> --project <project> <separateRunMode>');
  console.log('  yarn test <env> ui --project <project>');
  console.log('');
  console.log('Utility commands:');
  console.log('  yarn test eslint');
  console.log('  yarn test prettier');
  console.log('  yarn test tscheck');
  console.log('  yarn test report');
  console.log('');
  console.log('Available environments (valid values for <env>):');
  if (envs.length === 0) {
    console.log('  (no environments found in /env)');
  } else {
    envs.forEach(env => console.log(`  - ${env}`));
  }
  console.log('');

  if (aliasNames.length > 0) {
    console.log('Available aliases:');
    aliasNames.forEach(alias => {
      const expansion = aliases[alias];
      console.log(`  ${alias}`);
      console.log(`    -> ${expansion}`);
    });
    console.log('');
  } else {
    console.log('Available aliases:');
    console.log('  (no aliases defined)');
    console.log('  To add aliases, edit: config/testRunner.config.cjs');
    console.log('');
  }

  console.log('Projects (values for <project>):');
  if (projectListLines.length === 0) {
    console.log('  (no projects detected)');
  } else {
    projectListLines.forEach(line => console.log(line));
  }
  console.log('');
  console.log('Ignored tags (always excluded from shared runs):');
  if (ignoredTags.length === 0) {
    console.log('  (none configured)');
  } else {
    ignoredTags.forEach(tag => console.log(`  - ${tag}`));
  }
  console.log('');
  console.log('Separate run modes (excluded from shared runs unless explicitly selected):');
  if (separateRunTags.length === 0) {
    console.log('  (none configured)');
  } else {
    console.log('  These values can be passed as a positional argument after <env>.');
    sortValues(separateRunModes).forEach(mode => console.log(`  - ${mode}`));
  }
  console.log('');
  console.log('Grep patterns (example patterns for <grepPattern>):');
  const grepExamples = sortValues(['@smoke']);
  grepExamples.forEach(pattern => console.log(`  - "${pattern}"`));
  console.log('  - "@flaky" (useful for inverted grep, e.g. --grep-invert)');
  console.log('');
  console.log('Detected tags from tests (for grep; excludes project/locale tags):');
  if (tagInventory.error) {
    console.log(`  (${tagInventory.error})`);
  } else if (tagInventory.tags.length === 0) {
    console.log('  Project does not have any defined tags yet.');
  } else if (displayableDetectedTags.length === 0) {
    console.log('  No grep-focused tags detected (only project/locale tags found).');
  } else {
    displayableDetectedTags.forEach(tag => console.log(`  - ${tag}`));
  }
  console.log('');
  console.log('Configuration:');
  console.log('  Aliases config:     config/testRunner.config.cjs');
  console.log('  Environments:       env/.env.<env>');
  console.log('  Test runner config: config/testRunner.config.cjs');
  console.log('');
  console.log('Examples:');
  console.log(`  yarn test ${exampleEnv}`);
  console.log(`  yarn test ${exampleEnv} --project ${prefixExample} --grep "@smoke"`);
  console.log(`  yarn test ${exampleEnv} --project ${prefixExample} --grep "@sanity|@regression"`);
  console.log(`  yarn test ${exampleEnv} --project ${prefixExample} --grep-invert "@flaky"`);
  console.log(`  yarn test ${exampleEnv} --project ${prefixExample}`);
  console.log(`  yarn test ${exampleEnv} --project ${prefixExample} visual`);
  console.log(`  yarn test ${exampleEnv} --project testBrand performanceTest`);
  console.log(`  yarn test ${exampleEnv} tests/testBrand/functional/cookies.spec.ts --reporter=line`);
  console.log(`  yarn test ${exampleEnv} ui`);
  console.log(`  yarn test ${exampleEnv} ui --project testBrand`);
  if (isGithubEnabled) {
    console.log(`  yarn test ${exampleEnv} --grep "@smoke" --github`);
  }
  console.log('  yarn test eslint');
  console.log('  yarn test prettier');
  console.log('  yarn test tscheck');
  console.log('  yarn test report');
  console.log('==================================================================\n');
}

module.exports = {
  printMinimalUsage,
  printFullUsage,
};

