export interface Geo {
  ip: string,
  country: string,
  country_code: string,
  region: string,
  city: string,
  timezone: string,
  latitude: number | null,
  longitude: number | null,
  isp: string,
  organization: string,
  asn_organization: string,
  asn: number | null
}

const RE_COUNTRY_CODE = /^[A-Z]{2}$/;

/** Reject malformed data before it reaches rendering; absent optional metadata is harmless. */
export function parseGeo(input: unknown): Geo {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Invalid geo response');
  const record = input as Record<string, unknown>;
  const text = (key: string, required = false): string => {
    const value = record[key];
    if (!required && (value === undefined || value === null)) return '';
    if (typeof value !== 'string') throw new TypeError(`Invalid geo field: ${key}`);
    return value;
  };
  const numeric = (key: string): number | null => {
    const value = record[key];
    if (value === undefined || value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`Invalid geo field: ${key}`);
    return value;
  };
  const ip = text('ip', true);
  const countryCode = text('country_code', true).toUpperCase();
  if (countryCode !== '' && !RE_COUNTRY_CODE.test(countryCode)) throw new TypeError('Invalid geo country code');
  return {
    ip,
    country_code: countryCode,
    country: text('country'),
    region: text('region'),
    city: text('city'),
    timezone: text('timezone'),
    latitude: numeric('latitude'),
    longitude: numeric('longitude'),
    isp: text('isp'),
    organization: text('organization'),
    asn_organization: text('asn_organization'),
    asn: numeric('asn')
  };
}
