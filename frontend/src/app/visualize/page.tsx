"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Share2,
  Calendar,
  Globe2,
  Database,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  GitCompare,
  BookOpen,
} from "lucide-react";
import { InvestigationResult } from "../../types";
import { DEFAULT_DEMO_INVESTIGATION } from "../../services/catalogData";
import { executeInvestigation } from "../../services/investigationApi";
import { TimeSeriesEChart } from "../../components/visualization/TimeSeriesEChart";
import { StatisticalScorecard } from "../../components/visualization/StatisticalScorecard";
import { ScientificInterpretationCard } from "../../components/visualization/ScientificInterpretationCard";
import { ComparisonDrawer } from "../../components/visualization/ComparisonDrawer";
import { ExportModal } from "../../components/visualization/ExportModal";
import { MapLibreGeographicalMap } from "../../components/investigation/MapLibreGeographicalMap";
import { DecadalAnomalyBars } from "../../components/visualization/DecadalAnomalyBars";
import { RegionalComparisonBars } from "../../components/investigation/RegionalComparisonBars";
import { NasaPartnerResourcesModal } from "../../components/research/NasaPartnerResourcesModal";

export default function VisualizationPage() {
  const router = useRouter();
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeMapLayer, setActiveMapLayer] = useState<"distribution" | "anomalies" | "trend" | "significance">("distribution");
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadInvestigation() {
      setIsLoading(true);
      // Check if sessionStorage has result from /investigate
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem("active_investigation_result");
        if (stored) {
          try {
            setResult(JSON.parse(stored));
            setIsLoading(false);
            return;
          } catch (e) {
            console.error("Failed to parse stored result:", e);
          }
        }
      }

      // Default to initial demonstration investigation (Kenya GLDAS-2.1 Noah Soil Moisture)
      try {
        const demoRes = await executeInvestigation(DEFAULT_DEMO_INVESTIGATION);
        setResult(demoRes);
      } catch (err) {
        console.error("Error executing default demonstration investigation:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInvestigation();
  }, []);

  if (isLoading || !result) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-nasa-blue/30 border border-nasa-cyan/40 flex items-center justify-center text-nasa-cyan animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white font-mono">
          Synthesizing NASA Earth Observation Results...
        </h3>
        <p className="text-xs text-gray-400">Computing Mann-Kendall statistics and rendering spatial layers</p>
      </div>
    );
  }

  const { config, trend, datasetMetadata, spatialData } = result;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Investigation Top Navigation & Action Header */}
      <div className="bg-gradient-to-r from-space-900 via-space-850 to-space-900 border border-space-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-nasa-blue/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Link
                href="/investigate"
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Investigation Workspace</span>
              </Link>
              <span className="text-gray-600">/</span>
              <span className="px-2.5 py-0.5 rounded-md bg-nasa-cyan/10 text-nasa-cyan border border-nasa-cyan/30 text-xs font-mono font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Scientific Results
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {config.title}
            </h1>

            {/* Badges metadata matrix */}
            <div className="flex flex-wrap items-center gap-2.5 mt-3 text-xs font-mono">
              <span className="bg-space-950 px-2.5 py-1 rounded-lg border border-space-800 text-gray-300 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-nasa-cyan" />
                {config.geographicalTarget.name}
              </span>

              <span className="bg-space-950 px-2.5 py-1 rounded-lg border border-space-800 text-gray-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-nasa-cyan" />
                {datasetMetadata.shortName}
              </span>

              <span className="bg-space-950 px-2.5 py-1 rounded-lg border border-space-800 text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-nasa-cyan" />
                {config.dateRange.startDate.slice(0, 4)}–{config.dateRange.endDate.slice(0, 4)} ({trend.data_points} Months)
              </span>

              {config.parameters.soilDepth && (
                <span className="bg-space-950 px-2.5 py-1 rounded-lg border border-space-800 text-gray-300">
                  Depth: {config.parameters.soilDepth}
                </span>
              )}

              <span
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
                  trend.significance === "significant"
                    ? "bg-emerald-950/60 border-emerald-700 text-emerald-400"
                    : "bg-space-800 border-space-700 text-gray-300"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {trend.significance === "significant" ? "p ≤ 0.05 (Significant)" : "p > 0.05"}
              </span>
            </div>
          </div>

          {/* Actions: Edit Investigation, Research Hub & Export */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsResearchModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-space-850 hover:bg-space-800 text-sky-300 hover:text-white border border-sky-500/40 font-medium text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>NASA &amp; Partner Research Hub</span>
            </button>

            <Link
              href="/investigate"
              className="px-4 py-2.5 rounded-xl bg-space-850 hover:bg-space-800 text-gray-300 hover:text-white border border-space-700 font-medium text-xs flex items-center gap-2 transition-all"
            >
              <span>Edit Investigation</span>
            </Link>

            <button
              onClick={() => setIsExportOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-nasa-blue to-blue-600 hover:brightness-110 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-nasa-blue/25 border border-nasa-cyan/40 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export Findings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualisation Canvas: ECharts Time Series on Left, MapLibre on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive ECharts Time Series Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <TimeSeriesEChart
            series={result.timeSeries}
            trend={trend}
            variableName={config.title}
            units={datasetMetadata.units}
          />
        </div>

        {/* Right Column: Geospatial MapLibre Visualization (5 cols) */}
        <div className="lg:col-span-5 bg-space-900 border border-space-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-nasa-cyan" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Spatial Field — {config.geographicalTarget.name}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-nasa-cyan bg-space-800 px-2 py-0.5 rounded border border-space-700">
              0.25° Grid
            </span>
          </div>

          <div className="flex-1 w-full rounded-xl overflow-hidden min-h-[380px]">
            <MapLibreGeographicalMap
              target={config.geographicalTarget}
              activeLayer={activeMapLayer}
              onLayerChange={setActiveMapLayer}
              variableName={datasetMetadata.shortName}
              variableUnit={datasetMetadata.units}
              spatialData={spatialData}
              className="w-full h-full min-h-[380px]"
            />
          </div>
        </div>
      </div>

      {/* 5-Year Decadal Epoch Anomaly Bars */}
      <DecadalAnomalyBars
        variableName={config.title}
        units={datasetMetadata.units}
        baselineMean={trend.sens_slope > 0 ? 0.34 : 0.28}
      />

      {/* Planetary Regional Benchmark Comparison Bars */}
      <RegionalComparisonBars
        variableId={
          config.variableId === "soil_moisture"
            ? "soil_moisture"
            : config.variableId === "precipitation"
            ? "rainfall"
            : config.variableId === "temperature"
            ? "temperature"
            : "ndvi"
        }
        variableName={datasetMetadata.shortName}
        variableUnit={datasetMetadata.units}
        activeRegionId="kenya"
      />

      {/* Statistical Analysis Scorecard */}
      <StatisticalScorecard trend={trend} units={datasetMetadata.units} />

      {/* Plain-Language Scientific Interpretation */}
      <ScientificInterpretationCard result={result} />

      {/* Comparative Regional & Period Divergence */}
      <ComparisonDrawer primaryResult={result} />

      {/* Export Findings Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        result={result}
      />

      {/* NASA & Partner Research Modal */}
      <NasaPartnerResourcesModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
      />
    </div>
  );
}
