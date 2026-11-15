"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Droplets,
  CloudRain,
  Thermometer,
  Trees,
  Compass,
  Satellite,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  BarChart2,
  Search,
  Globe2,
} from "lucide-react";

interface LandingJourneyOverlayProps {
  currentStage: number;
}

export const LandingJourneyOverlay: React.FC<LandingJourneyOverlayProps> = ({ currentStage }) => {
  return (
    <div className="relative z-10 w-full pointer-events-none">
      {/* Flight Progress HUD */}
      <div className="fixed top-20 right-6 z-30 pointer-events-auto hidden md:flex flex-col items-end gap-2">
        <div className="bg-space-950/80 backdrop-blur-md border border-space-800 rounded-xl p-3 text-right font-mono text-xs shadow-xl">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center justify-end gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-nasa-cyan animate-ping" />
            Orbital Descent Telemetry
          </div>
          <div className="text-sm font-bold text-white">
            {currentStage === 1 && "Stage 1: Deep Space"}
            {currentStage === 2 && "Stage 2: Orbital Approach"}
            {currentStage === 3 && "Stage 3: Stratosphere"}
            {currentStage === 4 && "Stage 4: Cloud Descent"}
            {currentStage === 5 && "Stage 5: Surface Observation"}
          </div>
          <div className="text-[11px] text-nasa-cyan mt-1">
            {currentStage === 1 && "Altitude: 36,000 km • Geostationary"}
            {currentStage === 2 && "Altitude: 850 km • Low Earth Orbit"}
            {currentStage === 3 && "Altitude: 50 km • Stratospheric Rim"}
            {currentStage === 4 && "Altitude: 8 km • Troposphere"}
            {currentStage === 5 && "Altitude: 0 km • Ground Analysis Ready"}
          </div>

          {/* Step Dots */}
          <div className="flex gap-1.5 justify-end mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-6 h-1 rounded-full transition-all duration-300 ${
                  currentStage >= s ? "bg-nasa-cyan shadow-sm shadow-nasa-cyan" : "bg-space-800"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* STAGE 1: Deep Space Hero (vh 100) */}
      <section className="min-h-screen flex flex-col justify-center items-center px-6 text-center relative pointer-events-auto">
        <div className="max-w-4xl space-y-6 pt-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-nasa-blue/20 border border-nasa-cyan/30 text-nasa-cyan text-xs font-mono font-medium backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            NASA Space Apps Challenge 2026 — Earth System Trend Detective
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-2xl">
            Earth is constantly changing.
            <br />
            <span className="bg-gradient-to-r from-nasa-cyan via-white to-blue-400 bg-clip-text text-transparent">
              Are we paying attention?
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Explore multi-decadal patterns, uncover critical environmental trends, and understand the physical
            forces shaping our planet through authentic NASA satellite observations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/investigate"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-nasa-blue to-blue-600 hover:from-blue-600 hover:to-nasa-cyan text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-nasa-blue/40 border border-nasa-cyan/40 hover:scale-105 transition-all group"
            >
              <span>Launch First Investigation</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#approach"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-space-900/80 hover:bg-space-800 text-gray-300 hover:text-white font-medium text-sm flex items-center justify-center gap-2 border border-space-700 backdrop-blur-md transition-all"
            >
              <span>Explore The Journey</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </a>
          </div>
        </div>

        {/* Scroll Prompt */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-gray-400 font-mono">
          <span>Scroll to travel towards Earth</span>
          <div className="w-5 h-8 rounded-full border-2 border-gray-500/60 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-nasa-cyan animate-pulse" />
          </div>
        </div>
      </section>

      {/* STAGE 2: Approaching Earth */}
      <section id="approach" className="min-h-screen flex flex-col justify-center px-6 lg:px-20 pointer-events-auto">
        <div className="max-w-xl bg-space-950/70 backdrop-blur-md border border-space-800/80 rounded-2xl p-8 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-nasa-cyan">
            <Satellite className="w-4 h-4" />
            <span>STAGE 02 • ORBITAL RENDEZVOUS</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            A Living Planetary Machine
          </h2>

          <p className="text-sm text-gray-300 leading-relaxed">
            From 800 kilometers in orbit, Earth's boundaries dissolve into continuous physical systems. Sunlight warms
            tropical oceans, atmospheric winds drive evaporation, and continental land surfaces absorb and release
            vital moisture.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
            <div className="bg-space-900/80 p-3 rounded-lg border border-space-800">
              <span className="text-gray-400 block text-[10px] uppercase">Observation Horizon</span>
              <span className="text-white font-semibold">2000–2025 (25+ Yrs)</span>
            </div>
            <div className="bg-space-900/80 p-3 rounded-lg border border-space-800">
              <span className="text-gray-400 block text-[10px] uppercase">Constellation Sensors</span>
              <span className="text-nasa-cyan font-semibold">GLDAS • GPM • MODIS</span>
            </div>
          </div>
        </div>
      </section>

      {/* STAGE 3: Earth's Atmosphere */}
      <section className="min-h-screen flex flex-col justify-center items-end px-6 lg:px-20 pointer-events-auto">
        <div className="max-w-xl bg-space-950/70 backdrop-blur-md border border-space-800/80 rounded-2xl p-8 shadow-2xl space-y-4 text-right">
          <div className="flex items-center justify-end gap-2 text-xs font-mono text-nasa-cyan">
            <span>STAGE 03 • THE BLUE SHIELD</span>
            <Compass className="w-4 h-4" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            The Thermodynamic Interface
          </h2>

          <p className="text-sm text-gray-300 leading-relaxed">
            Crossing into the upper stratosphere, Rayleigh scattering illuminates the fragile atmospheric envelope.
            Here, energy fluxes govern planetary temperatures and regulate precipitation regimes across global biomes.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            NASA Reanalysis &amp; Radiation Budgets
          </div>
        </div>
      </section>

      {/* STAGE 4: Descending Through the Clouds */}
      <section className="min-h-screen flex flex-col justify-center px-6 lg:px-20 pointer-events-auto">
        <div className="max-w-xl bg-space-950/70 backdrop-blur-md border border-space-800/80 rounded-2xl p-8 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-nasa-cyan">
            <CloudRain className="w-4 h-4" />
            <span>STAGE 04 • TROPOSPHERIC DESCENT</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Penetrating the Monsoon Decks
          </h2>

          <p className="text-sm text-gray-300 leading-relaxed">
            Descending through cumulus towers and equatorial rain bands towards the African continent. Cloud systems
            distribute fresh water across agricultural basins, replenishing soil moisture reservoirs and driving
            ecological greenness.
          </p>

          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <span className="bg-space-900 px-2.5 py-1 rounded border border-space-800 text-gray-300">
              Inter-Tropical Convergence Zone (ITCZ)
            </span>
            <span className="bg-space-900 px-2.5 py-1 rounded border border-space-800 text-gray-300">
              Bimodal Rains
            </span>
          </div>
        </div>
      </section>

      {/* STAGE 5: Earth Observation & Scientific Purpose (Arrival) */}
      <section className="min-h-screen flex flex-col justify-center py-20 px-6 max-w-7xl mx-auto pointer-events-auto space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-nasa-cyan/10 border border-nasa-cyan/30 text-nasa-cyan text-xs font-mono font-medium">
            <Globe2 className="w-3.5 h-3.5" />
            Arrival: Terrestrial Observation Deck
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Turn Earth data into meaningful discoveries.
          </h2>

          <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
            Investigate historical environmental data, explore geographical patterns, and discover how Earth's
            systems are changing over time with verified non-parametric statistical methods.
          </p>

          <div className="pt-2">
            <Link
              href="/investigate"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-nasa-blue via-blue-600 to-nasa-cyan hover:brightness-110 text-white font-bold text-base shadow-xl shadow-nasa-blue/40 border border-nasa-cyan/50 hover:scale-105 transition-all"
            >
              <span>Start Investigating</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* The Four Primary Environmental Variables */}
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">The Four Primary Environmental Variables</h3>
            <p className="text-xs text-gray-400 mt-1">
              Select any of the primary variables below or launch a targeted investigation in Kenya.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Soil Moisture */}
            <div className="bg-space-900/90 backdrop-blur-md border border-space-800 hover:border-nasa-cyan/50 rounded-2xl p-6 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-700/50 flex items-center justify-center mb-4 text-nasa-cyan group-hover:scale-110 transition-transform">
                <Droplets className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>Soil Moisture</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-800 text-nasa-cyan">
                  0–10 cm Depth
                </span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Explore water availability within the soil profile and investigate how moisture conditions change over
                time across multi-decadal records.
              </p>
              <div className="text-[11px] font-mono text-gray-500 space-y-1 border-t border-space-800 pt-3">
                <div>Dataset: <span className="text-gray-300">GLDAS-2.1 Noah / SMAP L4</span></div>
                <div>Demo Target: <span className="text-emerald-400">Kenya (2000–2025)</span></div>
              </div>
            </div>

            {/* 2. Rainfall / Precipitation */}
            <div className="bg-space-900/90 backdrop-blur-md border border-space-800 hover:border-nasa-cyan/50 rounded-2xl p-6 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-700/50 flex items-center justify-center mb-4 text-nasa-cyan group-hover:scale-110 transition-transform">
                <CloudRain className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>Rainfall / Precip</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-800 text-cyan-400">
                  mm / month
                </span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Investigate precipitation patterns, monsoonal variability, convective extremes, and long-term changes
                in regional rainfall distribution.
              </p>
              <div className="text-[11px] font-mono text-gray-500 space-y-1 border-t border-space-800 pt-3">
                <div>Dataset: <span className="text-gray-300">GPM IMERG V07</span></div>
                <div>Resolution: <span className="text-gray-300">0.1° (~10 km)</span></div>
              </div>
            </div>

            {/* 3. Temperature */}
            <div className="bg-space-900/90 backdrop-blur-md border border-space-800 hover:border-nasa-cyan/50 rounded-2xl p-6 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-700/50 flex items-center justify-center mb-4 text-nasa-amber group-hover:scale-110 transition-transform">
                <Thermometer className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>Temperature</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-800 text-amber-400">
                  °C Metric
                </span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Examine changes in 2-meter air temperature and satellite daytime/nighttime land surface radiometric skin
                temperatures.
              </p>
              <div className="text-[11px] font-mono text-gray-500 space-y-1 border-t border-space-800 pt-3">
                <div>Dataset: <span className="text-gray-300">MERRA-2 / MODIS LST</span></div>
                <div>Coverage: <span className="text-gray-300">Global Continuous</span></div>
              </div>
            </div>

            {/* 4. Vegetation */}
            <div className="bg-space-900/90 backdrop-blur-md border border-space-800 hover:border-nasa-cyan/50 rounded-2xl p-6 transition-all hover:-translate-y-1 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform">
                <Trees className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                <span>Vegetation</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-space-800 text-emerald-400">
                  NDVI / EVI
                </span>
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Explore canopy greenness trajectories, vegetative photosynthetic vigour, and multi-decadal greening or
                browning shifts.
              </p>
              <div className="text-[11px] font-mono text-gray-500 space-y-1 border-t border-space-800 pt-3">
                <div>Dataset: <span className="text-gray-300">MODIS MOD13C2</span></div>
                <div>Resolution: <span className="text-gray-300">0.05° (~5.6 km)</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Why Identifying Environmental Trends Matters & How It Works */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="bg-space-950/80 border border-space-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-nasa-cyan" />
              What is Earth System Trend Detective?
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              We empower scientists, students, and environmental stewards to interrogate raw satellite and
              model-assimilated Earth science datasets. Rather than viewing static infographics, you define the
              geographical target, select the NASA dataset, and run rigorous non-parametric trend tests.
            </p>
            <div className="text-xs text-gray-400 bg-space-900 p-3.5 rounded-xl border border-space-800/80">
              <span className="text-nasa-cyan font-mono font-medium block mb-1">
                Why does statistical significance matter?
              </span>
              Environmental datasets are noisy, highly seasonal, and prone to extreme weather spikes. A simple line fit
              can mislead. We calculate the Mann-Kendall test with tie corrections and Sen's robust slope estimator to
              differentiate true multi-decadal trends from temporary climatological fluctuations.
            </div>
          </div>

          <div className="bg-space-950/80 border border-space-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-400" />
              How the Scientific Workflow Works
            </h4>
            <ol className="text-xs text-gray-300 space-y-3 font-sans list-decimal list-inside">
              <li>
                <strong className="text-white">Select Variable:</strong> Choose Soil Moisture, Rainfall,
                Temperature, or Vegetation.
              </li>
              <li>
                <strong className="text-white">Choose Dataset:</strong> Select from verified NASA missions (GLDAS, GPM,
                MODIS, MERRA-2).
              </li>
              <li>
                <strong className="text-white">Define Region:</strong> Target Kenya, specific counties, or major
                African ecological basins.
              </li>
              <li>
                <strong className="text-white">Set Timeframe:</strong> Examine 2000–2025 or customized historical
                spans.
              </li>
              <li>
                <strong className="text-white">Execute Investigation:</strong> Receive interactive maps, Apache
                ECharts time series, and plain-language scientific interpretation.
              </li>
            </ol>
            <div className="pt-2">
              <Link
                href="/investigate"
                className="w-full py-2.5 rounded-lg bg-nasa-blue/40 hover:bg-nasa-blue text-nasa-cyan hover:text-white border border-nasa-blue text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <span>Open Investigation Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
