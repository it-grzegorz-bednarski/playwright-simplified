function uniqueStrings(values) {
  return Array.from(new Set((values || []).map(value => String(value || '').trim()).filter(Boolean)));
}

function getConfiguredAliasesRaw(testRunnerConfig) {
  return testRunnerConfig.aliases || {};
}

function getConfiguredAliases(testRunnerConfig) {
  const raw = getConfiguredAliasesRaw(testRunnerConfig);
  const normalized = {};
  for (const key of Object.keys(raw)) {
    normalized[key.trim().toLowerCase()] = raw[key];
  }
  return normalized;
}

function splitAliasTokens(value) {
  const tokens = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === ' ' && !inDouble && !inSingle) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function expandAlias(aliasName, testRunnerConfig) {
  const aliases = getConfiguredAliases(testRunnerConfig);
  const key = String(aliasName || '').trim().toLowerCase();

  if (!key || !aliases[key]) {
    return null;
  }

  const expanded = String(aliases[key] || '').trim();
  return splitAliasTokens(expanded).filter(Boolean);
}

function isAliasName(value, testRunnerConfig) {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases = getConfiguredAliases(testRunnerConfig);
  return Object.prototype.hasOwnProperty.call(aliases, normalized);
}

function expandAliasesInArgs(args, testRunnerConfig, maxPasses = 20) {
  let result = [...args];
  let pass = 0;

  while (pass < maxPasses) {
    let expanded = false;

    for (let i = 0; i < result.length; i += 1) {
      const arg = result[i];
      const previousArg = i > 0 ? String(result[i - 1] || '') : '';
      const isOptionValue = previousArg.startsWith('-') && !previousArg.includes('=');

      if (!isOptionValue && isAliasName(arg, testRunnerConfig)) {
        const aliasExpansion = expandAlias(arg, testRunnerConfig);
        if (aliasExpansion) {
          result = [...result.slice(0, i), ...aliasExpansion, ...result.slice(i + 1)];
          expanded = true;
          break;
        }
      }
    }

    if (!expanded) {
      break;
    }

    pass += 1;
  }

  return result;
}

module.exports = {
  getConfiguredAliasesRaw,
  getConfiguredAliases,
  splitAliasTokens,
  expandAlias,
  isAliasName,
  expandAliasesInArgs,
  uniqueStrings,
};

