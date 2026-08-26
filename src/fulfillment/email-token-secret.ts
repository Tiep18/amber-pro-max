export const MIN_TRANSACTIONAL_EMAIL_TOKEN_SECRET_LENGTH = 32;

export function isTransactionalEmailTokenSecretReady(
  secret: string | null | undefined
): secret is string {
  return (
    typeof secret === 'string' &&
    secret.length >= MIN_TRANSACTIONAL_EMAIL_TOKEN_SECRET_LENGTH &&
    secret === secret.trim()
  );
}
