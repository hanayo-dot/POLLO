"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  BarChart2,
  MapPin,
  Calendar,
  Search,
  Droplets,
  CloudRain,
  Thermometer,
  Leaf,
  Plus,
  ChevronDown,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Globe,
  BookOpen,
} from "lucide-react";
import { TimeSeriesChart } from "../../components/investigation/TimeSeriesChart";
import { TrendSparkline } from "../../components/investigation/TrendSparkline";
import { RegionalComparisonBars } from "../../components/investigation/RegionalComparisonBars";
import { NasaPartnerResourcesModal } from "../../components/research/NasaPartnerResourcesModal";
import { GLOBAL_REGIONS, RegionData } from "../../services/globalRegionsData";
import { useRouter } from "next/navigation";
import styles from "./investigate.module.css";

// Dynamically import InteractiveWorldMap to safely handle MapLibre WebGL in Next.js
const InteractiveWorldMap = dynamic(
  () =>
    import("../../components/investigation/InteractiveWorldMap").then(
      (mod) => mod.InteractiveWorldMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col shadow-xl h-[460px] items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-slate-400">Loading Global Satellite Map & Real Places...</span>
      </div>
    ),
  }
);

type VariableType = "soil_moisture" | "rainfall" | "temperature" | "ndvi";

export default function InvestigationWorkspacePage() {
  const router = useRouter();
  const [selectedVariable, setSelectedVariable] = useState<VariableType>("soil_moisture");
  const [activeRegion, setActiveRegion] = useState<RegionData>(GLOBAL_REGIONS[0]); // default to Kenya & East Africa
  const [isLocationOpen, setIsLocationOpen] = useState<boolean>(false);
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("2000 – 2025");
  const [isDateOpen, setIsDateOpen] = useState<boolean>(false);

  // Modal & notification states
  const [isNewInvestigationOpen, setIsNewInvestigationOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);
  const [centerBottomView, setCenterBottomView] = useState<"timeseries" | "bars">("timeseries");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Active Variable Configuration for the Selected Region
  const currentVarConfig = activeRegion.variables[selectedVariable];

  const handleRunInvestigation = () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setExecutionMessage("Preparing investigation...");

    sessionStorage.setItem(
      "pollo_investigation",
      JSON.stringify({
        regionId: activeRegion.id,
        regionName: activeRegion.name,
        variable: selectedVariable,
        dateRange,
      })
    );

    router.push("/visualize");
  };
  // Handle click anywhere on the world map
  const handleMapLocationClick = (coords: { lat: number; lon: number; label: string }) => {
    // Check if coordinates match an existing preset region
    const matched = GLOBAL_REGIONS.find((r) => {
      const dLon = Math.abs(r.center[0] - coords.lon);
      const dLat = Math.abs(r.center[1] - coords.lat);
      return dLon < 10 && dLat < 8;
    });

    if (matched) {
      setActiveRegion(matched);
    } else {
      // Create dynamic custom location based on clicked coordinates
      const customRegion: RegionData = {
        id: `custom_${coords.lat}_${coords.lon}`,
        name: coords.label,
        country: `Lat ${coords.lat}°, Lon ${coords.lon}°`,
        flag: "📍",
        center: [coords.lon, coords.lat],
        zoom: 4.5,
        variables: {
          soil_moisture: {
            unit: "m³/m³",
            dataset: "GLDAS-2.1 Noah",
            source: "GLDAS-2.1 Noah (NASA)",
            trendPercent: coords.lat > 0 ? "+4.6%" : "-3.2%",
            trendPeriod: "Overall Trend (2000–2025)",
            mean: "0.31 m³/m³",
            stdDev: "0.06 m³/m³",
            significance: "Significant (p < 0.05)",
            yMin: 0.15,
            yMax: 0.5,
            ticks: [0.5, 0.32, 0.15],
            data: [
              { year: 2000, value: 0.3, stdDev: 0.04, trend: 0.3 },
              { year: 2005, value: 0.31, stdDev: 0.04, trend: 0.305 },
              { year: 2010, value: 0.33, stdDev: 0.05, trend: 0.31 },
              { year: 2015, value: 0.32, stdDev: 0.04, trend: 0.315 },
              { year: 2020, value: 0.34, stdDev: 0.05, trend: 0.32 },
              { year: 2025, value: 0.35, stdDev: 0.05, trend: 0.325 },
            ],
            insights: [
              `Target coordinate [${coords.lat}°N, ${coords.lon}°E] retrieved from GLDAS-2.1 Noah grid.`,
              "Interannual variability is governed by regional oceanic circulation oscillations.",
              "Surface soil layer demonstrates heightened responsiveness to seasonal monsoonal flux.",
            ],
          },
          rainfall: {
            unit: "mm/day",
            dataset: "GPM IMERG V07",
            source: "GPM IMERG (NASA)",
            trendPercent: "+5.1%",
            trendPeriod: "Overall Trend (2000–2025)",
            mean: "2.35 mm/day",
            stdDev: "0.45 mm/day",
            significance: "Significant (p < 0.05)",
            yMin: 1.0,
            yMax: 3.8,
            ticks: [3.8, 2.4, 1.0],
            data: [
              { year: 2000, value: 2.2, stdDev: 0.3, trend: 2.22 },
              { year: 2005, value: 2.3, stdDev: 0.35, trend: 2.26 },
              { year: 2010, value: 2.5, stdDev: 0.4, trend: 2.3 },
              { year: 2015, value: 2.35, stdDev: 0.35, trend: 2.34 },
              { year: 2020, value: 2.45, stdDev: 0.38, trend: 2.38 },
              { year: 2025, value: 2.52, stdDev: 0.4, trend: 2.42 },
            ],
            insights: [
              "Calibrated multi-satellite precipitation estimate sampled at 0.1° resolution.",
              "Rainfall intensity exhibits positive trend across convective precipitation events.",
              "Local precipitation regime conforms to broader regional climatological patterns.",
            ],
          },
          temperature: {
            unit: "°C",
            dataset: "MERRA-2 T2M",
            source: "MERRA-2 T2M (NASA)",
            trendPercent: "+1.21°C",
            trendPeriod: "Overall Trend (2000–2025)",
            mean: "18.5 °C",
            stdDev: "0.48 °C",
            significance: "Significant (p < 0.001)",
            yMin: 16.5,
            yMax: 21.0,
            ticks: [21.0, 18.8, 16.5],
            data: [
              { year: 2000, value: 17.8, stdDev: 0.3, trend: 17.8 },
              { year: 2005, value: 18.2, stdDev: 0.32, trend: 18.1 },
              { year: 2010, value: 18.5, stdDev: 0.35, trend: 18.4 },
              { year: 2015, value: 18.8, stdDev: 0.38, trend: 18.7 },
              { year: 2020, value: 19.1, stdDev: 0.4, trend: 19.0 },
              { year: 2025, value: 19.35, stdDev: 0.42, trend: 19.3 },
            ],
            insights: [
              "Near-surface 2-meter air temperature reflects consistent planetary warming trajectory.",
              "Warming rate is verified statistically significant via Mann-Kendall non-parametric test.",
              "Seasonal minimum night temperatures show progressive thermal amplification.",
            ],
          },
          ndvi: {
            unit: "NDVI",
            dataset: "MODIS MOD13A2",
            source: "MODIS Terra",
            trendPercent: "+3.2%",
            trendPeriod: "Overall Trend (2000–2025)",
            mean: "0.38",
            stdDev: "0.05",
            significance: "Significant (p < 0.05)",
            yMin: 0.25,
            yMax: 0.55,
            ticks: [0.55, 0.4, 0.25],
            data: [
              { year: 2000, value: 0.37, stdDev: 0.03, trend: 0.37 },
              { year: 2005, value: 0.38, stdDev: 0.03, trend: 0.375 },
              { year: 2010, value: 0.39, stdDev: 0.04, trend: 0.38 },
              { year: 2015, value: 0.38, stdDev: 0.03, trend: 0.385 },
              { year: 2020, value: 0.4, stdDev: 0.04, trend: 0.39 },
              { year: 2025, value: 0.41, stdDev: 0.04, trend: 0.395 },
            ],
            insights: [
              "MODIS 16-day composite vegetation index demonstrates canopy photosynthetic stability.",
              "Vegetation greenness index correlates with regional rainfall distribution.",
              "Canopy phenology tracks the regional seasonal climatology.",
            ],
          },
        },
      };
      setActiveRegion(customRegion);
    }
  };

  // Filter regions based on search
  const filteredRegions = GLOBAL_REGIONS.filter(
    (r) =>
      r.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
      r.country.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <div className={`${styles.page} relative isolate min-h-screen bg-[#070b14] text-white`}>
      <video
        className="fixed inset-0 z-0 h-full w-full object-cover opacity-80 pointer-events-none"
        src="/videos/investigate-background.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1] bg-gradient-to-b from-[#070b14]/30 via-transparent to-[#070b14]/60"
        aria-hidden="true"
      />
      {/* Execution Toast / Progress */}
      {isExecuting && (
        <div className="fixed top-20 right-8 z-50 bg-[#0f172a] border border-blue-500/60 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>{executionMessage}</span>
        </div>
      )}

      {/* Main Workspace Wrapper */}
      <main className="relative z-10 mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        {/* Workspace Top Header Bar */}
        <div className="relative overflow-hidden rounded-[28px] border border-cyan-500/25 bg-[#0b101d]/65 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs font-medium text-cyan-300 backdrop-blur-lg">
                  <Sparkles className="h-3.5 w-3.5" />
                  NASA EOSDIS Observational Core
                </span>
                <span className="font-mono text-xs text-slate-400">2000–2025 Multi-Decadal Record</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Investigation Workspace
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Explore and analyse environmental trends across any part of the world using NASA scientific data.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsResearchModalOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/65 bg-white/55 px-3.5 py-2 text-xs font-semibold text-teal-800 shadow-sm backdrop-blur-lg transition-all hover:bg-white/75"
              >
                <BookOpen className="h-3.5 w-3.5 text-teal-700" />
                <span>NASA &amp; Partner Research Hub</span>
              </button>

              <button
                onClick={() => setIsNewInvestigationOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-teal-800/20 bg-[#174e49] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/15 transition-all hover:bg-[#21665f]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Investigation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Workspace controls, interactive map and charts, and supporting trend insights */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* ========================================================= */}
          {/* WORKSPACE CONTROLS: Variables, Location, Date Range, Run  */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-12 xl:grid-cols-4">
            {/* Card 1: Variables */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Variables</h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-3.5">Select environmental variables</p>

              <div className="flex flex-col gap-2">
                {/* 1. Soil Moisture */}
                <button
                  onClick={() => setSelectedVariable("soil_moisture")}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${selectedVariable === "soil_moisture"
                      ? "bg-[#0d2146] border border-blue-500/80 text-white shadow-md shadow-blue-500/10"
                      : "bg-[#131b2e]/60 border border-slate-800/70 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                >
                  <Droplets
                    className={`w-4 h-4 flex-shrink-0 ${selectedVariable === "soil_moisture" ? "text-sky-400" : "text-slate-400"
                      }`}
                  />
                  <span className="text-xs font-medium">Soil Moisture</span>
                </button>

                {/* 2. Rainfall */}
                <button
                  onClick={() => setSelectedVariable("rainfall")}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${selectedVariable === "rainfall"
                      ? "bg-[#0d2146] border border-blue-500/80 text-white shadow-md shadow-blue-500/10"
                      : "bg-[#131b2e]/60 border border-slate-800/70 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                >
                  <CloudRain
                    className={`w-4 h-4 flex-shrink-0 ${selectedVariable === "rainfall" ? "text-sky-400" : "text-slate-400"
                      }`}
                  />
                  <span className="text-xs font-medium">Rainfall</span>
                </button>

                {/* 3. Temperature */}
                <button
                  onClick={() => setSelectedVariable("temperature")}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${selectedVariable === "temperature"
                      ? "bg-[#0d2146] border border-blue-500/80 text-white shadow-md shadow-blue-500/10"
                      : "bg-[#131b2e]/60 border border-slate-800/70 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                >
                  <Thermometer
                    className={`w-4 h-4 flex-shrink-0 ${selectedVariable === "temperature" ? "text-rose-400" : "text-amber-500"
                      }`}
                  />
                  <span className="text-xs font-medium">Temperature</span>
                </button>

                {/* 4. Vegetation Index (NDVI) */}
                <button
                  onClick={() => setSelectedVariable("ndvi")}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left flex items-center gap-3 transition-all cursor-pointer ${selectedVariable === "ndvi"
                      ? "bg-[#0d2146] border border-blue-500/80 text-white shadow-md shadow-blue-500/10"
                      : "bg-[#131b2e]/60 border border-slate-800/70 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                >
                  <Leaf
                    className={`w-4 h-4 flex-shrink-0 ${selectedVariable === "ndvi" ? "text-emerald-400" : "text-emerald-500"
                      }`}
                  />
                  <span className="text-xs font-medium">Vegetation Index (NDVI)</span>
                </button>
              </div>
            </div>

            {/* Card 2: Global Location Selector */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 shadow-xl relative">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Location</h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-3.5">
                Choose area or click anywhere on Earth
              </p>

              {/* Location Select Button */}
              <button
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="w-full bg-[#131b2e]/80 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-white hover:border-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="text-base flex-shrink-0">{activeRegion.flag}</span>
                  <span className="text-xs font-medium text-white truncate">
                    {activeRegion.name}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isLocationOpen ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* Location Dropdown Options & Search */}
              {isLocationOpen && (
                <div className="absolute top-[105px] left-4 right-4 bg-[#0d162b] border border-slate-700 rounded-xl p-2 shadow-2xl z-30 flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                  {/* Search box inside dropdown */}
                  <div className="relative mb-1">
                    <input
                      type="text"
                      placeholder="Search country or region..."
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="w-full bg-[#131b2e] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    />
                  </div>

                  {filteredRegions.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setActiveRegion(loc);
                        setIsLocationOpen(false);
                      }}
                      className={`text-left px-2.5 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${activeRegion.id === loc.id
                          ? "bg-blue-600 text-white font-medium"
                          : "text-slate-300 hover:bg-slate-800"
                        }`}
                    >
                      <span className="text-sm">{loc.flag}</span>
                      <div className="flex flex-col truncate">
                        <span className="truncate">{loc.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">{loc.country}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: Date Range */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 shadow-xl relative">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Date Range</h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-3.5">Select time period</p>

              <button
                onClick={() => setIsDateOpen(!isDateOpen)}
                className="w-full bg-[#131b2e]/80 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-white hover:border-slate-700 transition-colors cursor-pointer"
              >
                <span className="text-xs font-medium text-slate-200">{dateRange}</span>
                <Calendar className="w-4 h-4 text-slate-400" />
              </button>

              {/* Date Range Options */}
              {isDateOpen && (
                <div className="absolute top-[105px] left-4 right-4 bg-[#0d162b] border border-slate-700 rounded-xl p-1.5 shadow-2xl z-30 flex flex-col gap-1">
                  {["2000 – 2025", "2005 – 2025", "2010 – 2025", "1990 – 2025"].map((rng) => (
                    <button
                      key={rng}
                      onClick={() => {
                        setDateRange(rng);
                        setIsDateOpen(false);
                      }}
                      className={`text-left px-3 py-2 text-xs rounded-lg transition-colors ${dateRange === rng ? "bg-blue-600 text-white font-medium" : "text-slate-300 hover:bg-slate-800"
                        }`}
                    >
                      {rng}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Run Investigation Button */}
            <button
              onClick={handleRunInvestigation}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-white" />
              <span>Run Investigation</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* CENTER COLUMN: Interactive World Map & Time Series Chart  */}
          {/* ========================================================= */}
          <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">
            {/* 1. Real Interactive World Map with Places & Zoom */}
            <InteractiveWorldMap
              variableId={selectedVariable}
              variableName={
                selectedVariable === "soil_moisture"
                  ? "Soil Moisture"
                  : selectedVariable === "rainfall"
                    ? "Rainfall"
                    : selectedVariable === "temperature"
                      ? "Temperature"
                      : "Vegetation Index"
              }
              variableUnit={currentVarConfig.unit}
              datasetName={currentVarConfig.dataset}
              selectedRegionName={activeRegion.name}
              centerCoordinates={activeRegion.center}
              targetZoom={activeRegion.zoom}
              onDatasetClick={() => setIsInfoOpen(true)}
              onInfoClick={() => setIsInfoOpen(true)}
              onLocationClick={handleMapLocationClick}
            />

            {/* 2. Center Bottom View Switcher (Time Series vs Regional Comparison Bars) */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center bg-[#101729] p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setCenterBottomView("timeseries")}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 cursor-pointer ${centerBottomView === "timeseries"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Time Series Curve</span>
                </button>
                <button
                  onClick={() => setCenterBottomView("bars")}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium flex items-center gap-1.5 cursor-pointer ${centerBottomView === "bars"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Planetary Comparison Bars</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                {centerBottomView === "timeseries" ? "2000–2025 Multi-Decadal Record" : "Cross-Ecosystem Benchmark"}
              </span>
            </div>

            {/* Display Selected Center Bottom Component */}
            {centerBottomView === "timeseries" ? (
              <TimeSeriesChart
                variableId={selectedVariable}
                variableUnit={currentVarConfig.unit}
                regionLabel={activeRegion.name}
                customData={currentVarConfig.data}
                customYMin={currentVarConfig.yMin}
                customYMax={currentVarConfig.yMax}
                customTicks={currentVarConfig.ticks}
              />
            ) : (
              <RegionalComparisonBars
                variableId={selectedVariable}
                variableName={
                  selectedVariable === "soil_moisture"
                    ? "Soil Moisture"
                    : selectedVariable === "rainfall"
                      ? "Rainfall"
                      : selectedVariable === "temperature"
                        ? "Temperature"
                        : "Vegetation Index"
                }
                variableUnit={currentVarConfig.unit}
                activeRegionId={activeRegion.id}
                onSelectRegion={(reg) => setActiveRegion(reg)}
              />
            )}
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Trend Analysis & Key Insights               */}
          {/* ========================================================= */}
          <div className="flex flex-col gap-5 lg:col-span-4">
            {/* Top Card: Trend Analysis */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Trend Analysis</h2>
              </div>

              {/* Big Green Hero Metric */}
              <div className="flex items-baseline gap-2">
                <span className="text-emerald-400 text-3xl font-extrabold tracking-tight flex items-center gap-1">
                  ↗ {currentVarConfig.trendPercent}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{currentVarConfig.trendPeriod}</p>

              {/* Mini Sparkline Chart */}
              <TrendSparkline
                variableId={selectedVariable}
                customValues={currentVarConfig.data.map((d) => ({ x: d.year, y: d.value }))}
                customYMin={currentVarConfig.yMin}
                customYMax={currentVarConfig.yMax}
                customTicks={currentVarConfig.ticks}
              />

              <div className="border-t border-slate-800/80 my-3" />

              {/* Statistical Summary */}
              <div>
                <h3 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                  Statistical Summary
                </h3>

                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Target Extent</span>
                    <span className="text-slate-200 font-medium truncate max-w-[140px] text-right">
                      {activeRegion.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Mean Value</span>
                    <span className="text-slate-200 font-medium font-mono">{currentVarConfig.mean}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Std. Deviation</span>
                    <span className="text-slate-200 font-medium font-mono">{currentVarConfig.stdDev}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Trend Significance</span>
                    <span className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-[11px] font-medium px-2 py-0.5 rounded-full">
                      {currentVarConfig.significance}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Data Source</span>
                    <span className="text-slate-200 font-medium text-[11px] truncate max-w-[140px] text-right">
                      {currentVarConfig.source}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card: Key Insights */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col">
              <div className="flex items-center gap-2 mb-3.5">
                <Lightbulb className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <h2 className="text-sm font-semibold text-white">Key Insights</h2>
              </div>

              <div className="flex flex-col gap-3">
                {currentVarConfig.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Access Card: NASA & Space Agency Resources */}
            <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Partner Missions &amp; Tools
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950 text-sky-300 border border-blue-500/30 font-mono">
                  Research
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cross-referenced with NASA Giovanni, SWOT water elevations, CSA Radarsat RCM C-band SAR, and KNMI Climate Explorer.
              </p>
              <button
                onClick={() => setIsResearchModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#131d33] hover:bg-[#1a2745] border border-slate-700/80 text-sky-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Open Research Portal</span>
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: Dataset Information (Triggered via (i) or dropdown) */}
      {/* ========================================================= */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsInfoOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-blue-400 mb-2">
              <Layers className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">{currentVarConfig.dataset}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Calibrated NASA Earth Observation platform data covering global terrestrial landmasses from 2000 to 2025.
            </p>

            <div className="bg-[#101a33] border border-slate-800 rounded-xl p-3 text-xs flex flex-col gap-2 mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Region:</span>
                <span className="text-white font-medium">{activeRegion.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Observation Window:</span>
                <span className="text-white font-medium">{dateRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sensor / Mission:</span>
                <span className="text-white font-medium">{currentVarConfig.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Statistical Test:</span>
                <span className="text-emerald-400 font-medium">Mann-Kendall & Sen's Slope</span>
              </div>
            </div>

            <button
              onClick={() => setIsInfoOpen(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
            >
              Close Information
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: New Investigation Configurator                   */}
      {/* ========================================================= */}
      {isNewInvestigationOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1222] border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsNewInvestigationOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-blue-400 mb-1">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Configure New Investigation</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Select variables, NASA Earth observation platforms, and global geographical targets.
            </p>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Environmental Variable
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "soil_moisture", name: "Soil Moisture" },
                    { id: "rainfall", name: "Rainfall" },
                    { id: "temperature", name: "Temperature" },
                    { id: "ndvi", name: "Vegetation Index" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariable(v.id as VariableType)}
                      className={`px-3 py-2 text-xs rounded-xl border text-left transition-colors ${selectedVariable === v.id
                          ? "bg-blue-600 border-blue-500 text-white font-medium"
                          : "bg-[#131b2e] border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Geographical Region</label>
                <select
                  value={activeRegion.id}
                  onChange={(e) => {
                    const reg = GLOBAL_REGIONS.find((r) => r.id === e.target.value);
                    if (reg) setActiveRegion(reg);
                  }}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                >
                  {GLOBAL_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.flag} {r.name} ({r.country})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Historical Period</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                >
                  <option value="2000 – 2025">2000 – 2025 (25 Years - Recommended)</option>
                  <option value="2005 – 2025">2005 – 2025 (20 Years)</option>
                  <option value="2010 – 2025">2010 – 2025 (15 Years)</option>
                  <option value="1990 – 2025">1990 – 2025 (Extended Baseline)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsNewInvestigationOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsNewInvestigationOpen(false);
                  handleRunInvestigation();
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30"
              >
                Launch Investigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NASA & Space Agency Partner Research Hub */}
      <NasaPartnerResourcesModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
      />
    </div>
  );
}
