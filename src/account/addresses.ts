import {z} from 'zod';
import {shippingAddressSchema, type ShippingAddress} from '@/checkout/shipping-address';
import {runMonitoredAction} from '@/operations/monitoring';

export const customerShippingAddressInputSchema = shippingAddressSchema.extend({
  label: z.string().trim().min(1).max(80),
  isDefault: z.boolean().default(false)
});

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options?: Record<string, unknown>) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
};

export type CustomerShippingAddressInput = z.input<typeof customerShippingAddressInputSchema>;

export type CustomerShippingAddress = ShippingAddress & {
  id: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CustomerShippingAddressResult =
  | {status: 'success'; addresses: CustomerShippingAddress[]}
  | {status: 'error'; code: 'addresses_load_failed'};

export function customerAddressToShippingAddress(address: CustomerShippingAddress): ShippingAddress {
  return {
    recipientName: address.recipientName,
    phoneNumber: address.phoneNumber,
    countryCode: address.countryCode,
    region: address.region,
    locality: address.locality,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    postalCode: address.postalCode
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parseCustomerShippingAddressInput(input: unknown) {
  const parsed = customerShippingAddressInputSchema.safeParse(input);
  if (!parsed.success) {
    return {success: false, code: 'invalid_address'} as const;
  }
  return {success: true, data: parsed.data} as const;
}

export function mapCustomerShippingAddressRow(row: unknown): CustomerShippingAddress | null {
  if (
    !isRecord(row) ||
    typeof row.id !== 'string' ||
    typeof row.label !== 'string' ||
    typeof row.recipient_name !== 'string' ||
    typeof row.phone_number !== 'string' ||
    typeof row.country_code !== 'string' ||
    typeof row.address_line_1 !== 'string' ||
    typeof row.is_default !== 'boolean' ||
    typeof row.created_at !== 'string' ||
    typeof row.updated_at !== 'string'
  ) {
    return null;
  }

  return {
    id: row.id,
    label: row.label,
    recipientName: row.recipient_name,
    phoneNumber: row.phone_number,
    countryCode: row.country_code,
    region: optionalString(row.region),
    locality: optionalString(row.locality),
    addressLine1: row.address_line_1,
    addressLine2: optionalString(row.address_line_2),
    postalCode: optionalString(row.postal_code),
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getCustomerShippingAddresses({
  userId,
  client
}: {
  userId: string;
  client: QueryClient;
}): Promise<CustomerShippingAddressResult> {
  return runMonitoredAction({
    area: 'application',
    action: 'addresses_load',
    errorCode: 'account.addresses.load_failed',
    summary: 'Customer shipping addresses load failed',
    facts: {
      code: 'addresses_load_failed'
    },
    errorResult: {status: 'error', code: 'addresses_load_failed'} as const,
    shouldRecordResult: (result) => result.status === 'error',
    operation: async () => {
      const query = client
        .from('customer_shipping_addresses')
        .select(
          'id,label,recipient_name,phone_number,country_code,region,locality,address_line_1,address_line_2,postal_code,is_default,created_at,updated_at'
        );
      const {data, error} = await query.eq('user_id', userId).order('created_at', {ascending: true});
      if (error || !Array.isArray(data)) {
        return {status: 'error', code: 'addresses_load_failed'} as const;
      }

      return {
        status: 'success',
        addresses: data
          .map(mapCustomerShippingAddressRow)
          .filter((address): address is CustomerShippingAddress => Boolean(address))
      } as const;
    }
  });
}
