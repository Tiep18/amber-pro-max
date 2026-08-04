import {describe, expect, test} from 'vitest';

import snapshot from '@/checkout/data/vietnam-administrative-units-2025-07-01.json';
import {
  findVietnamAddressPair,
  validateVietnamAddress
} from '@/checkout/vietnam-address';
import {validateShippingDestination} from '@/checkout/shipping-address';

describe('official Vietnam two-level address contract', () => {
  test('checks in the reviewed Decision 19/2025 snapshot with exact official counts', () => {
    expect(snapshot.metadata).toMatchObject({
      decisionNumber: '19/2025/QD-TTg',
      effectiveDate: '2025-07-01',
      extractedAt: '2026-08-04'
    });
    expect(snapshot.metadata.sourceUrl).toMatch(/^https:\/\/danhmuchanhchinh\.nso\.gov\.vn\//);
    expect(snapshot.metadata.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.provinces).toHaveLength(34);

    const provinceCodes = snapshot.provinces.map((province) => province.code);
    const wards = snapshot.provinces.flatMap((province) =>
      province.wards.map((ward) => ({...ward, provinceCode: province.code}))
    );
    expect(new Set(provinceCodes).size).toBe(34);
    expect(provinceCodes.every((code) => /^\d{2}$/.test(code))).toBe(true);
    expect(wards).toHaveLength(3321);
    expect(new Set(wards.map((ward) => ward.code)).size).toBe(3321);
    expect(wards.every((ward) => /^\d{5}$/.test(ward.code))).toBe(true);
    expect(wards.every((ward) => provinceCodes.includes(ward.provinceCode))).toBe(true);
  });

  test('finds only an official province and parented ward pair by code or canonical name', () => {
    const hanoi = snapshot.provinces.find((province) => province.code === '01');
    const baDinh = hanoi?.wards.find((ward) => ward.code === '00004');
    const otherWard = snapshot.provinces.find((province) => province.code !== '01')?.wards[0];

    expect(hanoi?.name).toBe('Thành phố Hà Nội');
    expect(baDinh?.name).toBe('Phường Ba Đình');
    expect(findVietnamAddressPair('01', '00004')).toEqual({
      provinceCode: '01',
      provinceName: 'Thành phố Hà Nội',
      wardCode: '00004',
      wardName: 'Phường Ba Đình'
    });
    expect(findVietnamAddressPair('Thành phố Hà Nội', 'Phường Ba Đình')).toEqual(
      findVietnamAddressPair('01', '00004')
    );
    expect(findVietnamAddressPair('01', otherWard?.code ?? '')).toBeNull();
    expect(findVietnamAddressPair('not-a-province', '00004')).toBeNull();
  });

  test('requires province, ward, and detailed street while district stays optional', () => {
    expect(validateVietnamAddress({region: '01', locality: '00004', addressLine1: ' 12 Hàng Than '})).toEqual({
      success: true,
      data: {
        provinceCode: '01',
        provinceName: 'Thành phố Hà Nội',
        wardCode: '00004',
        wardName: 'Phường Ba Đình',
        addressLine1: '12 Hàng Than'
      }
    });
    expect(validateVietnamAddress({region: null, locality: '00004', addressLine1: '12 Hàng Than'})).toEqual({
      success: false,
      code: 'province_required'
    });
    expect(validateVietnamAddress({region: '01', locality: null, addressLine1: '12 Hàng Than'})).toEqual({
      success: false,
      code: 'ward_required'
    });
    expect(validateVietnamAddress({region: '01', locality: '00004', addressLine1: ' '})).toEqual({
      success: false,
      code: 'address_line1_required'
    });
  });

  test('normalizes final Vietnam checkout evidence and preserves optional legacy district detail', () => {
    expect(validateShippingDestination({
      recipientName: 'Nguyễn An',
      phoneNumber: '0912 345 678',
      countryCode: 'VN',
      region: '01',
      locality: '00004',
      addressLine1: '12 Hàng Than',
      addressLine2: 'Quận Ba Đình',
      postalCode: null
    }, {mode: 'final', hasPhysicalLines: true})).toEqual({
      success: true,
      data: {
        recipientName: 'Nguyễn An',
        phoneNumber: '+84912345678',
        countryCode: 'VN',
        region: 'Thành phố Hà Nội',
        locality: 'Phường Ba Đình',
        addressLine1: '12 Hàng Than',
        addressLine2: 'Quận Ba Đình',
        postalCode: null
      }
    });
  });
});
