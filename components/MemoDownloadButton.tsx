'use client';

import React, { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { MemoPdfDocument } from './MemoPdfDocument';

interface MemoDownloadButtonProps {
  companyName: string;
  memo: any;
}

export default function MemoDownloadButton({ companyName, memo }: MemoDownloadButtonProps) {
  const [isClient, setIsClient] = useState(false);
  const [PDFDownloadLink, setPDFDownloadLink] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically load @react-pdf/renderer on the client side only
    import('@react-pdf/renderer').then((module) => {
      setPDFDownloadLink(() => module.PDFDownloadLink);
    }).catch((err) => {
      console.error('Failed to load @react-pdf/renderer dynamically', err);
    });
  }, []);

  if (!isClient || !PDFDownloadLink) {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all cursor-not-allowed opacity-60"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Preparing PDF...</span>
      </button>
    );
  }

  const sanitizeFilename = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const memoDate = memo.createdAt ? new Date(memo.createdAt) : new Date();
  const dateStr = memoDate.toISOString().split('T')[0];
  const filename = `scoutlayer-memo-${sanitizeFilename(companyName)}-${dateStr}.pdf`;

  const formattedDate = memoDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <PDFDownloadLink
      document={<MemoPdfDocument companyName={companyName} dateString={formattedDate} memo={memo} />}
      fileName={filename}
    >
      {({ blob, url, loading, error }: any) => {
        if (loading) {
          return (
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all cursor-not-allowed opacity-60"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Preparing PDF...</span>
            </button>
          );
        }
        return (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        );
      }}
    </PDFDownloadLink>
  );
}
