const GOV_API_ORIGIN = 'https://api.posokanei.gov.gr';
const DEFAULT_GOV_ASSET_BASE = '/api';
const publicGovAssetBase =
  process.env.NEXT_PUBLIC_GOV_ASSET_BASE?.trim().replace(/\/+$/, '') || DEFAULT_GOV_ASSET_BASE;
const PRODUCT_PLACEHOLDER_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
    <rect width="96" height="96" rx="20" fill="#F8FAFC"/>
    <rect x="18" y="18" width="60" height="60" rx="16" fill="#E2E8F0"/>
    <path d="M32 38h32M32 48h32M32 58h20" stroke="#94A3B8" stroke-width="6" stroke-linecap="round"/>
  </svg>`
);

export const proxyGovAssetUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith(GOV_API_ORIGIN) ? url.replace(GOV_API_ORIGIN, publicGovAssetBase) : url;
};

export const retailerLogoUrl = (retailerId: string) =>
  `${publicGovAssetBase}/images/retailer/${retailerId}`;

export const productPlaceholderUrl = `data:image/svg+xml;charset=UTF-8,${PRODUCT_PLACEHOLDER_SVG}`;
