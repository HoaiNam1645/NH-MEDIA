import React, { useState, useEffect } from 'react';
import CrawlExportModal from '../components/CrawlExportModal';
import UrlCrawlPanel from '../components/UrlCrawlPanel';

export interface CrawledProduct {
  source: 'etsy' | 'tiktok' | 'temu' | 'amazon' | 'aliexpress' | 'unknown';
  title: string;
  images: string[];
  price?: string;
  currency?: string;
  url: string;
  description?: string;
  capturedAt: string;
}

const STORAGE_KEY = 'nh-media-crawl-export';

type ActiveTab = 'url' | 'extension';

export default function CrawlExport() {
  const [crawledData, setCrawledData] = useState<CrawledProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('url');

  useEffect(() => {
    // Try URL params first (from extension)
    const params = new URLSearchParams(window.location.search);
    const urlData = params.get('data');
    if (urlData) {
      try {
        const data = JSON.parse(decodeURIComponent(urlData));
        setCrawledData(data);
        setIsModalOpen(true);
        setActiveTab('extension');
        // Clean URL
        window.history.replaceState({}, '', '/crawl-export');
        return;
      } catch (e) {
        console.error('Failed to parse URL data:', e);
      }
    }

    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCrawledData(data);
        setIsModalOpen(true);
        setActiveTab('extension');
      } catch (e) {
        console.error('Failed to parse crawl data:', e);
      }
    }

    // Listen for postMessage from extension
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'CRAWL_EXPORT_DATA' && event.data.product) {
        setCrawledData(event.data.product);
        setIsModalOpen(true);
        setActiveTab('extension');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'url', label: 'From URL' },
    { id: 'extension', label: 'From Extension' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crawl &amp; Export</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Crawl product data from URLs or use the Chrome extension to capture and export to XLSX.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'url' && (
          <UrlCrawlPanel />
        )}

        {activeTab === 'extension' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            {crawledData ? (
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Product captured: <span className="text-blue-600 dark:text-blue-400">{crawledData.title}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{crawledData.url}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Open Export Modal
                </button>
              </div>
            ) : (
              <div className="text-center max-w-md mx-auto py-8">
                <div className="text-5xl mb-4">📦</div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Product Data
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Use the Chrome extension to capture a product from Etsy, TikTok, or Temu first.
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-left">
                  <p className="font-medium mb-2">How to use:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Visit a product page on Etsy / TikTok / Temu</li>
                    <li>Click the extension icon</li>
                    <li>Click &quot;Export to Temu CSV&quot;</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extension modal (existing) */}
      {crawledData && (
        <CrawlExportModal
          isOpen={isModalOpen}
          onClose={handleClose}
          crawledProduct={crawledData}
        />
      )}
    </div>
  );
}
