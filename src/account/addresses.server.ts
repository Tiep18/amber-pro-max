import 'server-only';

import {
  mapCustomerShippingAddressRow,
  type CustomerShippingAddress,
  type CustomerShippingAddressResult
} from '@/account/addresses';
import {runMonitoredAction} from '@/operations/monitoring';

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options?: Record<string, unknown>
        ) => Promise<{data: unknown[] | null; error: unknown}>;
      };
    };
  };
};

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
