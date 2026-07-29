# Projects

← [Back to main documentation](../README.md)

## Overview

Project list is built from two sources:

- auto projects from env (`buildEnvProjects(...)`),
- manual projects defined in `playwright.config.ts`.

This keeps locale/brand routing automatic and still allows custom project entries.

---

## Configuration

`utils/projectsBuilder.ts` provides:

- `buildEnvProjects(process.env)` - builds projects from `BRANDS`/`LOCALES` contract,
- `projectTag(name)` - builds tag-based `grep` from project name.

Example manual project entry:

```ts
const envProjects = buildEnvProjects(process.env);

const projects = [
  ...envProjects,
  {
    name: 'testBrand',
    grep: projectTag('testBrand'),
    // optional per-project options:
    // use: { baseURL: 'https://example.com' },
    // retries: 1,
    // timeout: 120_000,
  },
];
```

`projectTag('testBrand')` matches `@testbrand` (case-insensitive, normalized).

---

## Usage

- env projects resolve locale/group routing tags (for example `@pl`, `@slavic`),
- manual projects resolve their own tag (for example `@testBrand`),
- manual project routing is tag-based (no `testMatch` required),
- unknown routing tags are non-blocking (tests simply do not match unrelated projects).
