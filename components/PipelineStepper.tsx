'use client';

import React from 'react';

export type StageStatus = 'done' | 'active' | 'pending';

export interface PipelineStepperProps {
  /** Index of the current active stage (0-3). Stages before this are "done", after are "pending". */
  currentStage?: number;
  /** Override per-stage status if needed */
  stages?: { label: string; status: StageStatus }[];
}

const DEFAULT_LABELS = ['Sourcing', 'Screening', 'Diligence', 'Decision'];

export default function PipelineStepper({
  currentStage = 0,
  stages,
}: PipelineStepperProps) {
  const resolvedStages = stages ?? DEFAULT_LABELS.map((label, i) => ({
    label,
    status: (i < currentStage ? 'done' : i === currentStage ? 'active' : 'pending') as StageStatus,
  }));

  return (
    <div className="flex items-center w-full">
      {resolvedStages.map((stage, i) => (
        <React.Fragment key={stage.label}>
          {/* Step circle + label */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div
              className={`
                w-9 h-9 rounded-full flex items-center justify-center font-data text-sm font-semibold
                transition-colors duration-200
                ${stage.status === 'done'
                  ? 'bg-trust text-bg'
                  : stage.status === 'active'
                    ? 'bg-action text-white'
                    : 'bg-surface text-text-muted border border-border'
                }
              `}
            >
              {stage.status === 'done' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`
                text-xs font-medium font-data tracking-wide
                ${stage.status === 'done'
                  ? 'text-trust'
                  : stage.status === 'active'
                    ? 'text-action'
                    : 'text-text-muted'
                }
              `}
            >
              {stage.label}
            </span>
          </div>

          {/* Connector line */}
          {i < resolvedStages.length - 1 && (
            <div className="flex-1 mx-2 mb-6">
              <div
                className={`
                  h-0.5 w-full transition-colors duration-200
                  ${i < currentStage ? 'bg-trust' : 'bg-border'}
                `}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
