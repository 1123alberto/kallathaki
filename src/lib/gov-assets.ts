const GOV_API_ORIGIN = 'https://api.posokanei.gov.gr';
const DEFAULT_GOV_ASSET_BASE = '/api';
const publicGovAssetBase =
  process.env.NEXT_PUBLIC_GOV_ASSET_BASE?.trim().replace(/\/+$/, '') || DEFAULT_GOV_ASSET_BASE;

export const proxyGovAssetUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith(GOV_API_ORIGIN) ? url.replace(GOV_API_ORIGIN, publicGovAssetBase) : url;
};

export const retailerLogoUrl = (retailerId: string) =>
  `${publicGovAssetBase}/images/retailer/${retailerId}`;
