// src/components/UrlCrawlPanel.tsx
import React, { useState, useEffect } from 'react';
import { getToken } from '../services/apiClient';
import { CrawledProduct } from '../pages/CrawlExport';

interface TemuCategory {
  categoryId: string;
  productName: string;
  configs: string[];
}

const TEMU_CATEGORIES: TemuCategory[] = [
  { categoryId: '9519', productName: 'Egg-Cups', configs: ['PACK_CUSTOM'] },
  { categoryId: '10334', productName: 'Tumblers', configs: ['CUSTOM', 'PACK_CUSTOM'] },
  { categoryId: '10585', productName: 'Mugs', configs: ['NORMAL', 'CUSTOM', 'PACK', 'PACK_CUSTOM'] },
  { categoryId: '10601', productName: 'Wiskey Glass', configs: ['PACK_CUSTOM'] },
  { categoryId: '11459', productName: 'Table Runner', configs: ['CUSTOM'] },
  { categoryId: '11666', productName: 'Banners', configs: ['NORMAL'] },
  { categoryId: '11899', productName: 'Blanket', configs: ['NORMAL', 'CUSTOM'] },
  { categoryId: '12042', productName: 'Pillow', configs: ['CUSTOM'] },
  { categoryId: '12141', productName: 'Ornament', configs: ['NORMAL', 'CUSTOM'] },
  { categoryId: '12193', productName: 'Acrylic Blocks', configs: ['CUSTOM'] },
  { categoryId: '12253', productName: 'Doormat', configs: ['NORMAL', 'CUSTOM', 'PACK_CUSTOM'] },
  { categoryId: '12869', productName: 'Poster', configs: ['CUSTOM'] },
  { categoryId: '13018', productName: 'Wooden Block', configs: ['NORMAL'] },
  { categoryId: '17332', productName: 'Wrapping Paper', configs: ['NORMAL'] },
  { categoryId: '22120', productName: 'Car Visor Clip', configs: ['PACK', 'PACK_CUSTOM'] },
  { categoryId: '24376', productName: 'Phone Case', configs: ['CUSTOM'] },
  { categoryId: '24675', productName: 'Flag', configs: ['NORMAL', 'CUSTOM'] },
  { categoryId: '28924', productName: 'Graduation Stole', configs: ['CUSTOM'] },
  { categoryId: '29007', productName: 'Bikini', configs: ['CUSTOM'] },
  { categoryId: '30152', productName: 'Cap', configs: ['CUSTOM'] },
  { categoryId: '30471', productName: 'Hawaiian Shirt', configs: ['CUSTOM'] },
  { categoryId: '40381', productName: 'Booktracker', configs: ['CUSTOM'] },
  { categoryId: '12217', productName: 'Tapestry', configs: ['CUSTOM'] },
];

