"use client";

import React from "react";
import { Database, Check, ExternalLink, AlertCircle, Info, Sparkles } from "lucide-react";
import { NASADatasetMetadata, EnvironmentalVariableId } from "../../types";
import { NASA_DATASETS } from "../../services/catalogData";

interface DatasetSelectorProps {
  variableId: EnvironmentalVariableId;
  selectedDatasetId: string;
  onSelectDataset: (dataset: NASADatasetMetadata) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  variableId,
  selectedDatasetId,
  onSelectDataset,
}) => {
  // Filter datasets compatible with active variable
  const compatibleDatasets = NASA_DATASETS.filter((d) => d.supportedVariables.includes(variableId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            2. Select Verified NASA Dataset
          </h3>
          <p className="text-xs text-gray-400">Authentic NASA Earth Science missions and assimilation systems</p>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800">
          {compatibleDatasets.length} Compatible
        </span>
      </div>

      <div className="space-y-3">
        {compatibleDatasets.map((dataset) => {
          const isSelected = selectedDatasetId === dataset.id;

          return (
            <div
              key={dataset.id}
              onClick={() => onSelectDataset(dataset)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "bg-nasa-blue/20 border-nasa-cyan shadow-md shadow-nasa-blue/15 ring-1 ring-nasa-cyan"
                  : "bg-space-900/80 border-space-800 hover:border-space-700 hover:bg-space-850"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold text-white">{dataset.shortName}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        dataset.isDirectObservation
                          ? "bg-emerald-950/60 border border-emerald-700 text-emerald-300"
                          : "bg-amber-950/60 border border-amber-700 text-amber-300"
                      }`}
                    >
                      {dataset.dataType}
                    </span>
                    {dataset.id === "GLDAS_NOAH025_M" && (
                      <span className="text-[10px] font-mono bg-nasa-cyan/10 border border-nasa-cyan/40 text-nasa-cyan px-2 py-0.5 rounded flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Default Benchmark
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{dataset.description}</p>
                </div>

                <div className="shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "bg-nasa-cyan border-nasa-cyan text-space-950"
                        : "border-space-700 bg-space-800"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* Technical Specifications Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-space-800/80 text-[11px] font-mono">
                <div>
                  <span className="text-gray-500 block text-[10px]">Provider:</span>
                  <span className="text-gray-300 truncate block">{dataset.provider.split("(")[0]}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Spatial Res:</span>
                  <span className="text-gray-300">{dataset.spatialResolution}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Temporal:</span>
                  <span className="text-gray-300">{dataset.temporalCoverage.resolution}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Record:</span>
                  <span className="text-nasa-cyan">
                    {dataset.temporalCoverage.start.slice(0, 4)}–{dataset.temporalCoverage.end.slice(0, 4)}
                  </span>
                </div>
              </div>

              {/* Data Type & Scientific Integrity Notice */}
              <div className="mt-2.5 text-[10px] text-gray-400 bg-space-950/60 p-2 rounded-lg border border-space-800/80 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-nasa-cyan shrink-0 mt-0.5" />
                <span>
                  <strong className="text-gray-200">Scientific Provenance: </strong>
                  {dataset.limitations}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
