import useSWRImmutable from 'swr/immutable';

import { parseGeo } from '@/lib/geo';
import type { Geo } from '@/lib/geo';

export type { Geo } from '@/lib/geo';

// Modified by 烟雨: same-origin geo endpoint supplied separately by the operator.
const GEO_URL = '/api/geo';

// Only the deployed site has the Snippet in front of it; the dev server answers with this instead.
const SAMPLE: Geo = {
  ip: '2001:db8:85a3:8d3:1319:8a2e:370:7348',
  country: 'Japan',
  country_code: 'JP',
  region: 'Tokyo',
  city: 'Chiyoda',
  timezone: 'Asia/Tokyo',
  latitude: 35.6938,
  longitude: 139.7536,
  isp: 'Japan Nation-wide Network of Softbank Corp.',
  organization: 'Japan Nation-wide Network of Softbank Corp.',
  asn_organization: 'Japan Nation-wide Network of Softbank Corp.',
  asn: 64496
};

async function fetchGeo(url: string): Promise<Geo> {
  if (process.env.NODE_ENV === 'development') return SAMPLE;
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Geo lookup failed: ${response.status}`);
  return parseGeo(await response.json());
}

export function useGeo() {
  return useSWRImmutable(GEO_URL, fetchGeo, { errorRetryCount: 2 });
}
