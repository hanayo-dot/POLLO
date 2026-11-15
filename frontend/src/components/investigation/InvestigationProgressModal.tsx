"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, AlertCircle, Database, TrendingUp } from "lucide-react";
import { InvestigationConfig } from "../../types";

interface InvestigationProgressModalProps {
  isOpen: boolean;
  config: InvestigationConfig;
  onComplete: () => void;
  error?: string | null;
}

export const InvestigationProgressModal: React.FC<InvestigationProgressModalProps> = ({
  isOpen,
  config,
  onComplete,
  error,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const steps = [
    { label: "Validating spatial bounding box and parameter constraints", time: 400 },
    { label: `Connecting to NASA EOSDIS repository (${config.datasetId})`, time: 600 },
    { label: `Extracting 0.25° observation granules across ${config.geographicalTarget.name}`, time: 800 },
    { label: "Computing non-parametric Mann-Kendall S statistic and tie variance", time: 600 },
    { label: "Deriving Sen's robust slope estimator (β) and 95% confidence envelope", time: 500 },
    { label: "Synthesizing plain-language scientific interpretation", time: 400 },
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < steps.length) {
        setCurrentStepIndex(current);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 400);
      }
    }, 550);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/85 backdrop-blur-md">
      <div className="bg-space-900 border border-space-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-nasa-blue/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nasa-blue/30 border border-nasa-cyan/40 flex items-center justify-center text-nasa-cyan animate-pulse">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              TREND-X Scientific Processing Engine
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              Target: {config.geographicalTarget.name} • {config.dateRange.startDate.slice(0, 4)}–{config.dateRange.endDate.slice(0, 4)}
            </p>
          </div>
        </div>

        {/* Progress Tracker Steps */}
        <div className="space-y-3 font-mono text-xs">
          {steps.map((step, idx) => {
            const isDone = currentStepIndex > idx;
            const isCurrent = currentStepIndex === idx;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                  isCurrent
                    ? "bg-nasa-blue/20 border-nasa-cyan/40 text-white"
                    : isDone
                    ? "bg-space-950/60 border-space-800/80 text-emerald-400"
                    : "bg-space-950/30 border-transparent text-gray-600"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-nasa-cyan animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-space-700 shrink-0" />
                )}
                <span className="text-[11px] leading-tight">{step.label}</span>
              </div>
            );
          })}
        </div>

        {error ? (
          <div className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-800/60 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Investigation failed: {error}</span>
          </div>
        ) : (
          <div className="text-center text-[11px] text-gray-500 font-mono">
            Powered by NASA GES DISC &amp; POLLO Non-Parametric Analytical Core
          </div>
        )}
      </div>
    </div>
  );
};
