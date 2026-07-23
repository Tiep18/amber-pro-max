export const STOREFRONT_CONTEXT_TTL_MS = 5 * 60 * 1000;

export function shouldRevalidateStorefrontContext(
  lastValidatedAt: number | null,
  now = Date.now(),
  visibilityState: DocumentVisibilityState = 'visible'
) {
  if (visibilityState !== 'visible') return false;
  return lastValidatedAt === null || now - lastValidatedAt > STOREFRONT_CONTEXT_TTL_MS;
}
