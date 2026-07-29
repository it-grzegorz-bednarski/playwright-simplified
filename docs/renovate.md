# Renovate

← [Back to main documentation](../README.md)

## Overview

Renovate is used to keep dependencies up to date by creating automatic pull requests.

---

## Configuration

Main config file:

- [`renovate.json`](../renovate.json)

Before configuration can run on GitHub, install the Renovate GitHub App for the repository:

- [Renovate GitHub App](https://github.com/apps/renovate)

Example config (short form):

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended", ":dependencyDashboard"],
  "timezone": "Europe/Warsaw",
  "schedule": ["after 1am and before 2am every day"],
  "ignoreDeps": ["@playwright/test", "playwright"],
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["after 2am and before 3am every sunday"]
  },
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr"
    },
    {
      "matchUpdateTypes": ["minor"],
      "automerge": false
    },
    {
      "groupName": "code quality",
      "matchPackageNames": [
        "eslint",
        "@eslint/js",
        "typescript",
        "prettier",
        "lint-staged",
        "husky",
        "@types/node"
      ]
    },
    {
      "matchUpdateTypes": ["major"],
      "addLabels": ["dependencies-major-review"],
      "automerge": false
    }
  ]
}
```

### What each key does

- **`extends`** - pulls Renovate presets (`config:recommended`) and enables dependency dashboard issue (`:dependencyDashboard`).
- **`timezone`** - applies schedule windows in local team time.
- **`schedule`** - defines when Renovate is allowed to create/update PRs.
- **`ignoreDeps`** - fully excludes selected packages from updates.
- **`packageRules`** - rules per package/update type (grouping, labels, automerge, version policy).
- **`lockFileMaintenance`** - periodic lockfile refresh window for transitive dependency maintenance.
- **`prHourlyLimit` / `prConcurrentLimit`** - controls PR volume.

### Practical examples (active examples)

#### 1) Ignore packages

```json
{
  "ignoreDeps": ["example-pinned-package", "another-package-to-freeze"]
}
```

#### 2) Patch-only policy for selected package

```json
{
  "description": "Allow only patch updates for this package.",
  "matchPackageNames": ["axios"],
  "matchUpdateTypes": ["major", "minor"],
  "enabled": true
}
```

The rule blocks `major` and `minor`, so only `patch` is allowed.

#### 3) Optional automerge for safe updates

```json
{
  "description": "Enable automerge for low-risk dev dependency patch/digest updates.",
  "matchDepTypes": ["devDependencies"],
  "matchUpdateTypes": ["patch", "digest"],
  "automerge": true,
  "automergeType": "pr",
  "enabled": true
}
```

#### 4) Label major updates for manual review

```json
{
  "description": "Route major updates to a custom review label and custom PR title.",
  "matchUpdateTypes": ["major"],
  "addLabels": ["dependencies-major-review"],
  "commitMessageAction": "review",
  "commitMessageTopic": "major dependency updates",
  "commitMessageExtra": "(additional testing recommended)",
  "enabled": true
}
```

This helps quickly filter high-risk updates in GitHub PR views.

#### 5) Group toolchain updates into one PR

```json
{
  "groupName": "code quality",
  "matchPackageNames": [
    "eslint",
    "@eslint/js",
    "typescript",
    "prettier",
    "lint-staged",
    "husky",
    "@types/node"
  ]
}
```

#### 6) Lockfile maintenance window

```json
{
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["after 2am and before 3am every sunday"]
  }
}
```

This updates only the lockfile on a scheduled window and helps keep transitive dependencies fresh.

By default, lockfile maintenance creates a PR for manual review. To enable automerge for it:

```json
{
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["after 2am and before 3am every sunday"],
    "automerge": true
  }
}
```

#### 7) Pin package to a specific version range

Use `allowedVersions` to restrict which version Renovate is allowed to update to.

Pin to an exact version:

```json
{
  "description": "Pin example-package to exactly 8.0.3.",
  "matchPackageNames": ["example-package"],
  "allowedVersions": "8.0.3"
}
```

Allow only versions between 8.x and below 9:

```json
{
  "description": "Keep example-package within major version 8.",
  "matchPackageNames": ["example-package"],
  "allowedVersions": ">=8.0.0 <9.0.0"
}
```

Allow anything below 9.x.x:

```json
{
  "description": "Block example-package from reaching v9.",
  "matchPackageNames": ["example-package"],
  "allowedVersions": "<9.0.0"
}
```

---

## Usage

### Daily flow

1. Renovate checks dependencies in the configured schedule window.
2. It creates or updates branch(es) like `renovate/...`.
3. It opens pull request(s) based on `packageRules`.
4. CI runs as with any normal PR.
5. PR is merged manually unless an automerge rule is enabled.

### Typical adjustments

- change update window: edit `schedule`,
- stop updating a package: add it to `ignoreDeps` or create a disabled/enabled package rule,
- cap update type for one package: use `matchUpdateTypes`,
- group packages into one PR: configure `groupName` + `matchPackageNames`,
- enable automerge for low-risk updates: use `automerge` rules with strict matching.

---

## Monorepo notes

If this repo evolves into a monorepo, keep one top-level Renovate config and extend `packageRules` with `matchFileNames` or package name patterns to scope rules per package:

```json
{
  "packageRules": [
    {
      "description": "Apply stricter schedule only to packages under apps/frontend.",
      "matchFileNames": ["apps/frontend/package.json"],
      "schedule": ["before 3am every monday"]
    }
  ]
}
```

## References

- **[Renovate documentation](https://docs.renovatebot.com/)**
