// api/export/crawl-url.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { badRequest, serverError } from '../_lib/helpers';

interface CrawledProduct {
  source: 'etsy' | 'tiktok' | 'temu' | 'amazon' | 'aliexpress' | 'unknown';
  title: string;
  images: string[];
  price?: string;
  currency?: string;
  url: string;
  description?: string;
  capturedAt: string;
}

// Detect platform from URL
function detectPlatform(url: string): CrawledProduct['source'] {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('etsy.com')) return 'etsy';
  if (hostname.includes('tiktok.com')) return 'tiktok';
  if (hostname.includes('temu.com')) return 'temu';
  if (hostname.includes('amazon.')) return 'amazon';
  if (hostname.includes('aliexpress.')) return 'aliexpress';
  return 'unknown';
}

// Parse Etsy product page
function parseEtsy(html: string, url: string): Partial<CrawledProduct> {
  const titleMatch = html.match(/<h1[^>]*data-buy-box-listing-title[^>]*>([^<]+)<\/h1>/i) ||
                     html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : '';

  // Extract images from carousel or og:image
  const images: string[] = [];
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch) images.push(ogImageMatch[1]);

  // Find more images from data-src-zoom-image or srcset
  const imgMatches = html.matchAll(/data-src-zoom-image="([^"]+)"/gi);
  for (const m of imgMatches) {
    if (!images.includes(m[1])) images.push(m[1]);
  }

  // Also check for etsystatic CDN images
  const cdnMatches = html.matchAll(/(https:\/\/i\.etsystatic\.com\/[^"'\s]+_fullxfull[^"'\s]+)/gi);
  for (const m of cdnMatches) {
    const imgUrl = m[1].split('?')[0];
    if (!images.some(i => i.includes(imgUrl.split('/').pop() || ''))) {
      images.push(imgUrl);
    }
  }

  // Extract price
  const priceMatch = html.match(/currency-value[^>]*>([^<]+)</i) ||
                     html.match(/"price":\s*"([^"]+)"/i);
  const price = priceMatch ? priceMatch[1].trim() : '';

  // Extract description
  const descMatch = html.match(/data-product-details-description-text-content[^>]*>([^<]+)/i) ||
                    html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const description = descMatch ? decodeHtml(descMatch[1].trim()) : '';

  return { title, images: images.slice(0, 15), price, description };
}

// Parse TikTok Shop product page
function parseTikTok(html: string, url: string): Partial<CrawledProduct> {
  // Try to extract from og:title
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);
  let title = titleMatch ? decodeHtml(titleMatch[1].trim()) : '';
  title = title.replace(/\s*[-|–]\s*TikTok Shop\s*$/i, '');

  // Extract images
  const images: string[] = [];
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch) images.push(ogImageMatch[1]);

  // Find TikTok CDN images
  const cdnPatterns = [
    /https:\/\/[^"'\s]*(?:ibyteimg|tiktokcdn|ttcdn)[^"'\s]*:\d+:\d+[^"'\s]*/gi,
    /https:\/\/p1[69]-oec-va[^"'\s]+/gi,
  ];
  for (const pattern of cdnPatterns) {
    const matches = html.matchAll(pattern);
    for (const m of matches) {
      const imgUrl = m[0];
      if (!imgUrl.includes('badge') && !imgUrl.includes('logo') && !imgUrl.includes('icon')) {
        if (!images.includes(imgUrl)) images.push(imgUrl);
      }
    }
  }

  // Extract price from loaderData or meta
  let price = '';
  const priceMatch = html.match(/"sale_price_format":\s*"([^"]+)"/i) ||
                     html.match(/"price":\s*"([^"]+)"/i);
  if (priceMatch) price = priceMatch[1];

  // Extract description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const description = descMatch ? decodeHtml(descMatch[1].trim()) : '';

  return { title, images: images.slice(0, 15), price, description };
}

// Parse Temu product page
function parseTemu(html: string, url: string): Partial<CrawledProduct> {
  // Extract title - prioritize og:title as h1 may not be in server HTML
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                     html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  let title = titleMatch ? decodeHtml(titleMatch[1].trim()) : '';
  // Clean up title suffix
  title = title.replace(/\s*[-–|]\s*Temu\s*(Vietnam|[A-Z][a-z]+)?\s*$/i, '');

  // Extract images
  const images: string[] = [];

  // Try to extract from URL query param (top_gallery_url)
  try {
    const urlObj = new URL(url);
    const topGalleryUrl = urlObj.searchParams.get('top_gallery_url');
    if (topGalleryUrl) {
      images.push(topGalleryUrl);
    }
  } catch {}

  // Try og:image
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch && !images.includes(ogImageMatch[1])) {
    images.push(ogImageMatch[1]);
  }

  // Find product images from kwcdn (filter out UI icons)
  const cdnMatches = html.matchAll(/https:\/\/img\.kwcdn\.com\/product[^"'\s]*\.(?:jpg|jpeg|png|webp)/gi);
  for (const m of cdnMatches) {
    if (!images.includes(m[0])) images.push(m[0]);
  }

  // Extract price
  const priceMatch = html.match(/"price":\s*"?([^",}]+)/i) ||
                     html.match(/\$\s*([\d.,]+)/);
  const price = priceMatch ? priceMatch[1].trim() : '';

  // Extract description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const description = descMatch ? decodeHtml(descMatch[1].trim()) : '';

  return { title, images: images.slice(0, 15), price, description };
}

