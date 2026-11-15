"use client";

import React, { useState } from "react";
import { GitCompare, ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { InvestigationResult, InvestigationComparison } from "../../types";
import { compareInvestigations } from "../../services/investigationApi";
import { GEOGRAPHICAL_TARGETS } from "../../services/catalogData";

interface ComparisonDrawerProps {
  primaryResult: InvestigationResult;
}

export const ComparisonDrawer: React.FC<ComparisonDrawerProps> = ({ primaryResult }) => {
  const [comparisonType, setComparisonType] = useState<"region" | "period">("region");
  const [secondaryRegionId, setSecondaryRegionId] = useState<string>("horn_of_africa");
  const [comparisonData, setComparisonData] = useState<InvestigationComparison | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  // Available regions excluding primary target
  const otherRegions = GEOGRAPHICAL_TARGETS.filter(
    (g) => g.id !== primaryResult.config.geographicalTarget.id
  );

  const handleRunComparison = async () => {
    setIsComparing(true);
    try {
      const comp = await compareInvestigations(primaryResult, comparisonType, secondaryRegionId);
      setComparisonData(comp);
    } catch (e) {
      console.error(e);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-space-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-nasa-cyan flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              Comparative Climatological Analysis
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Regional &amp; Decadal Divergence Engine
          </h3>
        </div>

        {/* Comparison Mode Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex bg-space-950 p-1 rounded-lg border border-space-800 text-xs font-mono">
            <button
              onClick={() => {
                setComparisonType("region");
                setComparisonData(null);
              }}
              className={`px-3 py-1.5 rounded transition-all ${
                comparisonType === "region" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Cross-Region Contrast
            </button>
            <button
              onClick={() => {
                setComparisonType("period");
                setComparisonData(null);
              }}
              className={`px-3 py-1.5 rounded transition-all ${
                comparisonType === "period" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Decadal Period Split
            </button>
          </div>
        </div>
      </div>

      {/* Selector and Run Button */}
      <div className="bg-space-950/70 p-4 rounded-xl border border-space-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {comparisonType === "region" ? (
            <>
              <span className="text-xs text-gray-400 font-mono whitespace-nowrap">Contrast Region:</span>
              <select
                value={secondaryRegionId}
                onChange={(e) => setSecondaryRegionId(e.target.value)}
                className="bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan font-mono"
              >
                {otherRegions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.country})
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="text-xs text-gray-300 font-mono">
              Comparing Phase 1 (2000–2012 Baseline) against Phase 2 (2013–2025 Contemporary)
            </div>
          )}
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isComparing}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-nasa-blue hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-nasa-cyan/40 transition-all shadow-md shadow-nasa-blue/20"
        >
          {isComparing ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <GitCompare className="w-3.5 h-3.5" />
          )}
          <span>Execute Comparative Contrast</span>
        </button>
      </div>

      {/* Comparison Results Card */}
      {comparisonData && (
        <div className="space-y-4">
          {/* Divergence Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              comparisonData.isDivergent
                ? "bg-rose-950/20 border-rose-500/50 text-rose-200"
                : "bg-nasa-blue/20 border-nasa-cyan/40 text-nasa-cyan"
            }`}
          >
            {comparisonData.isDivergent ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-nasa-cyan shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-mono font-bold uppercase mb-0.5">
                {comparisonData.isDivergent ? "BIPOLAR DIVERGENCE CONFIRMED" : "CONCORDANT CO-TRAJECTORY"}
              </div>
              <p className="text-xs leading-relaxed text-gray-300">
                {comparisonData.scientificSummary}
              </p>
            </div>
          </div>

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Region Card */}
            <div className="bg-space-950 p-4 rounded-xl border border-space-800 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">Primary Target</span>
                  <h4 className="text-sm font-bold text-white">
                    {primaryResult.config.geographicalTarget.name}
                  </h4>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                    primaryResult.trend.annual_rate >= 0
                      ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                      : "bg-rose-950 border border-rose-800 text-rose-400"
                  }`}
                >
                  {primaryResult.trend.annual_rate >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {primaryResult.trend.annual_rate >= 0 ? "Wetting/Increasing" : "Drying/Decreasing"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono pt-1">
                <div className="bg-space-900 p-2 rounded-lg border border-space-800">
                  <span className="text-[9px] text-gray-500 block">Annual Rate (β)</span>
                  <span className="text-sm font-bold text-white">
                    {primaryResult.trend.annual_rate > 0 ? "+" : ""}
                    {primaryResult.trend.annual_rate.toFixed(4)}
                  </span>
                </div>
                <div className="bg-space-900 p-2 rounded-lg border border-space-800">
                  <span className="text-[9px] text-gray-500 block">Mann-Kendall p</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {primaryResult.trend.p_value < 0.001 ? "< 0.001" : primaryResult.trend.p_value.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Secondary Comparison Card */}
            <div className="bg-space-950 p-4 rounded-xl border border-space-800 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">Comparative Target</span>
                  <h4 className="text-sm font-bold text-white">{comparisonData.secondaryTargetName}</h4>
                </div>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                    comparisonData.secondaryTrend.annualRate >= 0
                      ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                      : "bg-rose-950 border border-rose-800 text-rose-400"
                  }`}
                >
                  {comparisonData.secondaryTrend.annualRate >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {comparisonData.secondaryTrend.annualRate >= 0 ? "Increasing" : "Drying/Decreasing"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono pt-1">
                <div className="bg-space-900 p-2 rounded-lg border border-space-800">
                  <span className="text-[9px] text-gray-500 block">Annual Rate (β)</span>
                  <span className="text-sm font-bold text-white">
                    {comparisonData.secondaryTrend.annualRate > 0 ? "+" : ""}
                    {comparisonData.secondaryTrend.annualRate.toFixed(4)}
                  </span>
                </div>
                <div className="bg-space-900 p-2 rounded-lg border border-space-800">
                  <span className="text-[9px] text-gray-500 block">Mann-Kendall p</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {comparisonData.secondaryTrend.pValue < 0.001 ? "< 0.001" : comparisonData.secondaryTrend.pValue.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
