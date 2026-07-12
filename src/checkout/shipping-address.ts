import {z} from 'zod';

export const US_SHIPPING_REGION_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'AS', 'GU', 'MP', 'PR', 'VI'
] as const;

export type UsShippingRegionCode = (typeof US_SHIPPING_REGION_CODES)[number];

export type ShippingAddressIssueCode =
  | 'country_required'
  | 'country_invalid'
  | 'recipient_required'
  | 'phone_invalid'
  | 'address_line1_required'
  | 'us_region_required'
  | 'us_region_invalid'
  | 'us_postal_required'
  | 'us_postal_invalid'
  | 'invalid_address';

const optionalAddressPart = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed.length > 0 ? trimmed : null;
  });

export const shippingAddressSchema = z.object({
  recipientName: z.string().trim().min(1).max(120),
  phoneNumber: z.string().trim().min(5).max(40),
  countryCode: z.string().trim().regex(/^[A-Z]{2}$/),
  region: optionalAddressPart,
  locality: optionalAddressPart,
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: optionalAddressPart,
  postalCode: optionalAddressPart
}).strict();

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export type ShippingAddressIssue = {
  field: keyof ShippingAddress;
  code: ShippingAddressIssueCode;
};

const shippingAddressPreviewSchema = z.object({
  recipientName: z.string().optional(),
  phoneNumber: z.string().optional(),
  countryCode: z.string(),
  region: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional()
}).strict();

const usRegionCodes = new Set<string>(US_SHIPPING_REGION_CODES);
const usRegionNames = new Map<string, UsShippingRegionCode>([
  ['alabama','AL'],['alaska','AK'],['arizona','AZ'],['arkansas','AR'],['california','CA'],['colorado','CO'],
  ['connecticut','CT'],['delaware','DE'],['florida','FL'],['georgia','GA'],['hawaii','HI'],['idaho','ID'],
  ['illinois','IL'],['indiana','IN'],['iowa','IA'],['kansas','KS'],['kentucky','KY'],['louisiana','LA'],
  ['maine','ME'],['maryland','MD'],['massachusetts','MA'],['michigan','MI'],['minnesota','MN'],['mississippi','MS'],
  ['missouri','MO'],['montana','MT'],['nebraska','NE'],['nevada','NV'],['new hampshire','NH'],['new jersey','NJ'],
  ['new mexico','NM'],['new york','NY'],['north carolina','NC'],['north dakota','ND'],['ohio','OH'],['oklahoma','OK'],
  ['oregon','OR'],['pennsylvania','PA'],['rhode island','RI'],['south carolina','SC'],['south dakota','SD'],
  ['tennessee','TN'],['texas','TX'],['utah','UT'],['vermont','VT'],['virginia','VA'],['washington','WA'],
  ['west virginia','WV'],['wisconsin','WI'],['wyoming','WY'],['district of columbia','DC'],['american samoa','AS'],
  ['guam','GU'],['northern mariana islands','MP'],['puerto rico','PR'],['u.s. virgin islands','VI'],['us virgin islands','VI']
]);
const postalCodePattern = /^[A-Z0-9][A-Z0-9 -]{1,19}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function issue(field: keyof ShippingAddress, code: ShippingAddressIssueCode): ShippingAddressIssue {
  return {field, code};
}

export function normalizeLegacyShippingAddress(input: unknown): unknown {
  if (!isRecord(input)) return input;
  const countryCode = typeof input.countryCode === 'string' ? input.countryCode.trim().toUpperCase() : input.countryCode;
  const rawRegion = typeof input.region === 'string' ? input.region.trim() : input.region;
  const region = countryCode === 'US' && typeof rawRegion === 'string'
    ? (usRegionCodes.has(rawRegion.toUpperCase()) ? rawRegion.toUpperCase() : usRegionNames.get(rawRegion.toLowerCase()) ?? rawRegion)
    : rawRegion;
  return {...input, countryCode, region};
}

