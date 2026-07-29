type VoidOrPromise = void | Promise<void>;

function toPositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveShardTotal(): number {
  const explicitTotal =
    toPositiveInt(process.env.PW_SHARD_TOTAL) ??
    toPositiveInt(process.env.SHARD_TOTAL) ??
    toPositiveInt(process.env.PLAYWRIGHT_SHARD_TOTAL);

  if (explicitTotal) return explicitTotal;

  // Optional fallback format: PLAYWRIGHT_SHARD="1/4"
  const shardExpr = process.env.PLAYWRIGHT_SHARD?.trim();
  if (shardExpr) {
    const parts = shardExpr.split('/');
    if (parts.length === 2) {
      const fromExpr = toPositiveInt(parts[1]);
      if (fromExpr) return fromExpr;
    }
  }

  return 1;
}

export function isCiShardingEnabled(): boolean {
  return Boolean(process.env.CI) && resolveShardTotal() > 1;
}

export async function runWithoutCiSharding(task: () => VoidOrPromise): Promise<void> {
  if (isCiShardingEnabled()) {
    return;
  }

  await task();
}
