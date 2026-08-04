import {beforeAll, describe, expect, it, vi} from 'vitest';

vi.mock('server-only', () => ({}));

type SupportConfigModule = typeof import('@/support/config');

let getPublicSupportConfig: SupportConfigModule['getPublicSupportConfig'];

beforeAll(async () => {
  ({getPublicSupportConfig} = await import('@/support/config'));
});

describe('public support configuration', () => {
  it('returns a safe no-channel DTO with the default store timezone', () => {
    expect(getPublicSupportConfig({})).toEqual({
      emailHref: null,
      zaloHref: null,
      hasChannels: false,
      storeTimeZone: 'Asia/Ho_Chi_Minh'
    });
  });

  it('projects a validated support email without inventing Zalo', () => {
    expect(getPublicSupportConfig({SUPPORT_EMAIL: ' help@example.com '})).toEqual({
      emailHref: 'mailto:help@example.com',
      zaloHref: null,
      hasChannels: true,
      storeTimeZone: 'Asia/Ho_Chi_Minh'
    });
  });

  it('projects only an exact HTTPS zalo.me URL', () => {
    expect(getPublicSupportConfig({SUPPORT_ZALO_URL: 'https://zalo.me/0123456789'})).toEqual({
      emailHref: null,
      zaloHref: 'https://zalo.me/0123456789',
      hasChannels: true,
      storeTimeZone: 'Asia/Ho_Chi_Minh'
    });
  });

  it('projects both validated channels and a valid configured timezone', () => {
    expect(
      getPublicSupportConfig({
        SUPPORT_EMAIL: 'support@example.com',
        SUPPORT_ZALO_URL: 'https://zalo.me/ambertinybear',
        STORE_TIME_ZONE: 'America/New_York'
      })
    ).toEqual({
      emailHref: 'mailto:support@example.com',
      zaloHref: 'https://zalo.me/ambertinybear',
      hasChannels: true,
      storeTimeZone: 'America/New_York'
    });
  });

  it.each([
    ['bad email', {SUPPORT_EMAIL: 'not-an-email'}],
    ['non-HTTPS Zalo', {SUPPORT_ZALO_URL: 'http://zalo.me/example'}],
    ['lookalike Zalo host', {SUPPORT_ZALO_URL: 'https://zalo.me.evil.example/example'}],
    ['credential-bearing Zalo', {SUPPORT_ZALO_URL: 'https://user:pass@zalo.me/example'}]
  ])('omits malformed optional channels: %s', (_label, source) => {
    expect(getPublicSupportConfig(source)).toMatchObject({
      emailHref: null,
      zaloHref: null,
      hasChannels: false
    });
  });

  it('falls back for an invalid timezone without changing configured channels', () => {
    expect(
      getPublicSupportConfig({
        SUPPORT_EMAIL: 'help@example.com',
        STORE_TIME_ZONE: 'Not/A_Time_Zone'
      })
    ).toEqual({
      emailHref: 'mailto:help@example.com',
      zaloHref: null,
      hasChannels: true,
      storeTimeZone: 'Asia/Ho_Chi_Minh'
    });
  });
});
