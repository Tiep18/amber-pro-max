import snapshotJson from './data/vietnam-administrative-units-2025-07-01.json';

export type VietnamWard = {
  code: string;
  name: string;
};

export type VietnamProvince = {
  code: string;
  name: string;
  wards: VietnamWard[];
};

export type VietnamAdministrativeSnapshot = {
  metadata: {
    decisionNumber: string;
    effectiveDate: string;
    sourceUrl: string;
    decisionUrl: string;
    extractedAt: string;
    sourceSha256: string;
  };
  provinces: VietnamProvince[];
};

export type VietnamAddressPair = {
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
};

export type VietnamAddressValidationResult =
  | {
      success: true;
      data: VietnamAddressPair & {addressLine1: string};
    }
  | {
      success: false;
      code:
        | 'province_required'
        | 'province_invalid'
        | 'ward_required'
        | 'ward_invalid'
        | 'address_line1_required';
    };

export const vietnamAdministrativeSnapshot = snapshotJson as VietnamAdministrativeSnapshot;

const normalizeLookupValue = (value: string) => value.trim().normalize('NFC').toLocaleLowerCase('vi');
const provincesByCode = new Map(
  vietnamAdministrativeSnapshot.provinces.map((province) => [province.code, province])
);
const provincesByName = new Map(
  vietnamAdministrativeSnapshot.provinces.map((province) => [normalizeLookupValue(province.name), province])
);

function findProvince(value: string) {
  const trimmed = value.trim();
  return provincesByCode.get(trimmed) ?? provincesByName.get(normalizeLookupValue(trimmed)) ?? null;
}

export function findVietnamAddressPair(
  provinceValue: string | null | undefined,
  wardValue: string | null | undefined
): VietnamAddressPair | null {
  if (!provinceValue?.trim() || !wardValue?.trim()) return null;
  const province = findProvince(provinceValue);
  if (!province) return null;

  const wardLookup = normalizeLookupValue(wardValue);
  const ward = province.wards.find(
    (candidate) => candidate.code === wardValue.trim() || normalizeLookupValue(candidate.name) === wardLookup
  );
  if (!ward) return null;

  return {
    provinceCode: province.code,
    provinceName: province.name,
    wardCode: ward.code,
    wardName: ward.name
  };
}

export function validateVietnamAddress(input: {
  region: string | null | undefined;
  locality: string | null | undefined;
  addressLine1: string | null | undefined;
}): VietnamAddressValidationResult {
  const region = input.region?.trim() ?? '';
  const locality = input.locality?.trim() ?? '';
  const addressLine1 = input.addressLine1?.trim() ?? '';

  if (!region) return {success: false, code: 'province_required'};
  const province = findProvince(region);
  if (!province) return {success: false, code: 'province_invalid'};
  if (!locality) return {success: false, code: 'ward_required'};
  const pair = findVietnamAddressPair(province.code, locality);
  if (!pair) return {success: false, code: 'ward_invalid'};
  if (!addressLine1) return {success: false, code: 'address_line1_required'};

  return {success: true, data: {...pair, addressLine1}};
}
