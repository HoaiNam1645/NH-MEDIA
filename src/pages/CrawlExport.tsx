import React, { useState, useEffect } from 'react';
import CrawlExportModal from '../components/CrawlExportModal';

export interface CrawledProduct {
  source: 'etsy' | 'tiktok' | 'temu';
  title: string;
  images: string[];
  price?: string;
  currency?: string;
  url: string;
  description?: string;
  capturedAt: string;
}

const STORAGE_KEY = 'nh-media-crawl-export';

export default function CrawlExport() {
  const [crawledData, setCrawledData] = useState<CrawledProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Try URL params first (from extension)
    const params = new URLSearchParams(window.location.search);
    const urlData = params.get('data');
    if (urlData) {
      try {
        const data = JSON.parse(decodeURIComponent(urlData));
        setCrawledData(data);
        setIsModalOpen(true);
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
      } catch (e) {
        console.error('Failed to parse crawl data:', e);
      }
    }

    // Listen for postMessage from extension
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'CRAWL_EXPORT_DATA' && event.data.product) {
        setCrawledData(event.data.product);
        setIsModalOpen(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleClose = () => {
    setIsModalOpen(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!crawledData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Product Data
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Use the Chrome extension to capture a product from Etsy, TikTok, or Temu first.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <p className="font-medium mb-2">How to use:</p>
            <ol className="text-left list-decimal list-inside space-y-1">
              <li>Visit a product page on Etsy/TikTok/Temu</li>
              <li>Click the extension icon</li>
              <li>Click "Export to Temu CSV"</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CrawlExportModal
        isOpen={isModalOpen}
        onClose={handleClose}
        crawledProduct={crawledData}
      />
      {!isModalOpen && (
        <div className="flex items-center justify-center min-h-screen">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Open Export Modal
          </button>
        </div>
      )}
    </div>
  );
}