// Parse Amazon product page
function parseAmazon(html: string, url: string): Partial<CrawledProduct> {
  const titleMatch = html.match(/id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
                     html.match(/<meta\s+name="title"\s+content="([^"]+)"/i);
  const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : '';

  const images: string[] = [];
  // Amazon uses data-old-hires or data-a-dynamic-image
  const hiresMatches = html.matchAll(/data-old-hires="([^"]+)"/gi);
  for (const m of hiresMatches) {
    if (!images.includes(m[1])) images.push(m[1]);
  }

  // Also check og:image
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch && !images.includes(ogImageMatch[1])) {
    images.unshift(ogImageMatch[1]);
  }

  const priceMatch = html.match(/class="a-price-whole"[^>]*>([^<]+)</i) ||
                     html.match(/id="priceblock_ourprice"[^>]*>([^<]+)</i);
  const price = priceMatch ? priceMatch[1].replace(/[^\d.,]/g, '') : '';

  const descMatch = html.match(/id="productDescription"[^>]*>[\s\S]*?<p[^>]*>([^<]+)</i) ||
                    html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const description = descMatch ? decodeHtml(descMatch[1].trim()) : '';

  return { title, images: images.slice(0, 15), price, description };
}

// Parse AliExpress product page
function parseAliExpress(html: string, url: string): Partial<CrawledProduct> {
  const titleMatch = html.match(/<h1[^>]*data-pl="product-title"[^>]*>([^<]+)<\/h1>/i) ||
                     html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : '';

  const images: string[] = [];
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch) images.push(ogImageMatch[1]);

  // AliExpress CDN images
  const cdnMatches = html.matchAll(/https:\/\/[^"'\s]*ae\d+\.alicdn\.com[^"'\s]+/gi);
  for (const m of cdnMatches) {
    const imgUrl = m[0].split('?')[0];
    if (imgUrl.match(/\.(jpg|jpeg|png|webp)$/i) && !images.includes(imgUrl)) {
      images.push(imgUrl);
    }
  }

  const priceMatch = html.match(/"formattedActivityPrice":\s*"([^"]+)"/i) ||
                     html.match(/"minPrice":\s*"?([^",}]+)/i);
  const price = priceMatch ? priceMatch[1].trim() : '';

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const description = descMatch ? decodeHtml(descMatch[1].trim()) : '';

  return { title, images: images.slice(0, 15), price, description };
}

// Generic fallback parser
function parseGeneric(html: string, url: string): Partial<CrawledProduct> {
  // Try og:title or <title>
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);
  const title = titleMatch ? decodeHtml(titleMatch[1].trim()) : '';

  // Try og:image
  const images: string[] = [];
  const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImageMatch) images.push(ogImageMatch[1]);

  // Find any large images
  const imgMatches = html.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/gi);
  for (const m of imgMatches) {
    if (!images.includes(m[1]) && !m[1].includes('logo') && !m[1].includes('icon')) {
      images.push(m[1]);
    }
  }

  // Try to find price
  const priceMatch = html.match(/\$\s*([\d.,]+)/) ||
                     html.match(/"price":\s*"?([^",}]+)/i);
  const price = priceMatch ? priceMatch[1].trim() : '';

  // Try description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  const description = descMatch ? decodeHtml(descMatch[1].trim()) : '';

  return { title, images: images.slice(0, 15), price, description };
}

// Decode HTML entities
function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

interface CrawlResult {
  url: string;
  success: boolean;
  product?: CrawledProduct;
  error?: string;
}

interface BatchResponse {
  results: CrawlResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function crawlSingleUrl(url: string): Promise<CrawlResult> {
  try {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return { url, success: false, error: 'Invalid URL format' };
    }

    const source = detectPlatform(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { url, success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const html = await response.text();

    let parsed: Partial<CrawledProduct>;
    switch (source) {
      case 'etsy': parsed = parseEtsy(html, url); break;
      case 'tiktok': parsed = parseTikTok(html, url); break;
      case 'temu': parsed = parseTemu(html, url); break;
      case 'amazon': parsed = parseAmazon(html, url); break;
      case 'aliexpress': parsed = parseAliExpress(html, url); break;
      default: parsed = parseGeneric(html, url);
    }

    const product: CrawledProduct = {
      source,
      title: parsed.title || 'Untitled Product',
      images: parsed.images || [],
      price: parsed.price,
      currency: parsed.price?.match(/[$€£¥₫₩₹]/)?.[0] || '$',
      url,
      description: parsed.description,
      capturedAt: new Date().toISOString(),
    };

    return { url, success: true, product };

  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { url, success: false, error: 'Request timeout (10s)' };
    }
    return { url, success: false, error: err.message || 'Unknown error' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const { urls } = req.body || {};

    let urlList: string[] = [];
    if (typeof urls === 'string') {
      urlList = [urls];
    } else if (Array.isArray(urls)) {
      urlList = urls.filter(u => typeof u === 'string' && u.trim());
    } else if (req.body?.url && typeof req.body.url === 'string') {
      urlList = [req.body.url];
    }

    if (urlList.length === 0) {
      return badRequest(res, 'At least one URL is required');
    }

    if (urlList.length > 20) {
      return badRequest(res, 'Maximum 20 URLs allowed per request');
    }

    urlList = [...new Set(urlList)];

    const results: CrawlResult[] = [];
    for (let i = 0; i < urlList.length; i++) {
      const result = await crawlSingleUrl(urlList[i]);
      results.push(result);

      if (i < urlList.length - 1) {
        await delay(1000);
      }
    }

    const response: BatchResponse = {
      results,
      summary: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    };

    return res.status(200).json(response);

  } catch (err) {
    console.error('Crawl URL error:', err);
    return serverError(res, err);
  }
}
