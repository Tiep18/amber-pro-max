/**
 * Digital orders are delivered to the contact email and nowhere else, so a
 * mistyped domain costs the customer the thing they just paid for. This is a
 * *suggestion* only: it never blocks submitting, because a domain we do not
 * recognise is far more often a real domain than a typo.
 */
const KNOWN_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.com.vn',
  'hotmail.com',
  'outlook.com',
  'outlook.com.vn',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'yandex.com',
  'mail.com',
  'gmx.com',
  'zoho.com',
  'email.com',
  'fastmail.com',
  'fpt.com.vn',
  'vnn.vn'
] as const;

const KNOWN_DOMAIN_SET = new Set<string>(KNOWN_DOMAINS);

/**
 * Typos that are two or more edits away from the real domain and therefore
 * out of reach of the distance-1 rule below, but common enough to be worth
 * naming explicitly.
 */
const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gmial.co': 'gmail.com',
  'gmai.co': 'gmail.com',
  'gmial.con': 'gmail.com',
  'gnail.con': 'gmail.com',
  'gmaill.con': 'gmail.com',
  'hotmial.con': 'hotmail.com',
  'yahoo.con.vn': 'yahoo.com.vn',
  'iclould.com': 'icloud.com'
};

/** Only mistypings of `.com`; `.co`, `.cm`, and `.om` are real ccTLDs. */
const COMMON_TLD_TYPOS: Record<string, string> = {
  con: 'com',
  cmo: 'com',
  comm: 'com',
  ocm: 'com',
  vom: 'com',
  xom: 'com',
  cim: 'com'
};

/**
 * Damerau-Levenshtein rather than plain Levenshtein: the dominant keyboard
 * typo is a transposition (`gmial`), which plain Levenshtein scores as 2 and
 * would push past the distance-1 threshold that keeps false positives rare.
 */
export function damerauLevenshtein(left: string, right: string): number {
  if (left === right) return 0;
  const rows = left.length + 1;
  const columns = right.length + 1;
  const distance: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(columns).fill(0)
  );

  for (let row = 0; row < rows; row += 1) distance[row][0] = row;
  for (let column = 0; column < columns; column += 1) distance[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      distance[row][column] = Math.min(
        distance[row - 1][column] + 1,
        distance[row][column - 1] + 1,
        distance[row - 1][column - 1] + substitutionCost
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distance[row][column] = Math.min(distance[row][column], distance[row - 2][column - 2] + 1);
      }
    }
  }

  return distance[rows - 1][columns - 1];
}

function nearestKnownDomain(domain: string): string | null {
  // Below five characters a single edit stops being evidence of a typo: `mx.vn`
  // is one edit from nothing in particular and two from several real domains.
  if (domain.length < 5) return null;
  for (const candidate of KNOWN_DOMAINS) {
    if (damerauLevenshtein(domain, candidate) === 1) {
      return candidate;
    }
  }
  return null;
}

function correctedTld(domain: string): string | null {
  const lastDot = domain.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const tld = domain.slice(lastDot + 1);
  const corrected = COMMON_TLD_TYPOS[tld];
  return corrected ? `${domain.slice(0, lastDot)}.${corrected}` : null;
}

/**
 * Returns the full corrected address, or `null` when the domain looks fine or
 * is too far from anything known to guess at.
 */
export function suggestEmailCorrection(input: string): string | null {
  const email = input.trim();
  const separator = email.lastIndexOf('@');
  if (separator <= 0 || separator === email.length - 1) return null;
  if (/\s/.test(email)) return null;

  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1).toLowerCase();
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null;
  if (KNOWN_DOMAIN_SET.has(domain)) return null;

  const suggestion =
    COMMON_DOMAIN_TYPOS[domain] ?? nearestKnownDomain(domain) ?? correctedTld(domain);
  if (!suggestion || suggestion === domain) return null;

  return `${local}@${suggestion}`;
}
