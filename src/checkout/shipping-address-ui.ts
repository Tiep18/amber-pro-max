import type {Locale} from '@/i18n/routing';
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

export const US_SHIPPING_REGION_OPTIONS = US_SHIPPING_REGION_CODES.map((code) => ({
  code,
  labelKey: 'shippingRegion.' + code
}));

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
    postalCode: 'Enter a valid US postal code.'
  },
  vi: {
    countryCode: 'Chon quoc gia giao hang.',
    recipientName: 'Nhap ten nguoi nhan.',
    phoneNumber: 'Nhap so dien thoai toi thieu 5 ky tu.',
    addressLine1: 'Nhap dia chi duong.',
    region: 'Chon bang hoac lanh tho Hoa Ky hop le.',
    postalCode: 'Nhap ma buu chinh Hoa Ky hop le.'
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
        searchText: `${label} ${code}`.toLowerCase()
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, locale));
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
  if (result.success) {
    return {};
  }

  const copy = validationCopy[locale];
  return result.issues.reduce<ShippingAddressValidationErrors>((errors, item) => {
    const copyKey = issueFieldCopy[item.code];
    errors[item.field] = copy[copyKey];
    return errors;
  }, {});
}
