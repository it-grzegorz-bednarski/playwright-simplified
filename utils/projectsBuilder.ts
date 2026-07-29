import {
  buildLocaleProjects,
  normalizeTag,
  resolveMultilangContract,
  type GeneratedLocaleProject,
} from './multilang';

type ProjectContractFlags = {
  hasBrandsContract: boolean;
  hasLegacyLocalesContract: boolean;
  hasLocaleContract: boolean;
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildProjectTagGrep(projectName: string): RegExp {
  const tag = normalizeTag(projectName);
  return new RegExp(`@${escapeRegex(tag)}(?=\\b|$)`, 'i');
}

export function projectTag(projectName: string): RegExp {
  return buildProjectTagGrep(projectName);
}

function resolveProjectContractFlags(env: NodeJS.ProcessEnv): ProjectContractFlags {
  const hasBrandsContract = Boolean(env.BRANDS?.trim());
  const hasLegacyLocalesContract = Boolean(env.LOCALES?.trim());

  if (hasBrandsContract && hasLegacyLocalesContract) {
    throw new Error(
      '[playwright-config] Use either BRANDS or LOCALES contract, not both in the same env file.'
    );
  }

  return {
    hasBrandsContract,
    hasLegacyLocalesContract,
    hasLocaleContract: hasBrandsContract || hasLegacyLocalesContract,
  };
}

export function buildEnvProjects(env: NodeJS.ProcessEnv = process.env): GeneratedLocaleProject[] {
  const flags = resolveProjectContractFlags(env);
  if (!flags.hasLocaleContract) {
    throw new Error(
      '[playwright-config] Missing locale contract. Define BRANDS or LOCALES in env file.'
    );
  }

  const contract = resolveMultilangContract(env);
  const marketProjects = buildLocaleProjects(contract, env);

  return marketProjects.map(project => ({
    ...project,
    // testBrand tests are manually scoped via dedicated project.
    testIgnore: '**/testBrand/**/*.spec.ts',
  }));
}
