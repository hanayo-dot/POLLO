"use client";

import React from "react";
import {
  Calendar,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Layers,
  HelpCircle,
} from "lucide-react";
import {
  EnvironmentalVariable,
  NASADatasetMetadata,
  InvestigationConfig,
} from "../../types";

interface InvestigationConfigPanelProps {
  config: InvestigationConfig;
  activeVariable: EnvironmentalVariable;
  activeDataset: NASADatasetMetadata;
  onChangeConfig: (newConfig: InvestigationConfig) => void;
  onRunInvestigation: () => void;
  isLoading?: boolean;
}

export const InvestigationConfigPanel: React.FC<InvestigationConfigPanelProps> = ({
  config,
  activeVariable,
  activeDataset,
  onChangeConfig,
  onRunInvestigation,
  isLoading = false,
}) => {
  const handleParamChange = (key: string, value: any) => {
    onChangeConfig({
      ...config,
      parameters: {
        ...config.parameters,
        [key]: value,
      },
    });
  };

  const handleDateChange = (field: "startDate" | "endDate", value: string) => {
    onChangeConfig({
      ...config,
      dateRange: {
        ...config.dateRange,
        [field]: value,
      },
    });
  };

  // Date validation against active dataset
  const datasetStart = activeDataset.temporalCoverage.start;
  const datasetEnd = activeDataset.temporalCoverage.end;
  const isDateInvalid =
    config.dateRange.startDate < datasetStart ||
    config.dateRange.endDate > datasetEnd ||
    config.dateRange.startDate >= config.dateRange.endDate;

  return (
    <div className="space-y-5 bg-space-900/90 border border-space-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-space-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-nasa-cyan" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            4. Parameters &amp; Temporal Range
          </h3>
        </div>
        <span className="text-[10px] font-mono text-gray-400">Step 4 of 4</span>
      </div>

      {/* Dynamic Variable-Specific Parameter Filters */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-gray-300 block font-mono">
          Variable-Specific Parameters ({activeVariable.name})
        </label>

        {activeVariable.id === "soil_moisture" && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-gray-400 block">Soil Layer Depth:</span>
            <select
              value={config.parameters.soilDepth || "0-10cm"}
              onChange={(e) => handleParamChange("soilDepth", e.target.value)}
              className="w-full bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan"
            >
              <option value="0-10cm">0–10 cm (Surface Layer — Rapid Precipitation & Evaporation Interface)</option>
              <option value="10-40cm">10–40 cm (Upper Root Zone — Crop Moisture Buffer)</option>
              <option value="40-100cm">40–100 cm (Deep Root Zone — Attenuates Seasonal Spikes)</option>
              <option value="100-200cm">100–200 cm (Subsurface Reservoir — Aquifer Storage)</option>
            </select>
          </div>
        )}

        {activeVariable.id === "precipitation" && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-gray-400 block">Measurement Metric:</span>
            <select
              value={config.parameters.precipitationMetric || "accumulation"}
              onChange={(e) => handleParamChange("precipitationMetric", e.target.value)}
              className="w-full bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan"
            >
              <option value="accumulation">Monthly Accumulated Rainfall (mm/month)</option>
              <option value="daily_rate">Mean Daily Precipitation Rate (mm/day)</option>
            </select>
          </div>
        )}

        {activeVariable.id === "temperature" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-gray-400 block mb-1">Level:</span>
              <select
                value={config.parameters.temperatureMetric || "air_2m"}
                onChange={(e) => handleParamChange("temperatureMetric", e.target.value)}
                className="w-full bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan"
              >
                <option value="air_2m">2-Meter Air Temperature (MERRA-2)</option>
                <option value="land_day">MODIS Daytime LST</option>
                <option value="land_night">MODIS Nighttime LST</option>
              </select>
            </div>
            <div>
              <span className="text-[11px] text-gray-400 block mb-1">Units:</span>
              <select
                value={config.parameters.temperatureUnit || "celsius"}
                onChange={(e) => handleParamChange("temperatureUnit", e.target.value)}
                className="w-full bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="kelvin">Kelvin (K)</option>
              </select>
            </div>
          </div>
        )}

        {activeVariable.id === "vegetation" && (
          <div className="space-y-1.5">
            <span className="text-[11px] text-gray-400 block">Spectral Index:</span>
            <select
              value={config.parameters.vegetationIndex || "ndvi"}
              onChange={(e) => handleParamChange("vegetationIndex", e.target.value)}
              className="w-full bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan"
            >
              <option value="ndvi">NDVI (Normalized Difference Vegetation Index)</option>
              <option value="evi">EVI (Enhanced Vegetation Index — Aerosol Corrected)</option>
            </select>
          </div>
        )}
      </div>

      {/* Date Range Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5 font-mono">
            <Calendar className="w-3.5 h-3.5 text-nasa-cyan" />
            Historical Observation Span
          </label>
          <span className="text-[10px] text-gray-400 font-mono">
            Coverage: {datasetStart.slice(0, 4)}–{datasetEnd.slice(0, 4)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-gray-400 block mb-1">Start Date</span>
            <input
              type="date"
              value={config.dateRange.startDate}
              min={datasetStart}
              max={datasetEnd}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className="w-full bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan font-mono"
            />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block mb-1">End Date</span>
            <input
              type="date"
              value={config.dateRange.endDate}
              min={datasetStart}
              max={datasetEnd}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              className="w-full bg-space-800 border border-space-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-nasa-cyan font-mono"
            />
          </div>
        </div>

        {isDateInvalid && (
          <div className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800/60 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Requested dates fall outside NASA {activeDataset.shortName} temporal coverage.</span>
          </div>
        )}
      </div>

      {/* Deseasonalize Non-Parametric Toggle */}
      <div className="bg-space-950/70 p-3 rounded-xl border border-space-800 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-white block">Deseasonalize Series (12-Mo Cycle)</span>
          <p className="text-[10px] text-gray-400">
            Subtracts climatological monthly baseline ($\mu_m$) so seasonal rainfall peaks don't bias Mann-Kendall.
          </p>
        </div>
        <input
          type="checkbox"
          checked={config.parameters.deseasonalize !== false}
          onChange={(e) => handleParamChange("deseasonalize", e.target.checked)}
          className="w-4 h-4 rounded bg-space-800 border-space-600 text-nasa-cyan focus:ring-0 cursor-pointer"
        />
      </div>

      {/* Action CTA: Run Investigation */}
      <div className="pt-2">
        <button
          onClick={onRunInvestigation}
          disabled={isLoading || isDateInvalid}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isLoading || isDateInvalid
              ? "bg-space-800 text-gray-500 cursor-not-allowed border border-space-700"
              : "bg-gradient-to-r from-nasa-blue via-blue-600 to-nasa-cyan hover:brightness-110 text-white shadow-lg shadow-nasa-blue/30 border border-nasa-cyan/40 hover:scale-[1.01]"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <span>Querying NASA Observation Core...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Scientific Investigation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
