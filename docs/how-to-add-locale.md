# How to Add a Locale

← [Back to main documentation](../README.md)

All changes are in `env/.env.<env>` only — no code changes needed.

---

## 1. Add a locale to an existing brand

```env
# Before
MYBRAND_LOCALES=PL,CS

# After
MYBRAND_LOCALES=PL,CS,DE

MYBRAND_BASE_URL_DE=https://example.com?locale=de   # required
MYBRAND_TENANT_DE=de_DE                              # optional
MYBRAND_USER_DE=demo_de                              # optional
MYBRAND_PASSWORD_DE=secret_de                        # optional
```

`buildEnvProjects()` auto-generates a `mybrand-de` project with `@de` tag.

→ See [Multilang: Configuration](./multilang.md#configuration) for the full key reference.

---

## 2. Add a new brand

```env
# Add brand to the registry
BRANDS=MYBRAND,NEWBRAND

# Define the brand
NEWBRAND_LOCALES=FR
NEWBRAND_BASE_URL_FR=https://example.com?locale=fr
```

Projects `newbrand-fr` with tags `@newbrand`, `@fr` are generated automatically.

---

## 3. Add a locale group

```env
MYBRAND_GROUP_NORDIC=NO,SE,DK
```

Tests tagged `@nordic` run on `mybrand-no`, `mybrand-se`, and `mybrand-dk` projects.

---

## 4. Disable a locale temporarily

```env
MYBRAND_DISABLED_LOCALES=DE
```

The `mybrand-de` project is not generated for this run.

---

## 5. Write tests for the new locale

```ts
// Runs on all locales (including the new one)
test('global check', async ({ page }) => { ... });

// Runs only on DE locale
test('DE-specific', { tag: '@de' }, async ({ envByLocale }) => {
  const baseUrl = envByLocale('BASE_URL'); // resolves MYBRAND_BASE_URL_DE
});
```

→ See [Multilang: Usage](./multilang.md#usage) | [Data](./data.md) | [Tags](./tags.md)


