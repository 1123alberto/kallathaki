import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const GOV_API_URL = process.env.GOV_API_URL || 'https://api.posokanei.gov.gr';
const PAGE_SIZE = 100;
const FETCH_CONCURRENCY = 8;
const ROOT = process.cwd();
const CATEGORIES_PATH = path.join(ROOT, 'src/app/api/[...path]/categories-fallback.json');
const PRODUCTS_PATH = path.join(ROOT, 'src/app/api/[...path]/products-fallback.json');
const STATS_PATH = path.join(ROOT, 'src/app/api/[...path]/stats-fallback.json');

function upstreamHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
    'Content-Type': 'application/json',
    'Origin': 'https://posokanei.gov.gr',
    'Referer': 'https://posokanei.gov.gr/'
  };
}

async function fetchSearchPage(page, categoryId) {
  const response = await fetch(`${GOV_API_URL}/products/search`, {
    method: 'POST',
    headers: upstreamHeaders(),
    body: JSON.stringify({ page, page_size: PAGE_SIZE, category_id: categoryId })
  });

  if (!response.ok) {
    throw new Error(`Gov API products/search failed for page ${page} in category ${categoryId}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchRemainingPages(totalPages, categoryId) {
  const pages = [];
  const pending = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2);

  while (pending.length > 0) {
    const batch = pending.splice(0, FETCH_CONCURRENCY);
    const responses = await Promise.all(batch.map((page) => fetchSearchPage(page, categoryId)));
    pages.push(...responses);
  }

  return pages;
}

function latestProductTimestamp(products) {
  let latest = '';
  for (const product of products) {
    if (product?.updated_at && product.updated_at > latest) {
      latest = product.updated_at;
    }
  }
  return latest || undefined;
}

function dedupeProducts(products) {
  const byId = new Map();
  for (const product of products) {
    if (product?.id) byId.set(product.id, product);
  }
  return Array.from(byId.values());
}

function buildStatsFallback(products, generatedAt) {
  const retailers = new Set();
  let productsOnDiscount = 0;
  let activeProducts = 0;

  for (const product of products) {
    const retailerPrices = Array.isArray(product?.retailer_prices) ? product.retailer_prices : [];
    if (retailerPrices.length > 0) activeProducts += 1;

    let discounted = false;
    for (const price of retailerPrices) {
      if (price?.retailer) retailers.add(price.retailer);
      if (!discounted && (price?.is_discount || Number(price?.discount_percentage || 0) > 0 || Number(price?.discount || 0) > 0)) {
        discounted = true;
      }
    }

    if (discounted) productsOnDiscount += 1;
  }

  return {
    timestamp: generatedAt,
    total_products: products.length,
    active_products: activeProducts,
    products_on_discount: productsOnDiscount,
    retailer_count: retailers.size,
    retailers: Array.from(retailers).sort()
  };
}

async function main() {
  console.log('Refreshing products fallback snapshot...');

  const categoriesContent = await readFile(CATEGORIES_PATH, 'utf8');
  const categoriesData = JSON.parse(categoriesContent);
  const rootCategoryIds = categoriesData.tree.map((cat) => cat.category_id);

  console.log(`Found ${rootCategoryIds.length} root categories to query.`);

  const allPages = [];
  for (const catId of rootCategoryIds) {
    console.log(`Querying category ${catId}...`);
    const firstPage = await fetchSearchPage(1, catId);
    const totalPages = Math.max(1, Number(firstPage.total_pages) || 1);
    console.log(`Category ${catId} has ${firstPage.total || 0} products across ${totalPages} pages.`);
    const remainingPages = await fetchRemainingPages(totalPages, catId);
    allPages.push(firstPage, ...remainingPages);
  }

  const products = dedupeProducts(allPages.flatMap((page) => page.products || []));
  const generatedAt = new Date().toISOString();
  const productUpdatedAtMax = latestProductTimestamp(products);

  const snapshot = {
    generated_at: generatedAt,
    source: `${GOV_API_URL}/products/search`,
    strategy: 'full catalog pagination via root categories',
    total: products.length,
    product_updated_at_max: productUpdatedAtMax,
    products
  };

  const statsFallback = buildStatsFallback(products, generatedAt);

  await writeFile(PRODUCTS_PATH, JSON.stringify(snapshot), 'utf8');
  await writeFile(STATS_PATH, JSON.stringify(statsFallback), 'utf8');

  console.log(`Snapshot written: ${products.length} products, latest product update ${productUpdatedAtMax || 'n/a'}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
