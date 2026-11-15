"use client";

import React, { useState } from "react";
import { BarChart2, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";

interface EpochData {
  epoch: string;
  mean: number;
  anomaly: number;
  anomalyPercent: number;
  stdDev: number;
}

interface DecadalAnomalyBarsProps {
  variableName: string;
  units: string;
  baselineMean?: number;
  customEpochs?: EpochData[];
}

export const DecadalAnomalyBars: React.FC<DecadalAnomalyBarsProps> = ({
  variableName,
  units,
  baselineMean = 0.34,
  customEpochs,
}) => {
  const [viewMode, setViewMode] = useState<"anomaly" | "absolute">("anomaly");

  // Default decadal epochs (5-year aggregations across 2000–2025)
  const defaultEpochs: EpochData[] = [
    { epoch: "2000–2005", mean: 0.31, anomaly: -0.03, anomalyPercent: -8.8, stdDev: 0.05 },
    { epoch: "2005–2010", mean: 0.34, anomaly: 0.0, anomalyPercent: 0.0, stdDev: 0.05 },
    { epoch: "2010–2015", mean: 0.37, anomaly: 0.03, anomalyPercent: 8.8, stdDev: 0.06 },
    { epoch: "2015–2020", mean: 0.43, anomaly: 0.09, anomalyPercent: 26.5, stdDev: 0.06 },
    { epoch: "2020–2025", mean: 0.48, anomaly: 0.14, anomalyPercent: 41.2, stdDev: 0.06 },
  ];

  const epochs = customEpochs || defaultEpochs;

  const maxAbsAnomaly = Math.max(...epochs.map((e) => Math.abs(e.anomaly)), 0.15);
  const maxMean = Math.max(...epochs.map((e) => e.mean)) * 1.15;

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-space-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-nasa-cyan flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" />
              Decadal Epoch Anomaly Analysis
            </span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            5-Year Climatological Epoch Anomaly Bars
          </h3>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-space-950 p-1 rounded-xl border border-space-800 text-xs font-mono">
          <button
            onClick={() => setViewMode("anomaly")}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === "anomaly"
                ? "bg-nasa-blue text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Anomalies (Δ)
          </button>
          <button
            onClick={() => setViewMode("absolute")}
            className={`px-3 py-1 rounded transition-colors ${
              viewMode === "absolute"
                ? "bg-nasa-blue text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Epoch Absolute Means
          </button>
        </div>
      </div>

      {/* Epoch Bars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
        {epochs.map((item) => {
          const isPositive = item.anomaly >= 0;
          const heightPct =
            viewMode === "anomaly"
              ? Math.min(100, (Math.abs(item.anomaly) / maxAbsAnomaly) * 85)
              : Math.min(100, (item.mean / maxMean) * 100);

          return (
            <div
              key={item.epoch}
              className="bg-space-950/70 border border-space-800 rounded-xl p-3 flex flex-col justify-between hover:border-space-700 transition-all group"
            >
              {/* Epoch Label */}
              <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <Calendar className="w-3 h-3 text-nasa-cyan" />
                  {item.epoch}
                </span>
                {isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>

              {/* Bar Column Canvas */}
              <div className="h-32 w-full flex items-end justify-center py-2 relative">
                {/* Horizontal reference baseline for anomalies */}
                {viewMode === "anomaly" && (
                  <div className="absolute inset-x-0 bottom-4 border-b border-dashed border-gray-700/80 pointer-events-none" />
                )}

                {/* Vertical Bar */}
                <div
                  className={`w-12 rounded-t-lg transition-all duration-700 flex flex-col justify-start items-center p-1 relative shadow-lg ${
                    viewMode === "anomaly"
                      ? isPositive
                        ? "bg-gradient-to-t from-blue-700 via-sky-500 to-emerald-400 shadow-cyan-500/20"
                        : "bg-gradient-to-t from-rose-700 to-amber-500 shadow-rose-500/20"
                      : "bg-gradient-to-t from-blue-800 via-nasa-blue to-cyan-400 shadow-blue-500/20"
                  }`}
                  style={{ height: `${Math.max(14, heightPct)}%` }}
                >
                  <span className="text-[10px] font-mono font-bold text-white drop-shadow-md">
                    {viewMode === "anomaly"
                      ? `${item.anomaly >= 0 ? "+" : ""}${item.anomaly.toFixed(2)}`
                      : item.mean.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Footer Stat Breakdown */}
              <div className="border-t border-space-800/80 pt-2 text-xs font-mono flex flex-col gap-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">Epoch Mean:</span>
                  <span className="text-gray-200">
                    {item.mean.toFixed(2)} {units}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">Anomaly (%):</span>
                  <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                    {item.anomalyPercent >= 0 ? "+" : ""}
                    {item.anomalyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Baseline Context Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] font-mono text-gray-400 pt-2 border-t border-space-800/60">
        <span>
          Multi-Decadal Climatological Baseline:{" "}
          <strong className="text-white">
            {baselineMean.toFixed(2)} {units}
          </strong>{" "}
          (2000–2025 Mean)
        </span>
        <span className="text-nasa-cyan">Data Source: NASA GES DISC &amp; Giovanni LDAS Integration</span>
      </div>
    </div>
  );
};
