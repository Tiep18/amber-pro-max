import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/auth/guards', () => ({requireUser: vi.fn()}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: vi.fn()}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: vi.fn()}));

import {
  customerAddressToShippingAddress,
  getCustomerShippingAddresses,
  mapCustomerShippingAddressRow,
  parseCustomerShippingAddressInput
} from '@/account/addresses';
import {
  deleteCustomerShippingAddress,
  saveCheckoutShippingAddressAction,
  saveCustomerShippingAddress,
  setDefaultCustomerShippingAddress
} from '@/account/address-actions';
import {requireUser} from '@/auth/guards';
import {createSupabaseServerClient} from '@/lib/supabase/server';
import {recordOperationalFailure} from '@/operations/errors';

const addressId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';

const validInput = {
  label: '  Home  ',
  recipientName: '  Taylor Customer  ',
  phoneNumber: ' +15551234567 ',
  countryCode: 'us',
  region: ' California ',
  locality: ' San Francisco ',
  addressLine1: ' 123 Market Street ',
  addressLine2: ' ',
  postalCode: ' 94105 ',
  isDefault: true
};

describe('saved shipping address contracts (ACC-03, D-01, D-02, D-04)', () => {
  test('parses and normalizes the existing checkout shipping-address semantics', () => {
    expect(parseCustomerShippingAddressInput(validInput)).toEqual({
      success: true,
      data: {
        label: 'Home',
        recipientName: 'Taylor Customer',
        phoneNumber: '+15551234567',
        countryCode: 'US',
        region: 'CA',
        locality: 'San Francisco',
        addressLine1: '123 Market Street',
        addressLine2: null,
        postalCode: '94105',
        isDefault: true
      }
    });
    expect(parseCustomerShippingAddressInput({...validInput, recipientName: '', countryCode: 'USA'})).toEqual({
      success: false,
      code: 'invalid_address'
    });
  });

  test('reuses official Vietnam pair and mobile normalization for saved addresses', () => {
    expect(parseCustomerShippingAddressInput({
      label: 'Nhà',
      recipientName: 'Nguyễn An',
      phoneNumber: '0912-345-678',
      countryCode: 'vn',
      region: '01',
      locality: '00004',
      addressLine1: '12 Hàng Than',
      addressLine2: null,
      postalCode: null,
      isDefault: false
    })).toEqual({
      success: true,
      data: {
        label: 'Nhà',
        recipientName: 'Nguyễn An',
        phoneNumber: '+84912345678',
        countryCode: 'VN',
        region: 'Thành phố Hà Nội',
        locality: 'Phường Ba Đình',
        addressLine1: '12 Hàng Than',
        addressLine2: null,
        postalCode: null,
        isDefault: false
      }
    });
    expect(parseCustomerShippingAddressInput({
      ...validInput,
      countryCode: 'VN',
      phoneNumber: '0241234567',
      region: '01',
      locality: '00004'
    })).toEqual({success: false, code: 'invalid_address'});
  });

  test('maps database rows without exposing owner ids to account UI data', () => {
    const mapped = mapCustomerShippingAddressRow({
        id: addressId,
        user_id: ownerId,
        label: 'Home',
        recipient_name: 'Taylor Customer',
        phone_number: '+15551234567',
        country_code: 'US',
        region: 'California',
        locality: 'San Francisco',
        address_line_1: '123 Market Street',
        address_line_2: null,
        postal_code: '94105',
        is_default: true,
        created_at: '2026-06-20T00:00:00.000Z',
        updated_at: '2026-06-20T00:00:00.000Z'
      });

    expect(mapped).toEqual({
      id: addressId,
      label: 'Home',
      recipientName: 'Taylor Customer',
      phoneNumber: '+15551234567',
      countryCode: 'US',
      region: 'CA',
      locality: 'San Francisco',
      addressLine1: '123 Market Street',
      addressLine2: null,
      postalCode: '94105',
      isDefault: true,
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z'
    });
    expect(customerAddressToShippingAddress(mapped!)).toEqual({
      recipientName: 'Taylor Customer',
      phoneNumber: '+15551234567',
      countryCode: 'US',
      region: 'CA',
      locality: 'San Francisco',
      addressLine1: '123 Market Street',
      addressLine2: null,
      postalCode: '94105'
    });
  });

  test('queries with the server-owned user id and preserves stable creation order', async () => {
    const order = vi.fn(() => Promise.resolve({
      data: [
        {
          id: addressId,
          label: 'Home',
          recipient_name: 'Taylor Customer',
          phone_number: '+15551234567',
          country_code: 'US',
          region: null,
          locality: null,
          address_line_1: '123 Market Street',
          address_line_2: null,
          postal_code: null,
          is_default: true,
          created_at: '2026-06-20T00:00:00.000Z',
          updated_at: '2026-06-20T00:00:00.000Z'
        }
      ],
      error: null
    }));
    const eq = vi.fn(() => ({order}));
    const select = vi.fn(() => ({eq}));
    const client = {from: vi.fn(() => ({select}))};

    await expect(getCustomerShippingAddresses({userId: ownerId, client: client as never})).resolves.toMatchObject({
      status: 'success',
      addresses: [{id: addressId, isDefault: true}]
    });
    expect(client.from).toHaveBeenCalledWith('customer_shipping_addresses');
    expect(eq).toHaveBeenCalledWith('user_id', ownerId);
    expect(order).toHaveBeenCalledWith('created_at', {ascending: true});
  });

  test('records sanitized operational failures for saved address load errors', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const order = vi.fn(() => Promise.resolve({data: null, error: {message: 'relation private.address_notes does not exist'}}));
    const eq = vi.fn(() => ({order}));
    const select = vi.fn(() => ({eq}));
    const client = {from: vi.fn(() => ({select}))};

    await expect(getCustomerShippingAddresses({userId: ownerId, client: client as never})).resolves.toEqual({
      status: 'error',
      code: 'addresses_load_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'application',
        severity: 'error',
        errorCode: 'account.addresses.load_failed',
        summary: 'Customer shipping addresses load failed',
        facts: expect.objectContaining({
          action: 'addresses_load',
          code: 'addresses_load_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/address_notes|relation|private|owner|user_id|Taylor|Market Street|phone|email|token/i);
  });

  test('saves through the atomic RPC without accepting a browser owner id', async () => {
    const rpc = vi.fn(() => Promise.resolve({data: {status: 'saved', address_id: addressId}, error: null}));

    await expect(
      saveCustomerShippingAddress({addressId: null, input: validInput, client: {rpc} as never})
    ).resolves.toEqual({status: 'saved', addressId});
    expect(rpc).toHaveBeenCalledWith(
      'save_customer_shipping_address',
      expect.not.objectContaining({user_id: expect.anything(), ownerId: expect.anything()})
    );
  });

  test('returns safe invalid, not-found, and default action states', async () => {
    const saveRpc = vi.fn();
    await expect(
      saveCustomerShippingAddress({addressId: null, input: {...validInput, addressLine1: ''}, client: {rpc: saveRpc} as never})
    ).resolves.toEqual({status: 'invalid', code: 'invalid_address'});
    expect(saveRpc).not.toHaveBeenCalled();

    const deleteRpc = vi.fn(() => Promise.resolve({data: {status: 'not_found'}, error: null}));
    await expect(
      deleteCustomerShippingAddress({addressId, client: {rpc: deleteRpc} as never})
    ).resolves.toEqual({status: 'not_found'});

    const defaultRpc = vi.fn(() => Promise.resolve({data: {status: 'default_set'}, error: null}));
    await expect(
      setDefaultCustomerShippingAddress({addressId, client: {rpc: defaultRpc} as never})
    ).resolves.toEqual({status: 'default_set'});
  });

  test('records sanitized operational failures for address RPC errors and unexpected results', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const saveRpc = vi.fn(() => Promise.resolve({data: null, error: {message: 'constraint failed'}}));
    await expect(
      saveCustomerShippingAddress({addressId, input: validInput, client: {rpc: saveRpc} as never})
    ).resolves.toEqual({status: 'error', code: 'address_action_failed'});

    const deleteRpc = vi.fn(() => Promise.resolve({data: {status: 'unknown'}, error: null}));
    await expect(
      deleteCustomerShippingAddress({addressId, client: {rpc: deleteRpc} as never})
    ).resolves.toEqual({status: 'error', code: 'address_action_failed'});

    const defaultRpc = vi.fn(() => Promise.resolve({data: null, error: {message: 'rpc failed'}}));
    await expect(
      setDefaultCustomerShippingAddress({addressId, client: {rpc: defaultRpc} as never})
    ).resolves.toEqual({status: 'error', code: 'address_action_failed'});

    expect(recordOperationalFailure).toHaveBeenCalledTimes(3);
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        area: 'application',
        errorCode: 'account.address.save_failed',
        facts: expect.objectContaining({action: 'address_save', referenceId: addressId})
      })
    );
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        area: 'application',
        errorCode: 'account.address.delete_failed',
        facts: expect.objectContaining({action: 'address_delete', referenceId: addressId, status: 'unknown'})
      })
    );
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        area: 'application',
        errorCode: 'account.address.default_failed',
        facts: expect.objectContaining({action: 'address_default', referenceId: addressId})
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(
      /Taylor Customer|\+15551234567|Market Street|94105|email|token/i
    );
  });

  test('keeps address error states when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockRejectedValue(new Error('operational table unavailable'));

    const order = vi.fn(() => Promise.resolve({data: null, error: {message: 'load failed'}}));
    const eq = vi.fn(() => ({order}));
    const select = vi.fn(() => ({eq}));
    const loadClient = {from: vi.fn(() => ({select}))};

    await expect(getCustomerShippingAddresses({userId: ownerId, client: loadClient as never})).resolves.toEqual({
      status: 'error',
      code: 'addresses_load_failed'
    });

    const saveRpc = vi.fn(() => Promise.resolve({data: null, error: {message: 'save failed'}}));
    await expect(
      saveCustomerShippingAddress({addressId, input: validInput, client: {rpc: saveRpc} as never})
    ).resolves.toEqual({status: 'error', code: 'address_action_failed'});

    const deleteRpc = vi.fn(() => Promise.resolve({data: {status: 'unknown'}, error: null}));
    await expect(deleteCustomerShippingAddress({addressId, client: {rpc: deleteRpc} as never})).resolves.toEqual({
      status: 'error',
      code: 'address_action_failed'
    });

    const defaultRpc = vi.fn(() => Promise.resolve({data: null, error: {message: 'default failed'}}));
    await expect(setDefaultCustomerShippingAddress({addressId, client: {rpc: defaultRpc} as never})).resolves.toEqual({
      status: 'error',
      code: 'address_action_failed'
    });
  });

  test('saves checkout address intent only after server authentication and strict revalidation', async () => {
    const rpc = vi.fn(() => Promise.resolve({data: {status: 'saved', address_id: addressId}, error: null}));
    vi.mocked(requireUser).mockReset();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(requireUser).mockResolvedValue({id: ownerId} as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({rpc} as never);

    await expect(saveCheckoutShippingAddressAction({locale: 'en', address: validInput})).resolves.toEqual({
      status: 'saved',
      addressId
    });
    expect(requireUser).toHaveBeenCalledWith({locale: 'en', next: '/en/checkout'});
    expect(rpc).toHaveBeenCalledWith(
      'save_customer_shipping_address',
      expect.not.objectContaining({userId: expect.anything(), ownerId: expect.anything(), customerId: expect.anything()})
    );
  });

  test('rejects caller identity fields and anonymous saves before any address RPC', async () => {
    const rpc = vi.fn();
    vi.mocked(requireUser).mockReset();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({rpc} as never);

    await expect(saveCheckoutShippingAddressAction({
      locale: 'en',
      address: validInput,
      userId: ownerId
    } as never)).resolves.toEqual({status: 'not_saved', code: 'invalid_address'});
    expect(requireUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();

    vi.mocked(requireUser).mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(saveCheckoutShippingAddressAction({locale: 'vi', address: validInput})).rejects.toThrow('NEXT_REDIRECT');
    expect(rpc).not.toHaveBeenCalled();
  });

  test('keeps optional address-save failure separate from checkout or order success', async () => {
    const rpc = vi.fn(() => Promise.resolve({data: null, error: {message: 'save failed'} }));
    vi.mocked(requireUser).mockReset();
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(requireUser).mockResolvedValue({id: ownerId} as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({rpc} as never);

    await expect(saveCheckoutShippingAddressAction({locale: 'en', address: validInput})).resolves.toEqual({
      status: 'not_saved',
      code: 'address_save_failed'
    });
  });
});
