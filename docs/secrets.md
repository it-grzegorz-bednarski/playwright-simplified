# Secrets & Environment Files

← [Back to main documentation](../README.md)

## Why `.env` files are not in this repository

Real environment files (e.g. `env/.env.dev`, `env/.env.staging`, `env/.env.prod`) contain sensitive data:

- passwords and login credentials,
- API keys and tokens,
- Percy tokens,
- Basic Auth credentials.

**These files must never be committed to version control.**

Only the template file `env/.env.example` is committed. It shows the full structure and all variable names, but contains no real values.

The current `.gitignore` policy enforces this:

```gitignore
env/*
!env/.env.example
```

---

## Where are the secrets stored in this project?

> ⚠️ **Fill this in for your project.** Replace the placeholder below with the actual location.

| Item | Location |
|------|----------|
| Real `.env.*` files | _e.g. Delinea Secret Server / Azure Key Vault / 1Password / shared network drive / link to internal wiki_ |
| CI secrets | _e.g. GitHub Actions → Repository Settings → Secrets and variables_ |

**Person responsible for secrets in this project:** _name / role / Slack channel_

---

## How to get the env files locally

1. Go to the secret storage location listed above.
2. Download or copy the real `.env.*` file(s) for the environment(s) you need.
3. Place them in the `env/` folder of this project:
   - `env/.env.dev`
   - `env/.env.staging`
   - `env/.env.prod`

   > ⚠️ **Windows gotcha:** File Explorer and some copy tools silently strip the leading dot from filenames starting with `.`.
   > After copying, verify the filename is `.env.dev` — **not** `env.dev`.
   > If the runner cannot find the env file, this is the most likely cause.
   > Use the terminal to copy to be safe:
   > ```powershell
   > Copy-Item "path\to\source\env.dev" "env\.env.dev"
   > ```
   > or rename it manually in the terminal after copying.

4. Verify your setup by running:
   ```sh
   yarn test dev
   ```

See **[Environments](./environments.md)** for the full structure of these files.

---

## How to update secrets

When a secret changes (password rotation, new token, etc.):

1. **Update the value locally** in your `env/.env.<env>` file.
2. **Upload the updated file** to the secret storage location listed above.
3. **Update CI** — add/update the secret in your CI provider (see table above).
4. **Notify the team** that credentials have changed so others can pull the updated file.

> Never paste real secrets into code, comments, logs, or chat messages.

---

## CI secret injection

When running in CI, environment files are **not loaded from disk**.

Instead, the runner detects the CI environment (`CI=true`) and reads all values directly from `process.env`, which is populated by the CI provider before the job starts.

Each CI platform has its own mechanism for injecting secrets:

| CI platform | Where to configure |
|-------------|-------------------|
| GitHub Actions | Repository → Settings → Secrets and variables → Actions |
| GitLab CI | Project → Settings → CI/CD → Variables |
| Azure DevOps | Pipeline → Library → Variable groups |
| Jenkins | Manage Jenkins → Credentials |

Variables must match the exact key names from `env/.env.example`.

See **[Test Runner: CI behavior](./testRunner.md)** for details on how the runner handles local vs CI environments.

---

## References

- **[Environments](./environments.md)** — full structure of `.env` files, variable naming conventions
- **[Test Runner](./testRunner.md)** — how env files are loaded before test runs

