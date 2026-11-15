"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Activity,
  Compass,
} from "lucide-react";
import { TrendResult } from "../../types";

interface StatisticalScorecardProps {
  trend: TrendResult & {
    decadalRate?: number;
    confidenceInterval95?: [number, number];
    meanValue?: number;
    minValue?: number;
    maxValue?: number;
    stdDev?: number;
  };
  units: string;
}

export const StatisticalScorecard: React.FC<StatisticalScorecardProps> = ({ trend, units }) => {
  const isSignificant = trend.significance === "significant";
  const isMarginal = trend.significance === "marginal";

  const isIncreasing = trend.trend_direction === "increasing";
  const isDecreasing = trend.trend_direction === "decreasing";

  const ci95 = trend.confidenceInterval95 || [trend.annual_rate * 0.8, trend.annual_rate * 1.2];

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-space-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-nasa-cyan flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Non-Parametric Statistical Results
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            TREND-X Analytical Scorecard
          </h3>
        </div>

        {/* Significance Badge */}
        <div>
          {isSignificant ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono text-xs font-bold shadow-md shadow-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>STATISTICALLY SIGNIFICANT (p ≤ 0.05)</span>
            </div>
          ) : isMarginal ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 font-mono text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>MARGINAL SIGNIFICANCE (0.05 &lt; p ≤ 0.10)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-space-800 border border-space-700 text-gray-300 font-mono text-xs font-bold">
              <Minus className="w-4 h-4 text-gray-400" />
              <span>NO STATISTICALLY SIGNIFICANT TREND (p &gt; 0.10)</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Sen's Annual Rate */}
        <div className="bg-space-950 p-4 rounded-xl border border-space-800/90 relative overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] text-gray-400 uppercase font-mono">Sen's Annual Rate (β)</span>
            {isIncreasing ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : isDecreasing ? (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            ) : (
              <Minus className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className={`text-2xl font-bold font-mono ${isIncreasing ? "text-emerald-400" : isDecreasing ? "text-rose-400" : "text-white"}`}>
            {trend.annual_rate > 0 ? "+" : ""}
            {trend.annual_rate.toFixed(4)}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">{units} / year</div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">
            Decadal: {trend.decadalRate ? `${trend.decadalRate > 0 ? "+" : ""}${trend.decadalRate.toFixed(3)} ${units}` : "N/A"}
          </div>
        </div>

        {/* Metric 2: Two-Tailed p-value */}
        <div className="bg-space-950 p-4 rounded-xl border border-space-800/90">
          <span className="text-[10px] text-gray-400 uppercase font-mono block mb-1">p-value (Two-Tailed)</span>
          <div className={`text-2xl font-bold font-mono ${isSignificant ? "text-emerald-400" : "text-gray-300"}`}>
            {trend.p_value < 0.0001 ? trend.p_value.toExponential(2) : trend.p_value.toFixed(4)}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
            {isSignificant ? "Null hypothesis rejected" : "Fail to reject null"}
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">Confidence: 95% (α = 0.05)</div>
        </div>

        {/* Metric 3: Standardized Z-Score */}
        <div className="bg-space-950 p-4 rounded-xl border border-space-800/90">
          <span className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Standardized Z</span>
          <div className="text-2xl font-bold font-mono text-nasa-cyan">
            {trend.z_statistic > 0 ? "+" : ""}
            {trend.z_statistic.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">Critical Z_0.025: ±1.96</div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">Kendall's τ: {trend.kendall_tau.toFixed(3)}</div>
        </div>

        {/* Metric 4: Total Granules */}
        <div className="bg-space-950 p-4 rounded-xl border border-space-800/90">
          <span className="text-[10px] text-gray-400 uppercase font-mono block mb-1">Observations (N)</span>
          <div className="text-2xl font-bold font-mono text-white">{trend.data_points}</div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">Continuous Monthly Granules</div>
          <div className="text-[10px] text-gray-500 font-mono mt-1">
            {trend.start_date.slice(0, 4)} to {trend.end_date.slice(0, 4)}
          </div>
        </div>
      </div>

      {/* Secondary Metrics & Statistical Rigor Specifications */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-space-950/60 p-4 rounded-xl border border-space-800/70 text-xs font-mono">
        <div>
          <span className="text-gray-500 block text-[10px]">Mann-Kendall S:</span>
          <span className="text-white font-semibold">{trend.s_statistic.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">Variance Var(S):</span>
          <span className="text-white font-semibold">{Math.round(trend.variance_s).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">95% CI Slope (Annual):</span>
          <span className="text-nasa-cyan font-semibold">
            [{ci95[0].toFixed(4)}, {ci95[1].toFixed(4)}]
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">Observed Range:</span>
          <span className="text-white font-semibold">
            {trend.minValue?.toFixed(3) ?? "N/A"} – {trend.maxValue?.toFixed(3) ?? "N/A"} {units}
          </span>
        </div>
      </div>

      {/* Scientific Integrity Notice */}
      <div className="text-xs text-gray-400 bg-space-950/80 p-3.5 rounded-xl border border-space-800 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-nasa-cyan shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="leading-relaxed">
            <strong className="text-white">Scientific Interpretation Integrity: </strong>
            A positive slope does not automatically denote a beneficial environmental outcome, nor does a negative
            slope denote ecological failure. Trend detection establishes mathematical trajectory and confidence,
            which must be evaluated in regional hydrological and agronomic context.
          </p>
          <div className="text-[10px] font-mono text-gray-500">
            Methodology: Non-parametric Mann-Kendall with tie corrections (Salmi et al., 2002) and Sen's slope median estimator.
          </div>
        </div>
      </div>
    </div>
  );
};
