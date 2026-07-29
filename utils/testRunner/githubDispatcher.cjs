const https = require('https');
const { spawnSync } = require('child_process');

function nonEmpty(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : '';
}

function toPositiveInt(value) {
  const normalized = nonEmpty(value);
  if (!normalized) return 0;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeEnvSecretName(envName) {
  return `ENV_${String(envName || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')}`;
}

function toArgsJson(args) {
  return JSON.stringify((args || []).map(value => String(value)));
}

function resolveShardTotal(shardingConfig = {}) {
   return (
     toPositiveInt(process.env.PW_GITHUB_SHARD_TOTAL) ||
     toPositiveInt(process.env.GITHUB_SHARD_TOTAL) ||
     toPositiveInt(process.env.PLAYWRIGHT_GITHUB_SHARD_TOTAL) ||
     toPositiveInt(shardingConfig.totalShards) ||
     1
   );
 }

function resolveToken(config = {}) {
  const tokenEnvVars = Array.isArray(config.tokenEnvVars) && config.tokenEnvVars.length > 0
    ? config.tokenEnvVars
    : ['GITHUB_TOKEN', 'GH_TOKEN'];

  for (const name of tokenEnvVars) {
    const token = nonEmpty(process.env[name]);
    if (token) {
      return { token, source: name };
    }
  }

  return { token: '', source: tokenEnvVars.join(' or ') };
}

function parseGitRemote(remoteUrl) {
  const value = nonEmpty(remoteUrl);
  if (!value) return null;

  // https://github.com/owner/repo.git
  const httpsMatch = value.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // git@github.com:owner/repo.git
  const sshMatch = value.match(/github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

function runGit(args) {
  const result = spawnSync('git', args, {
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    return '';
  }

  return nonEmpty(result.stdout);
}

function resolveRepository(config = {}) {
  const configuredOwner = nonEmpty(config.owner || process.env.GITHUB_REPOSITORY_OWNER);
  const configuredRepo = nonEmpty(config.repo);

  if (configuredOwner && configuredRepo) {
    return { owner: configuredOwner, repo: configuredRepo, source: 'config' };
  }

  const fromEnvRepo = nonEmpty(process.env.GITHUB_REPOSITORY);
  if (fromEnvRepo.includes('/')) {
    const [owner, repo] = fromEnvRepo.split('/');
    if (owner && repo) {
      return { owner, repo, source: 'GITHUB_REPOSITORY' };
    }
  }

  const remoteUrl = runGit(['config', '--get', 'remote.origin.url']);
  const parsedRemote = parseGitRemote(remoteUrl);
  if (parsedRemote) {
    return { ...parsedRemote, source: 'git remote.origin.url' };
  }

  return { owner: '', repo: '', source: '' };
}

function resolveRef(config = {}) {
  const fromConfig = nonEmpty(config.ref);
  if (fromConfig) return fromConfig;

  const fromEnv = nonEmpty(process.env.TEST_RUNNER_GITHUB_REF);
  if (fromEnv) return fromEnv;

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch && branch !== 'HEAD') {
    return branch;
  }

  const fromSha = runGit(['rev-parse', 'HEAD']);
  if (fromSha) {
    return fromSha;
  }

  return 'main';
}

function dispatchWorkflow({
   token,
   owner,
   repo,
   workflowFile,
   ref,
   environment,
   envSecretName,
   runnerArgs,
   shardTotal,
   apiBaseUrl,
 }) {
   return new Promise((resolve, reject) => {
     const inputs = {
       environment,
       env_secret_name: envSecretName,
       runner_args_json: toArgsJson(runnerArgs),
     };

     // Only include shard_total if shardTotal > 1
     if (Number.isInteger(shardTotal) && shardTotal > 1) {
       inputs.shard_total = String(shardTotal);
     }

     const body = JSON.stringify({
       ref,
       inputs,
     });

    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'playwright-simplified-test-runner',
      },
    };

    const requestPath = `${apiBaseUrl}/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;
    const req = https.request(requestPath, options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString('utf8');
        const ok = res.statusCode === 204;

        if (!ok) {
          reject(
            new Error(
              `GitHub workflow dispatch failed (HTTP ${res.statusCode || 'unknown'}). ${responseBody || ''}`.trim()
            )
          );
          return;
        }

        resolve();
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function triggerGithubRun({ envName, finalArgs, config = {}, shardingConfig = {} }) {
   const githubConfig = {
     enabled: true,
     workflowFile: 'playwright-dispatch.yml',
     apiBaseUrl: 'https://api.github.com',
     tokenEnvVars: ['GITHUB_TOKEN', 'GH_TOKEN'],
     ...config,
   };

   if (!githubConfig.enabled) {
     throw new Error('GitHub dispatch is disabled in test runner config.');
   }

   const { token, source: tokenSource } = resolveToken(githubConfig);
   if (!token) {
     throw new Error(
       '[GitHub Dispatch] Missing GitHub token for --github mode. ' +
         `Set one of: ${tokenSource}. ` +
         'Token must allow actions:write for workflow dispatch. ' +
         'Recommended: add GITHUB_TOKEN to env/.env.<env> (local) or repository secrets (CI).'
     );
   }

   const repository = resolveRepository(githubConfig);
   if (!repository.owner || !repository.repo) {
     throw new Error(
       'Cannot resolve GitHub repository owner/name.' +
         ' Set testRunnerConfig.github.owner/repo or ensure git remote points to GitHub.'
     );
   }

   const shardTotal = resolveShardTotal(shardingConfig);
   let workflowFile = nonEmpty(githubConfig.workflowFile);

   // Select workflow based on shard total
   if (shardTotal > 1) {
     workflowFile = 'playwright-dispatch-sharded.yml';
   }

   if (!workflowFile) {
     throw new Error('Missing GitHub workflow file name in config (testRunnerConfig.github.workflowFile).');
   }

   const ref = resolveRef(githubConfig);
   const envSecretName = normalizeEnvSecretName(envName);

   await dispatchWorkflow({
     token,
     owner: repository.owner,
     repo: repository.repo,
     workflowFile,
     ref,
     environment: envName,
     envSecretName,
     runnerArgs: finalArgs,
     shardTotal,
     apiBaseUrl: nonEmpty(githubConfig.apiBaseUrl) || 'https://api.github.com',
   });

   const runUrl = `https://github.com/${repository.owner}/${repository.repo}/actions/workflows/${workflowFile}`;

   return {
     runUrl,
     ref,
     environment: envName,
     envSecretName,
     shardTotal,
     tokenSource,
     repositorySource: repository.source,
   };
 }

module.exports = {
  triggerGithubRun,
};