export function validateShippingDestination(
  input: unknown,
  options: {mode: 'preview' | 'final'; hasPhysicalLines: boolean}
):
  | {success: true; data: ShippingAddress | {countryCode: string; region: string | null} | null}
  | {success: false; issues: ShippingAddressIssue[]} {
  if (!options.hasPhysicalLines) {
    return {success: true, data: null};
  }

  if (options.mode === 'preview') {
    const parsed = shippingAddressPreviewSchema.safeParse(input);
    if (!parsed.success) {
      const countryCode = isRecord(input) ? input.countryCode : null;
      return {
        success: false,
        issues: [
          issue(
            'countryCode',
            typeof countryCode === 'string' && countryCode.trim().length === 0
              ? 'country_required'
              : 'country_invalid'
          )
        ]
      };
    }
    if (!/^[A-Z]{2}$/.test(parsed.data.countryCode)) {
      return {
        success: false,
        issues: [issue('countryCode', parsed.data.countryCode.trim() ? 'country_invalid' : 'country_required')]
      };
    }
    const region = parsed.data.region?.trim() || null;
    if (parsed.data.countryCode === 'US' && region && !usRegionCodes.has(region)) {
      return {success: false, issues: [issue('region', 'us_region_invalid')]};
    }
    return {success: true, data: {countryCode: parsed.data.countryCode, region}};
  }

  const parsed = shippingAddressSchema.safeParse(input);
  if (!parsed.success) {
    const value = isRecord(input) ? input : {};
    const issues: ShippingAddressIssue[] = [];
    const countryCode = typeof value.countryCode === 'string' ? value.countryCode : '';
    if (!countryCode.trim()) issues.push(issue('countryCode', 'country_required'));
    else if (!/^[A-Z]{2}$/.test(countryCode)) issues.push(issue('countryCode', 'country_invalid'));
    if (typeof value.recipientName !== 'string' || !value.recipientName.trim()) {
      issues.push(issue('recipientName', 'recipient_required'));
    }
    if (typeof value.phoneNumber !== 'string' || value.phoneNumber.trim().length < 5) {
      issues.push(issue('phoneNumber', 'phone_invalid'));
    }
    if (typeof value.addressLine1 !== 'string' || !value.addressLine1.trim()) {
      issues.push(issue('addressLine1', 'address_line1_required'));
    }
    return {success: false, issues: issues.length ? issues : [issue('countryCode', 'invalid_address')]};
  }

  if (parsed.data.countryCode === 'US') {
    if (!parsed.data.region) {
      return {success: false, issues: [issue('region', 'us_region_required')]};
    }
    if (!usRegionCodes.has(parsed.data.region)) {
      return {success: false, issues: [issue('region', 'us_region_invalid')]};
    }
    if (!parsed.data.postalCode) {
      return {success: false, issues: [issue('postalCode', 'us_postal_required')]};
    }
    if (!postalCodePattern.test(parsed.data.postalCode)) {
      return {success: false, issues: [issue('postalCode', 'us_postal_invalid')]};
    }
  }

  return {success: true, data: parsed.data};
}

export function quoteHasPhysicalLines(quote: unknown) {
  if (!isRecord(quote) || !Array.isArray(quote.lines)) {
    return false;
  }

  return quote.lines.some(
    (line) =>
      isRecord(line) &&
      line.fulfillmentType === 'physical' &&
      typeof line.quantity === 'number' &&
      line.quantity > 0
  );
}

export function quoteShippingCountryCode(quote: unknown) {
  if (!isRecord(quote) || !isRecord(quote.shipping)) {
    return null;
  }
  const countryCode = quote.shipping.countryCode;
  return typeof countryCode === 'string' && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
}

export function formatShippingAddressLines(address: ShippingAddress) {
  return [
    address.recipientName,
    address.phoneNumber,
    address.addressLine1,
    address.addressLine2,
    [address.locality, address.region, address.postalCode].filter(Boolean).join(', '),
    address.countryCode
  ].filter((line): line is string => Boolean(line));
}
