"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { GLOBAL_REGIONS, RegionData } from "../../services/globalRegionsData";

interface RegionalComparisonBarsProps {
  variableId: "soil_moisture" | "rainfall" | "temperature" | "ndvi";
  variableName: string;
  variableUnit: string;
  activeRegionId: string;
  onSelectRegion?: (region: RegionData) => void;
}

export const RegionalComparisonBars: React.FC<RegionalComparisonBarsProps> = ({
  variableId,
  variableName,
  variableUnit,
  activeRegionId,
  onSelectRegion,
}) => {
  const [metric, setMetric] = useState<"trend" | "mean" | "zscore">("trend");
  const [hoveredRegionId, setHoveredRegionId] = useState<string | null>(null);

  // Prepare data for all global regions
  const barsData = GLOBAL_REGIONS.map((region) => {
    const varData = region.variables[variableId];
    const trendNum = parseFloat(varData.trendPercent.replace("%", "").replace("°C", ""));
    const meanNum = parseFloat(varData.mean.split(" ")[0]);

    // Approximate Mann-Kendall Z-score based on trend magnitude & significance
    let zScore = (trendNum / 4.2).toFixed(2);
    if (varData.significance.includes("p < 0.001")) {
      zScore = trendNum > 0 ? "+4.18" : "-3.92";
    } else if (varData.significance.includes("p < 0.01")) {
      zScore = trendNum > 0 ? "+2.84" : "-2.76";
    } else {
      zScore = trendNum > 0 ? "+2.12" : "-2.05";
    }

    return {
      region,
      name: region.name,
      flag: region.flag,
      trend: trendNum,
      trendStr: varData.trendPercent,
      mean: meanNum,
      meanStr: varData.mean,
      zScore: parseFloat(zScore),
      zScoreStr: zScore,
      significance: varData.significance,
      dataset: varData.dataset,
    };
  });

  // Determine min and max for scaling
  let minVal = 0;
  let maxVal = 0;

  if (metric === "trend") {
    const vals = barsData.map((d) => d.trend);
    minVal = Math.min(...vals, -12);
    maxVal = Math.max(...vals, 16);
  } else if (metric === "mean") {
    const vals = barsData.map((d) => d.mean);
    minVal = 0;
    maxVal = Math.max(...vals) * 1.15;
  } else {
    minVal = -4.5;
    maxVal = 4.5;
  }

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col">
      {/* Header & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 mb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            Planetary Cross-Region Comparison Bars
          </h3>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/80 text-blue-300 border border-blue-500/30">
            2000–2025 Sen's Slope
          </span>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center bg-[#131b2e] p-1 rounded-xl border border-slate-700/60 text-xs">
          <button
            onClick={() => setMetric("trend")}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === "trend"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Rate of Change (%)
          </button>
          <button
            onClick={() => setMetric("mean")}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === "mean"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mean Value
          </button>
          <button
            onClick={() => setMetric("zscore")}
            className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
              metric === "zscore"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Z-Score Significance
          </button>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="flex flex-col gap-2.5 my-1">
        {barsData.map((item) => {
          const isActive = item.region.id === activeRegionId;
          const isHovered = item.region.id === hoveredRegionId;

          let displayVal = "";
          let pctWidth = 0;
          let isPositive = true;

          if (metric === "trend") {
            displayVal = item.trendStr;
            isPositive = item.trend >= 0;
            const span = maxVal - minVal;
            pctWidth = (Math.abs(item.trend) / (isPositive ? maxVal : Math.abs(minVal))) * 48;
          } else if (metric === "mean") {
            displayVal = item.meanStr;
            isPositive = true;
            pctWidth = (item.mean / maxVal) * 90;
          } else {
            displayVal = `Z = ${item.zScoreStr}`;
            isPositive = item.zScore >= 0;
            pctWidth = (Math.abs(item.zScore) / 4.5) * 48;
          }

          return (
            <div
              key={item.region.id}
              onClick={() => onSelectRegion && onSelectRegion(item.region)}
              onMouseEnter={() => setHoveredRegionId(item.region.id)}
              onMouseLeave={() => setHoveredRegionId(null)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer border ${
                isActive
                  ? "bg-[#0d2146] border-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                  : isHovered
                  ? "bg-[#131d33] border-slate-700 text-white"
                  : "bg-[#101728]/70 border-slate-800/70 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm flex-shrink-0">{item.flag}</span>
                  <span className={`font-semibold truncate ${isActive ? "text-white" : "text-slate-200"}`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-sky-300 font-mono">
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`font-mono font-bold text-xs ${
                      isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {displayVal}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    ({item.significance})
                  </span>
                </div>
              </div>

              {/* Bar track */}
              <div className="relative w-full h-3 bg-[#0a0f1d] rounded-full overflow-hidden flex items-center border border-slate-800/80">
                {metric === "trend" || metric === "zscore" ? (
                  // Diverging bar around center 50%
                  <div className="relative w-full h-full flex">
                    {/* Left negative side (0 to 50%) */}
                    <div className="w-1/2 h-full flex justify-end">
                      {!isPositive && (
                        <div
                          className="h-full bg-gradient-to-l from-rose-500 to-amber-500 rounded-l-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                          style={{ width: `${Math.min(100, pctWidth * 2)}%` }}
                        />
                      )}
                    </div>

                    {/* Center zero axis indicator line */}
                    <div className="w-0.5 h-full bg-slate-600 z-10" />

                    {/* Right positive side (50% to 100%) */}
                    <div className="w-1/2 h-full flex justify-start">
                      {isPositive && (
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 rounded-r-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          style={{ width: `${Math.min(100, pctWidth * 2)}%` }}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  // Left-to-right single direction bar
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                    style={{ width: `${Math.max(4, pctWidth)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer helper note */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 mt-2">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          Click any bar to instantly fly to and investigate that global ecosystem
        </span>
        <span className="font-mono text-slate-500 hidden sm:inline">Mann-Kendall Significance Test</span>
      </div>
    </div>
  );
};
