# NVM Setup (Node Version Manager)

← [Back to main documentation](../README.md)

## Overview

NVM (Node Version Manager) allows you to install and switch between different Node.js versions on your machine.

This project uses [`.nvmrc`](../.nvmrc) file to pin Node.js version to **24.18.0 LTS** across all team members, ensuring consistency.

---

## Installation

### Linux / macOS

Install NVM (official installer) and then install/use Node.js 24.18.0:

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc # or source ~/.zshrc
nvm install 24.18.0
nvm use 24.18.0
```

### Windows

Download and run the `nvm-setup.exe` from:

https://github.com/coreybutler/nvm-windows/releases

Then run (PowerShell or CMD):

```sh
nvm install 24.18.0
nvm use 24.18.0
```

Verify:

```sh
node --version
# should print: v24.18.0
```

---

## Next Steps

1. **[Yarn & Corepack setup](./yarn-corepack-setup.md)** — enable Corepack and install dependencies
2. Follow the remaining steps in **[README.md](../README.md)** to install project dependencies
