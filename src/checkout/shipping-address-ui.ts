import type {Locale} from '@/i18n/routing';
import {vietnamAdministrativeSnapshot} from './vietnam-address';
import {
  US_SHIPPING_REGION_CODES,
  validateShippingDestination,
  type ShippingAddress,
  type ShippingAddressIssueCode
} from './shipping-address';

export type CheckoutShippingAddressDraft = ShippingAddress;

export type ShippingAddressValidationErrors = Partial<Record<keyof CheckoutShippingAddressDraft, string>>;

export type ShippingCountryOption = {
  code: string;
  label: string;
  searchText: string;
};

export type ShippingSubdivisionOption = ShippingCountryOption;

export const US_SHIPPING_REGION_OPTIONS = US_SHIPPING_REGION_CODES.map((code) => ({
  code,
  labelKey: 'shippingRegion.' + code
}));

const usRegionNames: Record<(typeof US_SHIPPING_REGION_CODES)[number], string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia', AS: 'American Samoa', GU: 'Guam',
  MP: 'Northern Mariana Islands', PR: 'Puerto Rico', VI: 'United States Virgin Islands'
};

const viUsRegionNames: Partial<Record<(typeof US_SHIPPING_REGION_CODES)[number], string>> = {
  DC: 'Đặc khu Columbia',
  AS: 'Samoa thuộc Mỹ',
  MP: 'Quần đảo Bắc Mariana',
  VI: 'Quần đảo Virgin thuộc Mỹ'
};

export function normalizeShippingSearchText(value: string, locale: Locale | 'vi' = 'en') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, (character) => (character === 'Đ' ? 'D' : 'd'))
    .toLocaleLowerCase(locale)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const fallbackRegionCodes = [
  'AD',
  'AE',
  'AF',
  'AG',
  'AI',
  'AL',
  'AM',
  'AO',
  'AQ',
  'AR',
  'AS',
  'AT',
  'AU',
  'AW',
  'AX',
  'AZ',
  'BA',
  'BB',
  'BD',
  'BE',
  'BF',
  'BG',
  'BH',
  'BI',
  'BJ',
  'BL',
  'BM',
  'BN',
  'BO',
  'BQ',
  'BR',
  'BS',
  'BT',
  'BV',
  'BW',
  'BY',
  'BZ',
  'CA',
  'CC',
  'CD',
  'CF',
  'CG',
  'CH',
  'CI',
  'CK',
  'CL',
  'CM',
  'CN',
  'CO',
  'CR',
  'CU',
  'CV',
  'CW',
  'CX',
  'CY',
  'CZ',
  'DE',
  'DJ',
  'DK',
  'DM',
  'DO',
  'DZ',
  'EC',
  'EE',
  'EG',
  'EH',
  'ER',
  'ES',
  'ET',
  'FI',
  'FJ',
  'FK',
  'FM',
  'FO',
  'FR',
  'GA',
  'GB',
  'GD',
  'GE',
  'GF',
  'GG',
  'GH',
  'GI',
  'GL',
  'GM',
  'GN',
  'GP',
  'GQ',
  'GR',
  'GS',
  'GT',
  'GU',
  'GW',
  'GY',
  'HK',
  'HM',
  'HN',
  'HR',
  'HT',
  'HU',
  'ID',
  'IE',
  'IL',
  'IM',
  'IN',
  'IO',
  'IQ',
  'IR',
  'IS',
  'IT',
  'JE',
  'JM',
  'JO',
  'JP',
  'KE',
  'KG',
  'KH',
  'KI',
  'KM',
  'KN',
  'KP',
  'KR',
  'KW',
  'KY',
  'KZ',
  'LA',
  'LB',
  'LC',
  'LI',
  'LK',
  'LR',
  'LS',
  'LT',
  'LU',
  'LV',
  'LY',
  'MA',
  'MC',
  'MD',
  'ME',
  'MF',
  'MG',
  'MH',
  'MK',
  'ML',
  'MM',
  'MN',
  'MO',
  'MP',
  'MQ',
  'MR',
  'MS',
  'MT',
  'MU',
  'MV',
  'MW',
  'MX',
  'MY',
  'MZ',
  'NA',
  'NC',
  'NE',
  'NF',
  'NG',
  'NI',
  'NL',
  'NO',
  'NP',
  'NR',
  'NU',
  'NZ',
  'OM',
  'PA',
  'PE',
  'PF',
  'PG',
  'PH',
  'PK',
  'PL',
  'PM',
  'PN',
  'PR',
  'PS',
  'PT',
  'PW',
  'PY',
  'QA',
  'RE',
  'RO',
  'RS',
  'RU',
  'RW',
  'SA',
  'SB',
  'SC',
  'SD',
  'SE',
  'SG',
  'SH',
  'SI',
  'SJ',
  'SK',
  'SL',
  'SM',
  'SN',
  'SO',
  'SR',
  'SS',
  'ST',
  'SV',
  'SX',
  'SY',
  'SZ',
  'TC',
  'TD',
  'TF',
  'TG',
  'TH',
  'TJ',
  'TK',
  'TL',
  'TM',
  'TN',
  'TO',
  'TR',
  'TT',
  'TV',
  'TW',
  'TZ',
  'UA',
  'UG',
  'UM',
  'US',
  'UY',
  'UZ',
  'VA',
  'VC',
  'VE',
  'VG',
  'VI',
  'VN',
  'VU',
  'WF',
  'WS',
  'YE',
  'YT',
  'ZA',
  'ZM',
  'ZW'
] as const;

