"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Database,
  Satellite,
  Compass,
  Code2,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  Droplets,
  Waves,
  MapPin,
  TrendingUp,
  BarChart3,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { RegionalComparisonBars } from "../../components/investigation/RegionalComparisonBars";
import { DecadalAnomalyBars } from "../../components/visualization/DecadalAnomalyBars";
import { GLOBAL_REGIONS } from "../../services/globalRegionsData";

export default function ResearchPage() {
  const [selectedVar, setSelectedVar] = useState<"soil_moisture" | "rainfall" | "temperature" | "ndvi">("soil_moisture");
  const [activeRegionId, setActiveRegionId] = useState<string>("global");

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Top Header */}
        <div className="bg-gradient-to-r from-[#0b1325] via-[#0e1b38] to-[#0b1325] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-blue-950/80 text-sky-300 border border-blue-500/30 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                NASA Space Apps Challenge 2026 Reference Hub
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                Peer-Reviewed Space Science
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              NASA &amp; International Space Agency Research Hub
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Synthesized methodologies, Earth observation data architectures, and non-parametric statistical testing frameworks across NASA, the Canadian Space Agency (CSA), the Royal Netherlands Meteorological Institute (KNMI), and NOAA.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/investigate"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
              >
                <span>Launch Investigation Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/visualize"
                className="px-4 py-2 rounded-xl bg-[#131b2e] hover:bg-[#1a253f] border border-slate-700 text-slate-200 text-xs font-medium transition-all"
              >
                <span>Explore Full Visualizations</span>
              </Link>
            </div>
          </div>
        </div>

        {/* SECTION 1: REGIONAL COMPARATIVE BARS IN RESEARCH */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                Multi-Region Planetary Comparison Bars
              </h2>
              <p className="text-xs text-slate-400">
                Compare environmental trend rates, climatological means, and statistical $Z$-scores across major Earth ecosystems
              </p>
            </div>

            {/* Variable switcher */}
            <div className="flex items-center bg-[#131b2e] p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: "soil_moisture", label: "Soil Moisture" },
                { id: "rainfall", label: "Rainfall" },
                { id: "temperature", label: "Temperature" },
                { id: "ndvi", label: "NDVI Index" },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVar(v.id as any)}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    selectedVar === v.id ? "bg-blue-600 text-white font-medium" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <RegionalComparisonBars
            variableId={selectedVar}
            variableName={selectedVar}
            variableUnit={selectedVar === "soil_moisture" ? "m³/m³" : selectedVar === "rainfall" ? "mm/day" : selectedVar === "temperature" ? "°C" : "NDVI"}
            activeRegionId={activeRegionId}
            onSelectRegion={(reg) => setActiveRegionId(reg.id)}
          />
        </div>

        {/* SECTION 2: 5-YEAR DECADAL EPOCH ANOMALY BARS */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Decadal Anomaly Distribution Bars (2000–2025)
            </h2>
            <p className="text-xs text-slate-400">
              5-year epoch progressions measuring shift from baseline to contemporary climate regimes
            </p>
          </div>

          <DecadalAnomalyBars
            variableName={selectedVar}
            units={selectedVar === "soil_moisture" ? "m³/m³" : selectedVar === "rainfall" ? "mm/day" : selectedVar === "temperature" ? "°C" : "NDVI"}
            baselineMean={0.34}
          />
        </div>

        {/* SECTION 3: NASA DATA & TOOLS GRID */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              NASA Core Data Systems &amp; Analytical Engines
            </h2>
            <p className="text-xs text-slate-400">
              Direct access tools for multi-variable time series generation and analysis-ready samples
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Giovanni */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-sky-400 font-semibold">NASA GES DISC</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono">
                    Analysis Engine
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">NASA Giovanni</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Versatile web-based analytical tool providing menus of thousands of Earth science variables. Allows interactive generation of multi-decadal time series, area averages, Hovmöller diagrams, and standardized downloads (NetCDF/CSV).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex justify-between items-center">
                <span>Coverage: Global Gridded</span>
                <span className="text-sky-400">Time-Series Generator</span>
              </div>
            </div>

            {/* Hydrology Time Series */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-sky-400 font-semibold">NASA LDAS / GLDAS</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono">
                    Hydrology API
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Hydrology Time Series</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Generates point and basin hydrological time-series from Noah, Catchment, and Mosaic land surface models. Tracks soil moisture layers (0–10cm, 10–40cm, 40–100cm), total water storage anomalies, and surface runoffs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex justify-between items-center">
                <span>Variables: Soil Moisture &amp; Flux</span>
                <span className="text-sky-400">1980–2025</span>
              </div>
            </div>

            {/* AppEEARS */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-sky-400 font-semibold">NASA LP DAAC</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono">
                    Data Subsetter
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">AppEEARS</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Application for Extracting and Exploring Analysis Ready Samples. Enables extraction and transformation of geospatial data from diverse federal data archives, delivering point samples and custom polygon time series.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex justify-between items-center">
                <span>Platforms: MODIS, VIIRS, ECOSTRESS</span>
                <span className="text-sky-400">Interactive Visuals</span>
              </div>
            </div>

            {/* NOAA CDO */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-sky-400 font-semibold">NOAA NCEI</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono">
                    Historical Stations
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">Climate Data Online (CDO)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Provides free access to the National Climatic Data Center's archive of global historical weather and climate station data, station histories, and geospatial mapping search interfaces for ground truth validation.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex justify-between items-center">
                <span>Stations: 100,000+ Worldwide</span>
                <span className="text-sky-400">Station History</span>
              </div>
            </div>

            {/* SeaWiFS Chlorophyll Article */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all md:col-span-2">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-semibold">Peer-Reviewed Case Study</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono">
                    Methodology Benchmark
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Demonstrates robust time-series construction and significance testing in river-influenced coastal ecosystems. Shows how seasonal cycles are decomposed using non-parametric harmonic regression and tested for multi-decadal shifts.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex justify-between items-center">
                <span>Methodology: Deseasonalized Mann-Kendall</span>
                <span className="text-emerald-400">Published Research</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: CSA & SWOT MISSION */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Satellite className="w-5 h-5 text-cyan-400" />
              Canadian Space Agency (CSA) &amp; International Partner Missions
            </h2>
            <p className="text-xs text-slate-400">
              Advanced radar constellations and hydrologic surface water elevation tracking
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* RCM */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-cyan-400" />
                  Radarsat Constellation Mission (RCM)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-mono">
                  CSA 3-Satellite SAR
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Canada's next-generation Earth observation constellation. A trio of C-band Synthetic Aperture Radar (SAR) satellites capable of imaging Earth day or night and in any weather conditions. RCM provides dedicated solutions across three core domains:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-[#070d1a] border border-slate-800">
                  <strong className="text-white block mb-0.5">Maritime</strong>
                  <span className="text-[11px] text-slate-400">Ice floe tracking, surface wind, and ship surveillance.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#070d1a] border border-slate-800">
                  <strong className="text-white block mb-0.5">Disasters</strong>
                  <span className="text-[11px] text-slate-400">Flood extent mitigation, warning, and disaster recovery.</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#070d1a] border border-slate-800">
                  <strong className="text-white block mb-0.5">Ecosystems</strong>
                  <span className="text-[11px] text-slate-400">Agriculture soil moisture, wetlands, and forestry.</span>
                </div>
              </div>
            </div>

            {/* SWOT Mission */}
            <div className="bg-[#0b101d] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Waves className="w-4 h-4 text-sky-400" />
                  SWOT Mission (Surface Water and Ocean Topography)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono">
                  NASA / CNES / CSA / UKSA
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Joint flagship satellite mission revolutionizing planetary hydrology. Equipped with the Ka-band Radar Interferometer (KaRIn), SWOT surveys 90% of Earth's surface water, measuring changes in water surface elevations for lakes, rivers, reservoirs, and oceans over multi-year cycles.
              </p>
              <div className="p-3 rounded-xl bg-[#070d1a] border border-slate-800 text-xs text-slate-300">
                <strong className="text-sky-400 block mb-1">Key Hydrological Breakthroughs:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                  <li>Detects water elevation changes down to tens of centimeters over 6 million lakes.</li>
                  <li>Tracks global river discharges for rivers wider than 100 meters globally.</li>
                  <li>Monitors coastal sea level anomalies and sub-mesoscale ocean kinetic eddies.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: STATISTICAL TEST METHODS & SAR PYTHON TUTORIAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Statistical Guide (6 cols) */}
          <div className="lg:col-span-6 bg-[#0b101d] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">
                Statistical Test Methods to Detect Trends in Time Series
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Standardized non-parametric testing frameworks based on the KNMI Climate Explorer and WMO guidelines:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#070d1a] border border-slate-800">
                <span className="font-semibold text-sky-300 block mb-1">1. Mann-Kendall S-Statistic</span>
                <p className="text-slate-400 text-[11px]">
                  {"S = ∑(k=1..n-1) ∑(j=k+1..n) sgn(x_j - x_k)"}
                  Evaluates monotonic directions of change without requiring normal distributions.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#070d1a] border border-slate-800">
                <span className="font-semibold text-sky-300 block mb-1">2. Sen’s Slope Estimator ($\beta$)</span>
                <p className="text-slate-400 text-[11px]">
                  {"β = median((x_j - x_k) / (j - k)), ∀ j > k"}
                  Robust against observational outliers, cloud dropouts, and episodic sensor gaps.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#070d1a] border border-slate-800">
                <span className="font-semibold text-sky-300 block mb-1">3. Hypothesis Testing ($p \le 0.05$)</span>
                <p className="text-slate-400 text-[11px]">
                  Rejects the null hypothesis of no trend ($H_0$) when the standardized normal test statistic $|Z| &gt; 1.96$ at the 95% confidence interval.
                </p>
              </div>
            </div>
          </div>

          {/* SAR Python Tutorial (6 cols) */}
          <div className="lg:col-span-6 bg-[#0b101d] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">SAR Python &amp; QGIS Workflow</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
                  Practical Steps
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Interactive script template demonstrating Synthetic Aperture Radar (SAR) backscatter calibration and surface water masking:
              </p>

              {/* Code */}
              <div className="bg-[#050811] p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
                <span className="text-slate-500"># Ingest calibrated RCM / Sentinel-1 SAR</span><br />
                <span className="text-purple-400">import</span> rasterio, numpy <span className="text-purple-400">as</span> np<br />
                src = rasterio.open(<span className="text-emerald-300">&quot;sar_rcm_vv.tif&quot;</span>)<br />
                linear_band = src.read(<span className="text-amber-400">1</span>)<br />
                <br />
                <span className="text-slate-500"># Convert backscatter to decibels ($\sigma^0$ dB)</span><br />
                sigma0_db = <span className="text-amber-400">10.0</span> * np.log10(np.clip(linear_band, <span className="text-amber-400">1e-5</span>, <span className="text-blue-400">None</span>))<br />
                <br />
                <span className="text-slate-500"># Apply specular reflectance threshold (Water &lt; -16 dB)</span><br />
                water_body_mask = sigma0_db &lt; <span className="text-amber-400">-16.0</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Tooling: GDAL, Rasterio, QGIS 3.34+</span>
              <span className="text-emerald-400 font-mono">C-Band / Ka-Band SAR</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
