import type { HeaderValueResolver } from './types';

/**
 * Resolve a header value from session meta.
 *
 * @example
 * headers: {
 *   Authorization: fromSessionMeta('authHeader'),
 * }
 */
export function fromSessionMeta(metaKey: string): HeaderValueResolver {
  return ({ sessionMeta }) => sessionMeta?.[metaKey];
}
