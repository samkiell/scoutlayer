'use client';

import React from 'react';

export interface EvidenceReceiptProps {
  claim: string;
  source: string;
  confidence: number;
  verifiedBy?: 'tavily' | 'unverified';
  timestamp?: string;
}

export default function EvidenceReceipt({
  claim,
  source,
  confidence,
  verifiedBy = 'unverified',
  timestamp,
}: EvidenceReceiptProps) {
  const isVerified = confidence >= 70;

  return (
    <div className="w-full max-w-md">
      {/* Perforated top edge */}
      <div className="receipt-edge-top" />

      {/* Receipt body */}
      <div className="bg-surface px-5 py-4 font-data text-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <span className="text-text-muted text-xs tracking-widest uppercase">
            Evidence Receipt
          </span>
          {timestamp && (
            <span className="text-text-muted text-xs">{timestamp}</span>
          )}
        </div>

        {/* Claim */}
        <div className="mb-3">
          <span className="text-text-muted text-xs block mb-1">CLAIM</span>
          <p className="text-text leading-relaxed">{claim}</p>
        </div>

        {/* Divider — dashed */}
        <div className="border-t border-dashed border-border my-3" />

        {/* Source */}
        <div className="mb-3">
          <span className="text-text-muted text-xs block mb-1">SOURCE</span>
          <p className="text-action text-xs break-all">{source}</p>
        </div>

        {/* Divider — dashed */}
        <div className="border-t border-dashed border-border my-3" />

        {/* Confidence + Verification */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-text-muted text-xs block mb-1">CONFIDENCE</span>
            <span
              className={`text-2xl font-semibold ${
                isVerified ? 'text-trust' : 'text-flag'
              }`}
            >
              {confidence}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-text-muted text-xs block mb-1">VERIFIED BY</span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                verifiedBy === 'tavily'
                  ? 'bg-trust/10 text-trust'
                  : 'bg-flag/10 text-flag'
              }`}
            >
              {verifiedBy === 'tavily' ? 'Tavily' : 'Unverified'}
            </span>
          </div>
        </div>
      </div>

      {/* Perforated bottom edge */}
      <div className="receipt-edge-bottom" />
    </div>
  );
}