const validationCopy = {
  en: {
    countryCode: 'Choose a shipping country.',
    recipientName: 'Enter the recipient name.',
    phoneNumber: 'Enter a phone number with at least 5 characters.',
    addressLine1: 'Enter the street address.',
    region: 'Choose a valid US state or territory.',
    postalCode: 'Enter a valid US postal code.',
    vnProvince: 'Choose a valid Province or City.',
    vnWard: 'Choose a valid Ward, Commune, or Special zone.'
  },
  vi: {
    countryCode: 'Chọn quốc gia giao hàng.',
    recipientName: 'Nhập tên người nhận.',
    phoneNumber: 'Nhập số điện thoại hợp lệ.',
    addressLine1: 'Nhập số nhà, tên đường và địa chỉ chi tiết.',
    region: 'Chọn bang hoặc vùng lãnh thổ Hoa Kỳ hợp lệ.',
    postalCode: 'Nhập mã bưu chính Hoa Kỳ hợp lệ.',
    vnProvince: 'Chọn Tỉnh hoặc Thành phố hợp lệ.',
    vnWard: 'Chọn Phường, Xã hoặc Đặc khu hợp lệ.'
  }
} as const;

function getRegionCodes() {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('region' as never).filter((code) => /^[A-Z]{2}$/.test(code));
    } catch {
      return [...fallbackRegionCodes];
    }
  }
  return [...fallbackRegionCodes];
}

export function getShippingCountryOptions(locale: Locale): ShippingCountryOption[] {
  const displayNames = new Intl.DisplayNames([locale], {type: 'region'});

  return getRegionCodes()
    .map((code) => {
      const label = displayNames.of(code) ?? code;
      return {
        code,
        label,
        searchText: normalizeShippingSearchText(`${label} ${code}`, locale)
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

export function getUsShippingRegionOptions(locale: Locale): ShippingSubdivisionOption[] {
  return US_SHIPPING_REGION_CODES.map((code) => {
    const name = locale === 'vi' ? (viUsRegionNames[code] ?? usRegionNames[code]) : usRegionNames[code];
    const label = `${name} (${code})`;
    return {code, label, searchText: normalizeShippingSearchText(`${name} ${code}`, locale)};
  });
}

export function getVietnamProvinceOptions(): ShippingSubdivisionOption[] {
  return vietnamAdministrativeSnapshot.provinces.map((province) => ({
    code: province.code,
    label: province.name,
    searchText: normalizeShippingSearchText(`${province.name} ${province.code}`, 'vi')
  }));
}

export function getVietnamWardOptions(provinceCode: string | null | undefined): ShippingSubdivisionOption[] {
  const province = vietnamAdministrativeSnapshot.provinces.find(
    (candidate) => candidate.code === provinceCode?.trim()
  );
  return (
    province?.wards.map((ward) => ({
      code: ward.code,
      label: ward.name,
      searchText: normalizeShippingSearchText(`${ward.name} ${ward.code}`, 'vi')
    })) ?? []
  );
}

const issueFieldCopy: Record<ShippingAddressIssueCode, keyof typeof validationCopy.en> = {
  country_required: 'countryCode',
  country_invalid: 'countryCode',
  recipient_required: 'recipientName',
  phone_invalid: 'phoneNumber',
  address_line1_required: 'addressLine1',
  us_region_required: 'region',
  us_region_invalid: 'region',
  us_postal_required: 'postalCode',
  us_postal_invalid: 'postalCode',
  vn_province_required: 'vnProvince',
  vn_province_invalid: 'vnProvince',
  vn_ward_required: 'vnWard',
  vn_ward_invalid: 'vnWard',
  invalid_address: 'countryCode'
};

export function validateCheckoutShippingAddress(
  address: CheckoutShippingAddressDraft,
  locale: Locale,
  options: {mode: 'preview' | 'final'; hasPhysicalLines: boolean} = {
    mode: 'final',
    hasPhysicalLines: true
  }
): ShippingAddressValidationErrors {
  const result = validateShippingDestination(address, options);
  const copy = validationCopy[locale];
  const errors = result.success
    ? {}
    : result.issues.reduce<ShippingAddressValidationErrors>((current, item) => {
        const copyKey = issueFieldCopy[item.code];
        current[item.field] = copy[copyKey];
        return current;
      }, {});

  if (options.mode === 'final' && options.hasPhysicalLines && address.countryCode === 'VN') {
    const province = getVietnamProvinceOptions().find(
      (option) => option.code === address.region || option.label === address.region
    );
    if (!province) errors.region = copy.vnProvince;
    const ward = province
      ? getVietnamWardOptions(province.code).find(
          (option) => option.code === address.locality || option.label === address.locality
        )
      : null;
    if (!ward) errors.locality = copy.vnWard;
    if (!address.addressLine1.trim()) errors.addressLine1 = copy.addressLine1;
  }

  return errors;
}
