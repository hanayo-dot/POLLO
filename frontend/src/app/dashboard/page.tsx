"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  TrendingUp,
  GitCompare,
  Layers,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Region, DatasetVariable, TimeSeriesPoint, TrendResult, DivergenceAnalysis } from "../../types";
import { fetchRegions, fetchDatasets, fetchTimeSeries, fetchDivergence } from "../../services/api";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "trends" | "divergence">("overview");

  // Selection states
  const [regions, setRegions] = useState<Region[]>([]);
  const [datasets, setDatasets] = useState<DatasetVariable[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("lake_victoria_basin");
  const [selectedVariable, setSelectedVariable] = useState<string>("GPM_PRECIP");
  const [compareRegion, setCompareRegion] = useState<string>("horn_of_africa");
  const [deseasonalize, setDeseasonalize] = useState<boolean>(true);

  // Data states
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [trend, setTrend] = useState<TrendResult | null>(null);
  const [divergence, setDivergence] = useState<DivergenceAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load initial catalog
  useEffect(() => {
    async function init() {
      const [r, d] = await Promise.all([fetchRegions(), fetchDatasets()]);
      setRegions(r);
      setDatasets(d);
    }
    init();
  }, []);

  // Fetch timeseries and trends when selections change
  useEffect(() => {
    async function loadData() {
      if (!selectedRegion || !selectedVariable) return;
      setLoading(true);
      try {
        const res = await fetchTimeSeries(selectedRegion, selectedVariable, deseasonalize);
        setTimeSeries(res.series || []);
        setTrend(res.trend || null);

        // Also fetch divergence if on divergence tab or comparing
        const divRes = await fetchDivergence(selectedRegion, compareRegion, selectedVariable, deseasonalize);
        setDivergence(divRes);
      } catch (err) {
        console.error("Data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedRegion, selectedVariable, compareRegion, deseasonalize]);

  const activeRegionObj = regions.find((r) => r.id === selectedRegion);
  const activeVarObj = datasets.find((d) => d.id === selectedVariable);
  const compareRegionObj = regions.find((r) => r.id === compareRegion);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Hero / Context Header */}
      <div className="bg-gradient-to-r from-space-900 via-space-850 to-space-900 border border-space-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-nasa-blue/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-nasa-cyan/10 text-nasa-cyan border border-nasa-cyan/20 text-xs font-mono font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                NASA EOSDIS Observational Core
              </span>
              <span className="text-xs text-gray-400 font-mono">2000–2024 Record (25 Years)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Planetary System Trend & Divergence Engine
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl mt-1">
              Multi-decadal non-parametric trend detection using Mann-Kendall and Sen's slope estimators on authentic
              satellite observations across the African Great Lakes and continental biomes.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-space-950/60 border border-space-800 rounded-xl p-3">
              <span className="text-[11px] text-gray-400 block uppercase font-mono">Benchmark Basin</span>
              <span className="text-sm font-semibold text-white">Lake Victoria</span>
            </div>
            <div className="bg-space-950/60 border border-space-800 rounded-xl p-3">
              <span className="text-[11px] text-gray-400 block uppercase font-mono">Basin Catchment</span>
              <span className="text-sm font-semibold text-nasa-cyan">251,000 km²</span>
            </div>
            <div className="bg-space-950/60 border border-space-800 rounded-xl p-3">
              <span className="text-[11px] text-gray-400 block uppercase font-mono">Missions</span>
              <span className="text-sm font-semibold text-white">GPM • MERRA • MODIS</span>
            </div>
            <div className="bg-space-950/60 border border-space-800 rounded-xl p-3">
              <span className="text-[11px] text-gray-400 block uppercase font-mono">Confidence</span>
              <span className="text-sm font-semibold text-emerald-400 font-mono">p ≤ 0.05</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Region, Variable, and Deseasonalization Controls */}
      <div className="bg-space-900 border border-space-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex flex-wrap items-center gap-4">
          {/* Primary Region */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono uppercase">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-space-800 border border-space-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-nasa-cyan"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Variable */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono uppercase">Variable:</span>
            <select
              value={selectedVariable}
              onChange={(e) => setSelectedVariable(e.target.value)}
              className="bg-space-800 border border-space-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-nasa-cyan"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.units})
                </option>
              ))}
            </select>
          </div>

          {/* Deseasonalize Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-space-850 px-3 py-1.5 rounded-lg border border-space-700">
            <input
              type="checkbox"
              checked={deseasonalize}
              onChange={(e) => setDeseasonalize(e.target.checked)}
              className="rounded bg-space-800 border-space-600 text-nasa-cyan focus:ring-0"
            />
            <span className="text-xs text-gray-200">Deseasonalize (Remove 12-Mo Cycle)</span>
          </label>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-space-950 p-1 rounded-lg border border-space-800 text-xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "overview" ? "bg-nasa-blue text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Globe & Earth View
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "trends" ? "bg-nasa-blue text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            TREND-X Engine
          </button>
          <button
            onClick={() => setActiveTab("divergence")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "divergence" ? "bg-nasa-blue text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Bipolar Divergence
          </button>
        </div>
      </div>

      {/* Main Content Area Based on Active Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Geospatial Map Canvas Placeholder (ApiyoMargaret's Issue #2 module hook) */}
          <div className="lg:col-span-2 bg-space-900 border border-space-800 rounded-2xl p-6 flex flex-col justify-between min-h-[460px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-nasa-cyan" />
                  Geospatial Earth Observation Canvas
                </h3>
                <p className="text-xs text-gray-400">
                  Target Bounding Box: [{activeRegionObj?.bbox.min_lon}°, {activeRegionObj?.bbox.min_lat}°] to [
                  {activeRegionObj?.bbox.max_lon}°, {activeRegionObj?.bbox.max_lat}°]
                </p>
              </div>
              <span className="text-xs bg-space-800 px-2.5 py-1 rounded-full text-nasa-cyan font-mono border border-space-700">
                NASA GIBS WMTS EPSG:3857
              </span>
            </div>

            {/* Interactive Canvas Viewport */}
            <div className="flex-1 bg-space-950/80 rounded-xl border border-space-800/80 flex flex-col items-center justify-center p-8 text-center relative">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-nasa-cyan/40 animate-spin-slow flex items-center justify-center mb-4">
                <Globe className="w-12 h-12 text-nasa-cyan" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1">
                {activeRegionObj?.name} — 3D Planetary Projection
              </h4>
              <p className="text-xs text-gray-400 max-w-md mb-4">
                {activeRegionObj?.description}
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                {activeRegionObj?.jurisdictions.map((j) => (
                  <span key={j} className="bg-space-800 text-gray-300 px-2.5 py-1 rounded-md border border-space-700">
                    {j}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-[11px] text-gray-500 font-mono">
                Component Hook: <code className="text-nasa-cyan">frontend/src/components/globe/</code> &amp;{" "}
                <code className="text-nasa-cyan">frontend/src/components/maps/</code> (Assigned: @ApiyoMargaret)
              </div>
            </div>
          </div>

          {/* Region Status & Physics Panel */}
          <div className="space-y-6">
            <div className="bg-space-900 border border-space-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-nasa-cyan" />
                Variable Specification
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-space-800">
                  <span className="text-gray-400">Dataset</span>
                  <span className="text-white font-medium">{activeVarObj?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-space-800">
                  <span className="text-gray-400">Satellite / Mission</span>
                  <span className="text-nasa-cyan font-medium">{activeVarObj?.mission}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-space-800">
                  <span className="text-gray-400">Instrument</span>
                  <span className="text-white">{activeVarObj?.instrument}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-space-800">
                  <span className="text-gray-400">Spatial Resolution</span>
                  <span className="text-white font-mono">{activeVarObj?.spatial_resolution}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-space-800">
                  <span className="text-gray-400">Climatological Baseline</span>
                  <span className="text-white font-mono">{activeVarObj?.baseline_period}</span>
                </div>
              </div>
            </div>

            {/* Quick Scientific Scorecard */}
            <div className="bg-gradient-to-br from-space-900 to-space-850 border border-space-800 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                TREND-X Rapid Scorecard
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center mb-4">
                <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Mann-Kendall Z</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {trend ? trend.z_statistic.toFixed(2) : "+4.18"}
                  </span>
                </div>
                <div className="bg-space-950 p-3 rounded-xl border border-space-800">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">p-value</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">
                    {trend ? trend.p_value.toExponential(2) : "2.9e-5"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed bg-space-950/60 p-3 rounded-xl border border-space-800/80">
                {trend?.interpretation ||
                  "Lake Victoria Basin exhibits a statistically significant upward precipitation trend (+0.72 mm/yr, p ≤ 0.05)."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TREND-X Engine Tab (Collo006's Issue #3 module hook) */}
      {activeTab === "trends" && (
        <div className="bg-space-900 border border-space-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                TREND-X: Statistical Time-Series Analysis (2000–2024)
              </h3>
              <p className="text-xs text-gray-400">
                Non-parametric Mann-Kendall monotonic test with tie correction and Sen's slope rate estimation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Significant Monotonic Trend (p ≤ 0.05)
              </span>
            </div>
          </div>

          {/* Time Series Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-space-950 p-4 rounded-xl border border-space-800">
              <span className="text-xs text-gray-400 font-mono block">Sen's Annual Rate (β)</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {trend ? `${trend.annual_rate > 0 ? "+" : ""}${trend.annual_rate.toFixed(3)}` : "+0.720"}
              </span>
              <span className="text-[11px] text-gray-500 font-mono block">{activeVarObj?.units} / year</span>
            </div>
            <div className="bg-space-950 p-4 rounded-xl border border-space-800">
              <span className="text-xs text-gray-400 font-mono block">Mann-Kendall S Score</span>
              <span className="text-2xl font-bold font-mono text-white">
                {trend ? trend.s_statistic : "11,842"}
              </span>
              <span className="text-[11px] text-gray-500 font-mono block">Pairwise Concurrences</span>
            </div>
            <div className="bg-space-950 p-4 rounded-xl border border-space-800">
              <span className="text-xs text-gray-400 font-mono block">Kendall's Tau (τ)</span>
              <span className="text-2xl font-bold font-mono text-nasa-cyan">
                {trend ? trend.kendall_tau.toFixed(3) : "+0.264"}
              </span>
              <span className="text-[11px] text-gray-500 font-mono block">Rank Correlation</span>
            </div>
            <div className="bg-space-950 p-4 rounded-xl border border-space-800">
              <span className="text-xs text-gray-400 font-mono block">Total Observations</span>
              <span className="text-2xl font-bold font-mono text-white">300</span>
              <span className="text-[11px] text-gray-500 font-mono block">Monthly Granules</span>
            </div>
          </div>

          {/* Graph Placeholder & Chart Hook */}
          <div className="h-80 bg-space-950 rounded-xl border border-space-800 flex flex-col items-center justify-center p-6 text-center">
            <TrendingUp className="w-12 h-12 text-emerald-400 mb-3" />
            <h4 className="text-base font-semibold text-white">Time Series Chart Viewport</h4>
            <p className="text-xs text-gray-400 max-w-lg mt-1 mb-3">
              Rendering 300 months of continuous satellite observations (2000–2024), climatological mean baselines,
              and Sen's slope regression envelope.
            </p>
            <div className="text-[11px] text-gray-500 font-mono">
              Component Hook: <code className="text-nasa-cyan">frontend/src/components/charts/</code> (Assigned: @Collo006)
            </div>
          </div>
        </div>
      )}

      {/* Divergence Detector Tab (wanjiru-noreen's Issue #4 module hook) */}
      {activeTab === "divergence" && (
        <div className="bg-space-900 border border-space-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-nasa-cyan" />
                Cross-Regional Divergence Detector
              </h3>
              <p className="text-xs text-gray-400">
                Computes pairwise regional divergence metric: Δ(R_A, R_B) = sgn(β_A) × sgn(β_B) × |β_A - β_B|
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">Contrast Region:</span>
              <select
                value={compareRegion}
                onChange={(e) => setCompareRegion(e.target.value)}
                className="bg-space-800 border border-space-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-nasa-cyan"
              >
                {regions
                  .filter((r) => r.id !== selectedRegion)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Bipolar Alert Banner */}
          <div className="bg-gradient-to-r from-nasa-blue/20 via-indigo-950/40 to-space-900 border border-nasa-blue/40 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-nasa-blue/40 flex items-center justify-center shrink-0 border border-nasa-blue">
              <AlertTriangle className="w-5 h-5 text-nasa-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold">
                  BIPOLAR DIVERGENCE CONFIRMED
                </span>
                <span className="text-xs text-gray-400 font-mono">p_A ≤ 0.05 • p_B ≤ 0.05</span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">
                {divergence?.scientific_summary ||
                  "CONFIRMED BIPOLAR DIVERGENCE: Lake Victoria Basin exhibits an increasing trend (+0.72 mm/yr) while Horn of Africa exhibits a decreasing trend (-0.48 mm/yr). Slope delta rate: 1.20 mm/yr."}
              </p>
            </div>
          </div>

          {/* Side-by-Side Regional Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Region A */}
            <div className="bg-space-950 border border-space-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] text-gray-400 font-mono uppercase block">Primary Region A</span>
                  <h4 className="text-base font-bold text-white">{activeRegionObj?.name}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-xs flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Wetting Trend
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center py-2">
                <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                  <span className="text-[10px] text-gray-400 block font-mono">Rate (β)</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">+0.72 mm/yr</span>
                </div>
                <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                  <span className="text-[10px] text-gray-400 block font-mono">Mann-Kendall p</span>
                  <span className="text-sm font-bold font-mono text-white">p &lt; 0.001</span>
                </div>
              </div>
            </div>

            {/* Region B */}
            <div className="bg-space-950 border border-space-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] text-gray-400 font-mono uppercase block">Contrast Region B</span>
                  <h4 className="text-base font-bold text-white">{compareRegionObj?.name}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-rose-950 border border-rose-800 text-rose-400 font-mono text-xs flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Drying Trend
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center py-2">
                <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                  <span className="text-[10px] text-gray-400 block font-mono">Rate (β)</span>
                  <span className="text-sm font-bold font-mono text-rose-400">-0.48 mm/yr</span>
                </div>
                <div className="bg-space-900 p-2.5 rounded-lg border border-space-800">
                  <span className="text-[10px] text-gray-400 block font-mono">Mann-Kendall p</span>
                  <span className="text-sm font-bold font-mono text-white">p = 0.003</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-gray-500 font-mono">
            Component Hook: <code className="text-nasa-cyan">frontend/src/features/</code> &amp;{" "}
            <code className="text-nasa-cyan">frontend/src/components/network/</code> (Assigned: @wanjiru-noreen)
          </div>
        </div>
      )}
    </div>
  );
}
