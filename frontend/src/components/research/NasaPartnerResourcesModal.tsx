"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
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
} from "lucide-react";

interface NasaPartnerResourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "nasa" | "partners" | "csa" | "sar_tutorial" | "stats";

export const NasaPartnerResourcesModal: React.FC<NasaPartnerResourcesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("nasa");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#0b1222] border border-slate-700/80 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0e1628]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  NASA &amp; Space Agency Partner Research Hub
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  Official Scientific Data
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Earth observation tools, statistical testing methods, and international space agency resources
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#090e1a] border-b border-slate-800 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab("nasa")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "nasa"
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>NASA Data &amp; Tools</span>
          </button>

          <button
            onClick={() => setActiveTab("csa")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "csa"
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            <span>CSA &amp; SWOT Mission</span>
          </button>

          <button
            onClick={() => setActiveTab("partners")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "partners"
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>KNMI Climate Explorer &amp; NOAA</span>
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "stats"
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Statistical Significance Guide</span>
          </button>

          <button
            onClick={() => setActiveTab("sar_tutorial")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "sar_tutorial"
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>SAR Python &amp; QGIS Tutorial</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-300 text-xs leading-relaxed">
          {/* TAB 1: NASA DATA & TOOLS */}
          {activeTab === "nasa" && (
            <div className="space-y-4">
              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      NASA Giovanni (GES DISC)
                    </h3>
                    <p className="text-slate-300 mt-1">
                      A versatile Earth science data analysis and exploration system developed by the NASA Goddard Earth Sciences (GES) Data and Information Services Center (DISC). It provides interactive menus of hundreds of physical and biogeochemical variables, enabling point and bounding-box time series generation and direct scientific downloads (NetCDF, CSV, GeoTIFF).
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-blue-950/80 text-blue-300 font-mono text-[11px] border border-blue-500/30 whitespace-nowrap">
                    GES DISC Online
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                  <span className="bg-[#0b101d] px-2 py-0.5 rounded border border-slate-800">Variables: 2000+</span>
                  <span className="bg-[#0b101d] px-2 py-0.5 rounded border border-slate-800">Output: Monthly Time Series &amp; Hovmöller</span>
                  <span className="bg-[#0b101d] px-2 py-0.5 rounded border border-slate-800">Platforms: MODIS, AIRS, MERRA-2, GPM</span>
                </div>
              </div>

              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-sky-400" />
                      NASA Hydrology Time Series (LDAS / GLDAS / FLDAS)
                    </h3>
                    <p className="text-slate-300 mt-1">
                      Global Land Data Assimilation System (GLDAS) and Famine Early Warning Systems Network (FLDAS) Noah land physics integrations that merge satellite radiometer inputs with meteorological forcing to calculate multi-decadal soil moisture, runoff, and evapotranspiration time series.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-blue-950/80 text-blue-300 font-mono text-[11px] border border-blue-500/30 whitespace-nowrap">
                    Hydrological Engine
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                  <span className="bg-[#0b101d] px-2 py-0.5 rounded border border-slate-800">Layers: 0–10cm, 10–40cm, 40–100cm, 100–200cm</span>
                  <span className="bg-[#0b101d] px-2 py-0.5 rounded border border-slate-800">Temporal: 1980–2025 Continuous</span>
                </div>
              </div>

              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400" />
                      NASA AppEEARS (LP DAAC)
                    </h3>
                    <p className="text-slate-300 mt-1">
                      Application for Extracting and Exploring Analysis Ready Samples (AppEEARS). Offers an efficient and programmatic way to subset, transform, and download geospatial data from diverse federal data archives with built-in time-series visualization across MODIS, VIIRS, and ECOSTRESS collections.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-blue-950/80 text-blue-300 font-mono text-[11px] border border-blue-500/30 whitespace-nowrap">
                    LP DAAC Service
                  </span>
                </div>
              </div>

              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Waves className="w-4 h-4 text-emerald-400" />
                  SeaWiFS Chlorophyll Coastal Time-Series Case Study
                </h3>
                <p className="text-slate-300 mt-1">
                  <em>"Time-Series Analysis of Remotely-Sensed SeaWiFS Chlorophyll in River-Influenced Coastal Regions"</em> — Foundational methodology demonstrating non-parametric trend detection, seasonal cycle extraction, and Mann-Kendall significance testing in complex aquatic-terrestrial transition zones.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CSA & SWOT MISSION */}
          {activeTab === "csa" && (
            <div className="space-y-4">
              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Satellite className="w-4 h-4 text-cyan-400" />
                      CSA Radarsat Constellation Mission (RCM) - Data
                    </h3>
                    <p className="text-slate-300 mt-1">
                      Canada's flagship Earth observation satellite trio. Equipped with Synthetic Aperture Radar (SAR) capable of scanning the planet day and night under all meteorological and cloud conditions.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-cyan-950/80 text-cyan-300 font-mono text-[11px] border border-cyan-500/30 whitespace-nowrap">
                    Canadian Space Agency
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="bg-[#0b101d] p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-white block mb-1">Maritime Surveillance</span>
                    <span className="text-[11px] text-slate-400">Sea ice monitoring, surface wind fields, ship tracking, and oil spill delineation.</span>
                  </div>
                  <div className="bg-[#0b101d] p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-white block mb-1">Disaster Management</span>
                    <span className="text-[11px] text-slate-400">Flood extent mapping, critical infrastructure warning, and hurricane response.</span>
                  </div>
                  <div className="bg-[#0b101d] p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-white block mb-1">Ecosystem Monitoring</span>
                    <span className="text-[11px] text-slate-400">Agricultural soil roughness, wetland preservation, forestry biomass, and permafrost subsidence.</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Waves className="w-4 h-4 text-sky-400" />
                      SWOT Mission (Surface Water and Ocean Topography)
                    </h3>
                    <p className="text-slate-300 mt-1">
                      A revolutionary joint mission led by NASA and France's CNES, in partnership with the Canadian Space Agency (CSA) and the UK Space Agency. Equipped with the Ka-band Radar Interferometer (KaRIn), SWOT surveys 90% of Earth's surface water, measuring water surface elevations with sub-centimeter accuracy for millions of lakes, rivers, and coastal ocean eddies over time.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-blue-950/80 text-blue-300 font-mono text-[11px] border border-blue-500/30 whitespace-nowrap">
                    NASA / CNES / CSA / UKSA
                  </span>
                </div>
              </div>

              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Geo.ca &amp; Canadian Open Geospatial Information
                </h3>
                <p className="text-slate-300 mt-1">
                  Canada’s definitive open geospatial platform. Provides environmental baseline layers including hydrometric gauging stations, permafrost thaw indices, and national boreal forest carbon inventories.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: PARTNERS (KNMI & NOAA CDO) */}
          {activeTab === "partners" && (
            <div className="space-y-4">
              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Compass className="w-4 h-4 text-amber-400" />
                      KNMI Climate Explorer (Royal Netherlands Meteorological Institute)
                    </h3>
                    <p className="text-slate-300 mt-1">
                      A world-standard scientific analysis tool maintained by the Royal Netherlands Meteorological Institute (KNMI). Designed for researchers, students, and climate scientists to correlate time series with gridded spatial fields, compute Empirical Orthogonal Functions (EOFs), evaluate extreme value distributions, and verify multi-station climatologies.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-950/80 text-amber-300 font-mono text-[11px] border border-amber-500/30 whitespace-nowrap">
                    KNMI WMO Centre
                  </span>
                </div>
              </div>

              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-sky-400" />
                      NOAA Climate Data Online (CDO)
                    </h3>
                    <p className="text-slate-300 mt-1">
                      Free open access to the National Centers for Environmental Information (NCEI/NCDC) global archive of historical weather and climate station observations, land-based radar records, and mapping search tools for station metadata reconciliation.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-blue-950/80 text-blue-300 font-mono text-[11px] border border-blue-500/30 whitespace-nowrap">
                    NOAA NCEI
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STATISTICAL SIGNIFICANCE GUIDE */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Statistical Test Methods to Detect Trends in Time Series Data
                </h3>
                <p className="text-slate-300 mb-3">
                  Earth system data frequently exhibit non-normal distributions, strong seasonality, and missing values. Antigravity/POLLO implements non-parametric testing frameworks recommended by international climate bodies:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#0b101d] p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-sky-400 block mb-1">Mann-Kendall Trend Test ($S$)</span>
                    <p className="text-slate-400 text-[11px]">
                      Measures whether values systematically increase or decrease over time without assuming Gaussian normality. Calculates Kendall's Tau ($\tau$) and standard normal test statistic $Z$.
                    </p>
                  </div>
                  <div className="bg-[#0b101d] p-3 rounded-lg border border-slate-800">
                    <span className="font-semibold text-sky-400 block mb-1">Sen’s Median Slope ($\beta$)</span>
                    <p className="text-slate-400 text-[11px]">
                      Robust slope estimator: computes median of all pairwise pairwise slopes $(x_j - x_k) / (j - k)$. Resilient against outliers, sensor calibration shifts, and extreme anomalies.
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-[11px]">
                  <span className="font-bold text-emerald-400 block mb-1">Significance Decision Rules:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li><strong>p &lt; 0.001 (***):</strong> Extreme statistical significance (greater than 99.9% confidence).</li>
                    <li><strong>p &lt; 0.01 (**):</strong> Highly significant; null hypothesis $H_0$ rejected at 99% confidence.</li>
                    <li><strong>p &lt; 0.05 (*):</strong> Standard scientific threshold; trend is statistically significant ($|Z| &gt; 1.96$).</li>
                    <li><strong>p &ge; 0.05:</strong> Observed variation cannot be distinguished from random climatological noise.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SAR PYTHON & QGIS TUTORIAL */}
          {activeTab === "sar_tutorial" && (
            <div className="space-y-4">
              <div className="bg-[#10192d] border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-emerald-400" />
                      Synthetic Aperture Radar (SAR) Python &amp; QGIS Workflow
                    </h3>
                    <p className="text-slate-300 mt-1">
                      Practical implementation steps for ingesting, calibrating, and visualizing Synthetic Aperture Radar (SAR) Sentinel-1 / Radarsat Constellation imagery for soil moisture, surface water, and wetland mapping.
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-950/80 text-emerald-300 font-mono text-[11px] border border-emerald-500/30 whitespace-nowrap">
                    Python 3.10 / GDAL / SNAP
                  </span>
                </div>

                {/* Code Snippet */}
                <div className="mt-3 bg-[#060a12] p-3.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  <div className="text-slate-500 mb-1"># Step 1: Ingest &amp; Radiometric Calibration ($\sigma^0$ dB)</div>
                  <span className="text-purple-400">import</span> numpy <span className="text-purple-400">as</span> np<br />
                  <span className="text-purple-400">import</span> rasterio<br />
                  <br />
                  <span className="text-slate-500"># Read SAR VV Polarization band</span><br />
                  <span className="text-blue-400">with</span> rasterio.open(<span className="text-emerald-300">&quot;RCM_VV_calibrated.tif&quot;</span>) <span className="text-blue-400">as</span> src:<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;sar_linear = src.read(<span className="text-amber-400">1</span>)<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;nodata = src.nodata<br />
                  <br />
                  <span className="text-slate-500"># Convert linear intensity to Decibels (dB)</span><br />
                  sar_db = <span className="text-amber-400">10.0</span> * np.log10(np.where(sar_linear &gt; <span className="text-amber-400">0</span>, sar_linear, np.nan))<br />
                  <br />
                  <span className="text-slate-500"># Step 2: Flood &amp; Open Water Thresholding (Water &lt; -15 dB)</span><br />
                  water_mask = sar_db &lt; <span className="text-amber-400">-15.5</span><br />
                  print(<span className="text-emerald-300">{'f"Delineated surface water fraction: {np.nanmean(water_mask)*100:.2f}%"'}</span>)
                </div>

                <div className="mt-3 p-3 rounded-lg bg-[#0b101d] border border-slate-800 text-[11px] text-slate-400">
                  <strong className="text-white block mb-1">QGIS Visualization Workflow:</strong>
                  1. Load calibrated GeoTIFF into QGIS &gt; Layer Properties &gt; Symbology.<br />
                  2. Render type: <em>Singleband pseudocolor</em> with Min/Max clip (-25 dB to 0 dB).<br />
                  3. Color ramp: <em>Blues / Viridis</em> for water and wetland soil moisture saturation mapping.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0e1628]/90 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Powered by NASA EOSDIS, CSA, CNES, and KNMI Climate Explorer
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Research Hub
          </button>
        </div>
      </div>
    </div>
  );
};
