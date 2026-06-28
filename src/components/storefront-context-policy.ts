export const STOREFRONT_CONTEXT_TTL_MS = 5 * 60 * 1000;

export function shouldRevalidateStorefrontContext(
  lastValidatedAt: number | null,
  now = Date.now()
) {
  return lastValidatedAt === null || now - lastValidatedAt > STOREFRONT_CONTEXT_TTL_MS;
}
