export function maskEmailForAdmin(email: string) {
  const [name, domain] = email.split('@');
  if (!name || !domain) {
    return 'masked';
  }
  if (name.length <= 2) {
    return `${name[0] ?? '*'}***@${domain}`;
  }
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}

export function sanitizeEmailFailureCode(value: string | null | undefined) {
  const normalized = (value ?? '').toLowerCase();
  if (
    !normalized ||
    /(authorization|bearer|raw_token|signed_url|provider_payload|object_path|secret)/.test(
      normalized
    )
  ) {
    return 'provider_error';
  }
  return normalized.replace(/[^a-z0-9_:-]/g, '_').slice(0, 80) || 'provider_error';
}
