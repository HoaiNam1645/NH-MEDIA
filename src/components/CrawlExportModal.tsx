// src/components/CrawlExportModal.tsx
import React, { useState, useEffect } from 'react';
import { getToken } from '../services/apiClient';
import { CrawledProduct } from '../pages/CrawlExport';

interface CrawlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  crawledProduct: CrawledProduct;
}

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

interface Variant {
  option1: string;
  option2: string;
  price: number;
}

const DownloadIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CheckIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  etsy: { label: 'Etsy', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  tiktok: { label: 'TikTok', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  temu: { label: 'Temu', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const CrawlExportModal: React.FC<CrawlExportModalProps> = ({
  isOpen,
  onClose,
  crawledProduct,
}) => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable title
  const [title, setTitle] = useState(crawledProduct.title);

  // Temu settings
  const [temuCategoryId, setTemuCategoryId] = useState('10585');
  const [configType, setConfigType] = useState('CUSTOM');
  const [skuPrefix, setSkuPrefix] = useState('CG');

  // Description
  const [description, setDescription] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Variants
  const [defaultVariants, setDefaultVariants] = useState<Variant[]>([]);
  const [customVariants, setCustomVariants] = useState<Variant[] | null>(null);
  const [variantsFileName, setVariantsFileName] = useState<string | null>(null);
  const [variantsText, setVariantsText] = useState('');

  const selectedTemuCategory = TEMU_CATEGORIES.find(c => c.categoryId === temuCategoryId);
  const sourceInfo = SOURCE_LABELS[crawledProduct.source] || { label: crawledProduct.source, color: 'bg-gray-100 text-gray-700' };

  // Update title when crawledProduct changes
  useEffect(() => {
    setTitle(crawledProduct.title);
  }, [crawledProduct.title]);

  // Update configType when temuCategory changes
  useEffect(() => {
    if (selectedTemuCategory && !selectedTemuCategory.configs.includes(configType)) {
      setConfigType(selectedTemuCategory.configs[0]);
    }
  }, [temuCategoryId, selectedTemuCategory, configType]);

  // Fetch template data when category changes
  useEffect(() => {
    if (!temuCategoryId) return;

    setLoadingTemplate(true);
    fetch(`/api/templates?categoryId=${temuCategoryId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const desc = data?.description || '';
        setDefaultDescription(desc);
        setDescription(desc);

        const variants = data?.variants || [];
        const formattedVariants: Variant[] = variants.map((v: any) => ({
          option1: v.option1 || '',
          option2: v.option2 || '',
          price: v.price || 100
        }));
        setDefaultVariants(formattedVariants);
        setCustomVariants(null);
        setVariantsFileName(null);
        setVariantsText('');
      })
      .catch(() => {
        setDefaultDescription('');
        setDescription('');
        setDefaultVariants([]);
      })
      .finally(() => setLoadingTemplate(false));
  }, [temuCategoryId]);

  const handleVariantsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const variants = Array.isArray(json) ? json : json.variants;

        if (!Array.isArray(variants) || variants.length === 0) {
          setError('JSON must contain variants array');
          return;
        }

        setCustomVariants(variants);
        setVariantsFileName(file.name);
        setError(null);
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const parseVariantsText = () => {
    const text = variantsText.trim();
    if (!text) {
      setError('Please enter variants');
      return;
    }

    try {
      // Check if JSON
      if (text.startsWith('[') || text.startsWith('{')) {
        const json = JSON.parse(text);
        const variants = Array.isArray(json) ? json : json.variants;
        if (Array.isArray(variants) && variants.length > 0) {
          setCustomVariants(variants);
          setVariantsFileName(`${variants.length} variants (JSON)`);
          setVariantsText('');
          setError(null);
          return;
        }
      }

      // Parse as "Color x Size x Price"
      const lines = text.split('\n').filter(l => l.trim());
      const parsedVariants: Variant[] = lines.map(line => {
        const parts = line.split(/[x*|]/i).map(p => p.trim());
        let color = '', size = '', price = 100;

        if (parts.length >= 3) {
          color = parts[0];
          size = parts[1];
          price = parseFloat(parts[2].replace(/[^0-9.]/g, '')) || 100;
        } else if (parts.length === 2) {
          size = parts[0];
          price = parseFloat(parts[1].replace(/[^0-9.]/g, '')) || 100;
        } else {
          size = parts[0];
        }

        return { option1: color, option2: size, price };
      });

      if (parsedVariants.length === 0) {
        setError('Cannot parse variants');
        return;
      }

      setCustomVariants(parsedVariants);
      setVariantsFileName(`${parsedVariants.length} variants`);
      setVariantsText('');
      setError(null);
    } catch {
      setError('Error parsing variants');
    }
  };

  const handleExport = async () => {
    const variants = customVariants || defaultVariants;
    if (variants.length === 0) {
      setError('Please add variants before exporting');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const token = getToken();
      const response = await fetch('/api/export/temu-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          crawledProduct: {
            ...crawledProduct,
            title, // Use edited title
          },
          temuCategoryId,
          configType,
          skuPrefix,
          customVariants: variants,
          customDescription: description,
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
      a.download = `temu-${selectedTemuCategory?.productName || temuCategoryId}-crawl-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Export to Temu</h2>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${sourceInfo.color}`}>
              {sourceInfo.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
            {crawledProduct.url}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Product Preview */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Title (editable)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-3"
            />

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Images ({crawledProduct.images.length})
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {crawledProduct.images.slice(0, 10).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Product ${i + 1}`}
                  className="w-16 h-16 object-cover rounded border border-gray-200 dark:border-gray-600 flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/api/proxy-image?url=' + encodeURIComponent(img);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Temu Category & SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Temu Category
              </label>
              <select
                value={temuCategoryId}
                onChange={(e) => setTemuCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {TEMU_CATEGORIES.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    [{cat.categoryId}] {cat.productName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU Prefix
              </label>
              <input
                type="text"
                value={skuPrefix}
                onChange={(e) => setSkuPrefix(e.target.value)}
                placeholder="CG"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Config Type */}
          {selectedTemuCategory && selectedTemuCategory.configs.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Type
              </label>
              <div className="flex gap-2 flex-wrap">
                {selectedTemuCategory.configs.map((type) => (
                  <button
                    key={type}
                    onClick={() => setConfigType(type)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
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

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              {description !== defaultDescription && defaultDescription && (
                <button
                  onClick={() => setDescription(defaultDescription)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Variants
              </label>
              {customVariants && (
                <button
                  onClick={() => { setCustomVariants(null); setVariantsFileName(null); }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {loadingTemplate ? (
              <div className="text-sm text-gray-500 py-2">Loading...</div>
            ) : customVariants ? (
              <div className="space-y-2">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {variantsFileName} ({customVariants.length} variants)
                    </span>
                  </div>
                </div>
                {/* Show variant details */}
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Option 1</th>
                        <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300 font-medium">Option 2</th>
                        <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {customVariants.map((v, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{v.option1 || '-'}</td>
                          <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{v.option2 || '-'}</td>
                          <td className="px-3 py-1.5 text-right text-gray-700 dark:text-gray-300">${v.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : defaultVariants.length > 0 ? (
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Using default: {defaultVariants.length} variants
                    </span>
                  </div>
                </div>
                {/* Show variant details */}
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
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
              </div>
            ) : null}

            {!customVariants && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={variantsText}
                  onChange={(e) => setVariantsText(e.target.value)}
                  placeholder="Color x Size x Price (one per line)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={parseVariantsText}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Apply
                  </button>
                  <label className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                    Upload JSON
                    <input type="file" accept=".json" onChange={handleVariantsUpload} className="sr-only" />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <DownloadIcon />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrawlExportModal;
