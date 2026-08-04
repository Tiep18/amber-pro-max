const permittedVietnamPhoneCharacters = /^[+0-9 .()\-]+$/;
const mobileNationalNumber = /^[3-9]\d{8}$/;

/**
 * Accept common domestic and +84 typing forms, then return one persistence
 * representation. Prefix 2 is excluded because it is reserved for fixed-line
 * area codes; carrier-specific mobile prefixes are intentionally not frozen.
 */
export function normalizeVietnamPhone(input: string | null | undefined): string | null {
  const trimmed = input?.trim() ?? '';
  if (!trimmed || !permittedVietnamPhoneCharacters.test(trimmed)) return null;

  const compact = trimmed.replace(/[ .()\-]/g, '');
  let nationalNumber: string | null = null;
  if (/^0\d{9}$/.test(compact)) {
    nationalNumber = compact.slice(1);
  } else if (/^\+84\d{9}$/.test(compact)) {
    nationalNumber = compact.slice(3);
  }

  return nationalNumber && mobileNationalNumber.test(nationalNumber)
    ? `+84${nationalNumber}`
    : null;
}
