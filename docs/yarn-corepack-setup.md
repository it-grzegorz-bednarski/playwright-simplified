# Yarn & Corepack Setup

← [Back to main documentation](../README.md)

## Overview

This guide shows how to enable Corepack, activate the project Yarn version, and install dependencies in this repository.

**Prerequisites:** First complete the **[NVM setup](./nvm-setup.md)** to ensure Node.js 24.18.0 is installed and activated.

---

## Prerequisites

1. **[NVM installed](./nvm-setup.md)** and activated
   - Ensures Node.js 24.18.0 LTS is installed and available

**Quick check:**

```bash
nvm use
node --version
# Output should show: v24.18.0
```

---

## Installation

Run the following commands in your console.

Note: `corepack enable` may require elevated privileges. On Windows open PowerShell as Administrator; on macOS/Linux re-run the command with `sudo` if it fails.

```sh
# Enable Corepack and activate the project Yarn version
corepack enable
corepack prepare yarn@4.12.0 --activate

# Verify Yarn version (expected output: 4.12.0)
yarn -v

yarn config set nodeLinker node-modules
yarn install
```

---

## Verification

- `yarn -v` shows `4.12.0`.
- `.yarnrc.yml` contains `nodeLinker: node-modules`.
- `yarn.lock` exists in the repository.

---

## Notes

- If `yarn -v` shows a version different from `4.12.0`, restart terminal and check `yarn -v` again.
