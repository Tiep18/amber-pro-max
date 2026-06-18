import {z} from 'zod';

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
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
  region: optionalAddressPart,
  locality: optionalAddressPart,
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: optionalAddressPart,
  postalCode: optionalAddressPart
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