const SOURCE_COLORS: Record<string, string> = {
  etsy: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  tiktok: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  temu: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  amazon: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  aliexpress: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

interface Variant {
  option1: string;
  option2: string;
  price: number;
}

interface CrawlResult {
  url: string;
  status: 'success' | 'error' | 'pending';
  product?: CrawledProduct;
  error?: string;
}

const MAX_URLS = 20;

const DownloadIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const RefreshIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const TrashIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckCircleIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UrlCrawlPanel: React.FC = () => {
  // Category & settings
  const [temuCategoryId, setTemuCategoryId] = useState('10585');
  const [configType, setConfigType] = useState('CUSTOM');
  const [skuPrefix, setSkuPrefix] = useState('CG');

  // URLs input
  const [urlsText, setUrlsText] = useState('');

  // Crawl results
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);

  // Variants from template
  const [defaultVariants, setDefaultVariants] = useState<Variant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Loading states
  const [crawling, setCrawling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [retryingUrls, setRetryingUrls] = useState<Set<string>>(new Set());

  // Error/success messages
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedCategory = TEMU_CATEGORIES.find(c => c.categoryId === temuCategoryId);

  // Update configType when category changes
  useEffect(() => {
    if (selectedCategory && !selectedCategory.configs.includes(configType)) {
      setConfigType(selectedCategory.configs[0]);
    }
  }, [temuCategoryId, selectedCategory, configType]);

  // Load variants when category changes
  useEffect(() => {
    if (!temuCategoryId) return;
    setLoadingVariants(true);
    fetch(`/api/templates?categoryId=${temuCategoryId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const variants = data?.variants || [];
        const formatted: Variant[] = variants.map((v: any) => ({
          option1: v.option1 || '',
          option2: v.option2 || '',
          price: v.price || 100,
        }));
        setDefaultVariants(formatted);
      })
      .catch(() => setDefaultVariants([]))
      .finally(() => setLoadingVariants(false));
  }, [temuCategoryId]);

  const parseUrls = (): string[] => {
    return urlsText
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));
  };

  const handleCrawl = async () => {
    const urls = parseUrls();
    if (urls.length === 0) {
      setError('Please enter at least one valid URL (must start with http:// or https://)');
      return;
    }
    if (urls.length > MAX_URLS) {
      setError(`Maximum ${MAX_URLS} URLs allowed at once. You entered ${urls.length}.`);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setCrawling(true);

    // Initialize results as pending
    const initialResults: CrawlResult[] = urls.map(url => ({ url, status: 'pending' }));
    setCrawlResults(initialResults);

    try {
      const token = getToken();
      const response = await fetch('/api/export/crawl-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || 'Crawl failed');
      }

      const data = await response.json();
      const results: CrawlResult[] = (data.results || []).map((r: any) => ({
        url: r.url,
        status: r.success ? 'success' : 'error',
        product: r.product,
        error: r.error,
      }));

      setCrawlResults(results);
      const successCount = results.filter(r => r.status === 'success').length;
      setSuccessMessage(`Crawled ${successCount}/${results.length} URLs successfully`);
    } catch (e: any) {
      setError(e?.message || 'Crawl failed');
      setCrawlResults(prev => prev.map(r => ({ ...r, status: 'error' as const, error: 'Request failed' })));
    } finally {
      setCrawling(false);
    }
  };

  const handleRetry = async (url: string) => {
    setRetryingUrls(prev => new Set(prev).add(url));
    setError(null);

    try {
      const token = getToken();
      const response = await fetch('/api/export/crawl-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ urls: [url] }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || 'Crawl failed');
      }

      const data = await response.json();
      const result = data.results?.[0];
      if (result) {
        setCrawlResults(prev =>
          prev.map(r =>
            r.url === url
              ? {
                  url: r.url,
                  status: result.success ? 'success' : 'error',
                  product: result.product,
                  error: result.error,
                }
              : r
          )
        );
      }
    } catch (e: any) {
      setCrawlResults(prev =>
        prev.map(r =>
          r.url === url ? { ...r, status: 'error' as const, error: e?.message || 'Retry failed' } : r
        )
      );
    } finally {
      setRetryingUrls(prev => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
    }
  };

  const handleRemoveResult = (url: string) => {
    setCrawlResults(prev => prev.filter(r => r.url !== url));
  };

  const handleExport = async () => {
    const successResults = crawlResults.filter(r => r.status === 'success' && r.product);
    if (successResults.length === 0) {
      setError('No successfully crawled products to export');
      return;
    }

    setExporting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getToken();
      const products = successResults.map(r => r.product!);

      const response = await fetch('/api/export/xlsx-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          products,
          categoryId: temuCategoryId,
          configType,
          skuPrefix,
          variants: defaultVariants,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || err.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `temu-${selectedCategory?.productName || temuCategoryId}-batch-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMessage(`Exported ${successResults.length} products successfully`);
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const urlCount = parseUrls().length;
  const successCount = crawlResults.filter(r => r.status === 'success').length;
  const errorCount = crawlResults.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Settings Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Export Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temu Category
            </label>
            <select
              value={temuCategoryId}
              onChange={e => setTemuCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TEMU_CATEGORIES.map(cat => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  [{cat.categoryId}] {cat.productName}
                </option>
              ))}
            </select>
          </div>

          {/* SKU Prefix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SKU Prefix
            </label>
            <input
              type="text"
              value={skuPrefix}
              onChange={e => setSkuPrefix(e.target.value)}
              placeholder="CG"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Variants info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Variants
            </label>
            <div className="flex items-center h-9">
              {loadingVariants ? (
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
              ) : defaultVariants.length > 0 ? (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {defaultVariants.length} variants loaded
                </span>
              ) : (
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  No template variants
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Config Type Buttons */}
        {selectedCategory && selectedCategory.configs.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Template Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {selectedCategory.configs.map(type => (
                <button
                  key={type}
                  onClick={() => setConfigType(type)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    configType === type
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Variants Info Table */}
        {defaultVariants.length > 0 && (
          <div className="mt-4">
            <details className="group">
              <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline select-none">
                View {defaultVariants.length} template variants
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Option 1</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Option 2</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {defaultVariants.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{v.option1 || '-'}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{v.option2 || '-'}</td>
                        <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">${v.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* URL Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Product URLs</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            urlCount > MAX_URLS
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {urlCount}/{MAX_URLS}
          </span>
        </div>
        <textarea
          value={urlsText}
          onChange={e => setUrlsText(e.target.value)}
          placeholder={`Enter product URLs, one per line (max ${MAX_URLS})\nhttps://www.etsy.com/listing/...\nhttps://www.temu.com/...`}
          rows={6}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supported: Etsy, Temu, TikTok, Amazon, AliExpress
          </p>
          <button
            onClick={handleCrawl}
            disabled={crawling || urlCount === 0 || urlCount > MAX_URLS}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {crawling ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Crawling...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Crawl URLs
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl text-sm">
          {successMessage}
        </div>
      )}

      {/* Crawl Results */}
      {crawlResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Crawl Results</h3>
              <div className="flex items-center gap-2 text-xs">
                {successCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                    {successCount} success
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
                    {errorCount} failed
                  </span>
                )}
              </div>
            </div>
            {successCount > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <DownloadIcon />
                {exporting ? 'Exporting...' : `Export ${successCount} to XLSX`}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {crawlResults.map((result, index) => (
              <div
                key={result.url}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  result.status === 'success'
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                    : result.status === 'error'
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
                }`}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {result.status === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : result.status === 'error' ? (
                    <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {result.status === 'success' && result.product ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-md">
                          {result.product.title}
                        </span>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                          SOURCE_COLORS[result.product.source] || SOURCE_COLORS.unknown
                        }`}>
                          {result.product.source}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {result.url}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {result.product.images.length} images
                        {result.product.price && ` · ${result.product.price} ${result.product.currency || ''}`}
                      </p>
                    </>
                  ) : result.status === 'error' ? (
                    <>
                      <p className="text-sm text-red-700 dark:text-red-400 truncate">{result.url}</p>
                      {result.error && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{result.error}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.url}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex items-center gap-1">
                  {result.status === 'error' && (
                    <button
                      onClick={() => handleRetry(result.url)}
                      disabled={retryingUrls.has(result.url)}
                      title="Retry"
                      className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                    >
                      <RefreshIcon className={`h-4 w-4 ${retryingUrls.has(result.url) ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveResult(result.url)}
                    title="Remove"
                    className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Export button at bottom if many results */}
          {successCount > 3 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <DownloadIcon />
                {exporting ? 'Exporting...' : `Export ${successCount} products to XLSX`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UrlCrawlPanel;
