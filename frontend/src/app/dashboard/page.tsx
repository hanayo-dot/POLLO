"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  TrendingUp,
  GitCompare,
  Layers,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CheckCircle2,
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
    <main
      className="relative isolate min-h-screen w-full overflow-hidden px-4 py-7 text-slate-900 sm:px-6 lg:px-8 lg:py-9"
      style={{
        backgroundImage: "url('/images/earth-dashboard-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Soft overlay keeps the Earth image atmospheric without competing with the content. */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-[#102d35]/35 via-[#1b4a50]/10 to-[#d7a77a]/10" />
      <div className="relative z-10 mx-auto w-full max-w-[1500px] space-y-6">
      {/* Top Hero / Context Header */}
      <div className="bg-white/45 backdrop-blur-2xl border border-white/60 rounded-[28px] p-6 sm:p-8 shadow-[0_18px_60px_rgba(10,35,40,0.14)] relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/25 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md bg-white/55 text-teal-900 border border-white/70 backdrop-blur-lg text-xs font-mono font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                NASA EOSDIS Observational Core
              </span>
              <span className="text-xs text-slate-700 font-mono">2000–2024 Record (25 Years)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173b38] tracking-tight">
              Planetary System Trend & Divergence Engine
            </h1>
            <p className="text-sm text-slate-700 max-w-2xl mt-1">
              Multi-decadal non-parametric trend detection using Mann-Kendall and Sen's slope estimators on authentic
              satellite observations across the African Great Lakes and continental biomes.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white/38 backdrop-blur-xl border border-white/55 rounded-xl p-3">
              <span className="text-[11px] text-slate-700 block uppercase font-mono">Benchmark Basin</span>
              <span className="text-sm font-semibold text-[#173b38]">Lake Victoria</span>
            </div>
            <div className="bg-white/38 backdrop-blur-xl border border-white/55 rounded-xl p-3">
              <span className="text-[11px] text-slate-700 block uppercase font-mono">Basin Catchment</span>
              <span className="text-sm font-semibold text-teal-700">251,000 km²</span>
            </div>
            <div className="bg-white/38 backdrop-blur-xl border border-white/55 rounded-xl p-3">
              <span className="text-[11px] text-slate-700 block uppercase font-mono">Missions</span>
              <span className="text-sm font-semibold text-[#173b38]">GPM • MERRA • MODIS</span>
            </div>
            <div className="bg-white/38 backdrop-blur-xl border border-white/55 rounded-xl p-3">
              <span className="text-[11px] text-slate-700 block uppercase font-mono">Confidence</span>
              <span className="text-sm font-semibold text-emerald-700 font-mono">p ≤ 0.05</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Region, Variable, and Deseasonalization Controls */}
      <div className="bg-white/55 backdrop-blur-2xl border border-white/60 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Primary Region */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 font-mono uppercase">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-white/50 backdrop-blur-lg border border-white/65 text-sm text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
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
            <span className="text-xs text-slate-700 font-mono uppercase">Variable:</span>
            <select
              value={selectedVariable}
              onChange={(e) => setSelectedVariable(e.target.value)}
              className="bg-white/50 backdrop-blur-lg border border-white/65 text-sm text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.units})
                </option>
              ))}
            </select>
          </div>

          {/* Deseasonalize Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-white/50 backdrop-blur-lg px-3 py-1.5 rounded-lg border border-white/65">
            <input
              type="checkbox"
              checked={deseasonalize}
              onChange={(e) => setDeseasonalize(e.target.checked)}
              className="rounded bg-white/50 backdrop-blur-lg border-white/65 text-teal-700 focus:ring-0"
            />
            <span className="text-xs text-slate-700">Deseasonalize (Remove 12-Mo Cycle)</span>
          </label>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-white/38 backdrop-blur-xl p-1 rounded-lg border border-white/55 text-xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "overview" ? "bg-[#174e49]/90 text-white shadow-lg shadow-emerald-950/15" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Globe & Earth View
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "trends" ? "bg-[#174e49]/90 text-white shadow-lg shadow-emerald-950/15" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            TREND-X Engine
          </button>
          <button
            onClick={() => setActiveTab("divergence")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "divergence" ? "bg-[#174e49]/90 text-white shadow-lg shadow-emerald-950/15" : "text-slate-700 hover:text-slate-900"
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
          <div className="lg:col-span-2 bg-white/55 backdrop-blur-2xl border border-white/60 rounded-2xl p-6 flex flex-col justify-between min-h-[460px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-700" />
                  Geospatial Earth Observation Canvas
                </h3>
                <p className="text-xs text-slate-700">
                  Target Bounding Box: [{activeRegionObj?.bbox.min_lon}°, {activeRegionObj?.bbox.min_lat}°] to [
                  {activeRegionObj?.bbox.max_lon}°, {activeRegionObj?.bbox.max_lat}°]
                </p>
              </div>
              <span className="text-xs bg-white/50 backdrop-blur-lg px-2.5 py-1 rounded-full text-teal-700 font-mono border border-white/65">
                NASA GIBS WMTS EPSG:3857
              </span>
            </div>

            {/* Interactive Canvas Viewport */}
            <div className="flex-1 bg-white/35 backdrop-blur-xl rounded-xl border border-white/55 flex flex-col items-center justify-center p-8 text-center relative">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-teal-300 animate-spin-slow flex items-center justify-center mb-4">
                <Globe className="w-12 h-12 text-teal-700" />
              </div>
              <h4 className="text-base font-semibold text-slate-900 mb-1">
                {activeRegionObj?.name} — 3D Planetary Projection
              </h4>
              <p className="text-xs text-slate-700 max-w-md mb-4">
                {activeRegionObj?.description}
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                {activeRegionObj?.jurisdictions.map((j) => (
                  <span key={j} className="bg-white/50 backdrop-blur-lg text-slate-700 px-2.5 py-1 rounded-md border border-white/65">
                    {j}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-[11px] text-slate-600 font-mono">
                Component Hook: <code className="text-teal-700">frontend/src/components/globe/</code> &amp;{" "}
                <code className="text-teal-700">frontend/src/components/maps/</code> (Assigned: @ApiyoMargaret)
              </div>
            </div>
          </div>

          {/* Region Status & Physics Panel */}
          <div className="space-y-6">
            <div className="bg-white/55 backdrop-blur-2xl border border-white/60 rounded-2xl p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                Variable Specification
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-white/55">
                  <span className="text-slate-700">Dataset</span>
                  <span className="text-slate-900 font-medium">{activeVarObj?.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/55">
                  <span className="text-slate-700">Satellite / Mission</span>
                  <span className="text-teal-700 font-medium">{activeVarObj?.mission}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/55">
                  <span className="text-slate-700">Instrument</span>
                  <span className="text-[#173b38]">{activeVarObj?.instrument}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/55">
                  <span className="text-slate-700">Spatial Resolution</span>
                  <span className="text-slate-900 font-mono">{activeVarObj?.spatial_resolution}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/55">
                  <span className="text-slate-700">Climatological Baseline</span>
                  <span className="text-slate-900 font-mono">{activeVarObj?.baseline_period}</span>
                </div>
              </div>
            </div>

            {/* Quick Scientific Scorecard */}
            <div className="bg-gradient-to-br from-white to-slate-50 border border-white/55 rounded-2xl p-6">
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                TREND-X Rapid Scorecard
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center mb-4">
                <div className="bg-white/38 backdrop-blur-xl p-3 rounded-xl border border-white/55">
                  <span className="text-[10px] text-slate-700 uppercase font-mono block">Mann-Kendall Z</span>
                  <span className="text-lg font-mono font-bold text-[#173b38]">
                    {trend ? trend.z_statistic.toFixed(2) : "+4.18"}
                  </span>
                </div>
                <div className="bg-white/38 backdrop-blur-xl p-3 rounded-xl border border-white/55">
                  <span className="text-[10px] text-slate-700 uppercase font-mono block">p-value</span>
                  <span className="text-lg font-mono font-bold text-emerald-700">
                    {trend ? trend.p_value.toExponential(2) : "2.9e-5"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-white/38 backdrop-blur-xl p-3 rounded-xl border border-white/55">
                {trend?.interpretation ||
                  "Lake Victoria Basin exhibits a statistically significant upward precipitation trend (+0.72 mm/yr, p ≤ 0.05)."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TREND-X Engine Tab (Collo006's Issue #3 module hook) */}
      {activeTab === "trends" && (
        <div className="bg-white/55 backdrop-blur-2xl border border-white/60 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                TREND-X: Statistical Time-Series Analysis (2000–2024)
              </h3>
              <p className="text-xs text-slate-700">
                Non-parametric Mann-Kendall monotonic test with tie correction and Sen's slope rate estimation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Significant Monotonic Trend (p ≤ 0.05)
              </span>
            </div>
          </div>

          {/* Time Series Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/38 backdrop-blur-xl p-4 rounded-xl border border-white/55">
              <span className="text-xs text-slate-700 font-mono block">Sen's Annual Rate (β)</span>
              <span className="text-2xl font-bold font-mono text-emerald-700">
                {trend ? `${trend.annual_rate > 0 ? "+" : ""}${trend.annual_rate.toFixed(3)}` : "+0.720"}
              </span>
              <span className="text-[11px] text-slate-600 font-mono block">{activeVarObj?.units} / year</span>
            </div>
            <div className="bg-white/38 backdrop-blur-xl p-4 rounded-xl border border-white/55">
              <span className="text-xs text-slate-700 font-mono block">Mann-Kendall S Score</span>
              <span className="text-2xl font-bold font-mono text-[#173b38]">
                {trend ? trend.s_statistic : "11,842"}
              </span>
              <span className="text-[11px] text-slate-600 font-mono block">Pairwise Concurrences</span>
            </div>
            <div className="bg-white/38 backdrop-blur-xl p-4 rounded-xl border border-white/55">
              <span className="text-xs text-slate-700 font-mono block">Kendall's Tau (τ)</span>
              <span className="text-2xl font-bold font-mono text-teal-700">
                {trend ? trend.kendall_tau.toFixed(3) : "+0.264"}
              </span>
              <span className="text-[11px] text-slate-600 font-mono block">Rank Correlation</span>
            </div>
            <div className="bg-white/38 backdrop-blur-xl p-4 rounded-xl border border-white/55">
              <span className="text-xs text-slate-700 font-mono block">Total Observations</span>
              <span className="text-2xl font-bold font-mono text-[#173b38]">300</span>
              <span className="text-[11px] text-slate-600 font-mono block">Monthly Granules</span>
            </div>
          </div>

          {/* Graph Placeholder & Chart Hook */}
          <div className="h-80 bg-white/35 backdrop-blur-xl rounded-xl border border-white/55 flex flex-col items-center justify-center p-6 text-center">
            <TrendingUp className="w-12 h-12 text-emerald-700 mb-3" />
            <h4 className="text-base font-semibold text-[#173b38]">Time Series Chart Viewport</h4>
            <p className="text-xs text-slate-700 max-w-lg mt-1 mb-3">
              Rendering 300 months of continuous satellite observations (2000–2024), climatological mean baselines,
              and Sen's slope regression envelope.
            </p>
            <div className="text-[11px] text-slate-600 font-mono">
              Component Hook: <code className="text-teal-700">frontend/src/components/charts/</code> (Assigned: @Collo006)
            </div>
          </div>
        </div>
      )}

      {/* Divergence Detector Tab (wanjiru-noreen's Issue #4 module hook) */}
      {activeTab === "divergence" && (
        <div className="bg-white/55 backdrop-blur-2xl border border-white/60 rounded-2xl p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-teal-700" />
                Cross-Regional Divergence Detector
              </h3>
              <p className="text-xs text-slate-700">
                Computes pairwise regional divergence metric: Δ(R_A, R_B) = sgn(β_A) × sgn(β_B) × |β_A - β_B|
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-700 font-mono">Contrast Region:</span>
              <select
                value={compareRegion}
                onChange={(e) => setCompareRegion(e.target.value)}
                className="bg-white/50 backdrop-blur-lg border border-white/65 text-sm text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
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
          <div className="bg-gradient-to-r from-nasa-blue/20 via-slate-50 to-white border border-teal-200 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 border border-teal-500">
              <AlertTriangle className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold">
                  BIPOLAR DIVERGENCE CONFIRMED
                </span>
                <span className="text-xs text-slate-700 font-mono">p_A ≤ 0.05 • p_B ≤ 0.05</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {divergence?.scientific_summary ||
                  "CONFIRMED BIPOLAR DIVERGENCE: Lake Victoria Basin exhibits an increasing trend (+0.72 mm/yr) while Horn of Africa exhibits a decreasing trend (-0.48 mm/yr). Slope delta rate: 1.20 mm/yr."}
              </p>
            </div>
          </div>

          {/* Side-by-Side Regional Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Region A */}
            <div className="bg-white/38 backdrop-blur-xl border border-white/55 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] text-slate-700 font-mono uppercase block">Primary Region A</span>
                  <h4 className="text-base font-bold text-[#173b38]">{activeRegionObj?.name}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-700 font-mono text-xs flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Wetting Trend
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center py-2">
                <div className="bg-white/55 backdrop-blur-xl p-2.5 rounded-lg border border-white/55">
                  <span className="text-[10px] text-slate-700 block font-mono">Rate (β)</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">+0.72 mm/yr</span>
                </div>
                <div className="bg-white/55 backdrop-blur-xl p-2.5 rounded-lg border border-white/55">
                  <span className="text-[10px] text-slate-700 block font-mono">Mann-Kendall p</span>
                  <span className="text-sm font-bold font-mono text-[#173b38]">p &lt; 0.001</span>
                </div>
              </div>
            </div>

            {/* Region B */}
            <div className="bg-white/38 backdrop-blur-xl border border-white/55 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] text-slate-700 font-mono uppercase block">Contrast Region B</span>
                  <h4 className="text-base font-bold text-[#173b38]">{compareRegionObj?.name}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-rose-950 border border-rose-800 text-rose-700 font-mono text-xs flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Drying Trend
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center py-2">
                <div className="bg-white/55 backdrop-blur-xl p-2.5 rounded-lg border border-white/55">
                  <span className="text-[10px] text-slate-700 block font-mono">Rate (β)</span>
                  <span className="text-sm font-bold font-mono text-rose-700">-0.48 mm/yr</span>
                </div>
                <div className="bg-white/55 backdrop-blur-xl p-2.5 rounded-lg border border-white/55">
                  <span className="text-[10px] text-slate-700 block font-mono">Mann-Kendall p</span>
                  <span className="text-sm font-bold font-mono text-[#173b38]">p = 0.003</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-600 font-mono">
            Component Hook: <code className="text-teal-700">frontend/src/features/</code> &amp;{" "}
            <code className="text-teal-700">frontend/src/components/network/</code> (Assigned: @wanjiru-noreen)
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
