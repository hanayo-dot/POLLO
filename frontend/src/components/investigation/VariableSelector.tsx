"use client";

import React, { useState } from "react";
import {
  Droplets,
  CloudRain,
  Thermometer,
  Trees,
  Wind,
  Waves,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { EnvironmentalVariable, EnvironmentalVariableId } from "../../types";
import { ENVIRONMENTAL_VARIABLES } from "../../services/catalogData";

interface VariableSelectorProps {
  selectedVariableId: EnvironmentalVariableId;
  onSelectVariable: (variable: EnvironmentalVariable) => void;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({
  selectedVariableId,
  onSelectVariable,
}) => {
  const [catalogueExpanded, setCatalogueExpanded] = useState<boolean>(false);

  const primaryVariables = ENVIRONMENTAL_VARIABLES.slice(0, 4);
  const extraVariables = ENVIRONMENTAL_VARIABLES.slice(4);

  const getIcon = (id: EnvironmentalVariableId) => {
    switch (id) {
      case "soil_moisture":
        return Droplets;
      case "precipitation":
        return CloudRain;
      case "temperature":
        return Thermometer;
      case "vegetation":
        return Trees;
      case "evaporation":
        return Wind;
      case "humidity":
        return Waves;
      default:
        return Droplets;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            1. Select Environmental Variable
          </h3>
          <p className="text-xs text-gray-400">Choose the planetary sphere or hydrological indicator</p>
        </div>
        <span className="text-[11px] font-mono text-nasa-cyan bg-nasa-blue/20 px-2 py-0.5 rounded border border-nasa-cyan/30">
          4 Core Spheres
        </span>
      </div>

      {/* Primary 4 Variables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {primaryVariables.map((v) => {
          const Icon = getIcon(v.id);
          const isSelected = selectedVariableId === v.id;

          return (
            <button
              key={v.id}
              onClick={() => onSelectVariable(v)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-nasa-blue/20 border-nasa-cyan shadow-lg shadow-nasa-blue/20 ring-1 ring-nasa-cyan"
                  : "bg-space-900/80 border-space-800 hover:border-space-700 hover:bg-space-850"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-nasa-cyan text-space-950" : "bg-space-800 text-nasa-cyan"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-nasa-cyan text-space-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {v.name}
                  {v.id === "soil_moisture" && (
                    <span className="text-[10px] font-mono text-emerald-400 font-normal">
                      [Demo Benchmark]
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                  {v.tagline}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-space-800/80 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>Unit: {v.primaryUnit}</span>
                <span>{v.supportedDatasets.length} NASA Datasets</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Expandable Catalogue Toggle */}
      <div>
        <button
          onClick={() => setCatalogueExpanded(!catalogueExpanded)}
          className="text-xs text-nasa-cyan hover:underline flex items-center gap-1 font-mono"
        >
          {catalogueExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{catalogueExpanded ? "Hide Expandable Catalogue" : "View Expandable Catalogue (Evaporation, Humidity...)"}</span>
        </button>

        {catalogueExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {extraVariables.map((v) => {
              const Icon = getIcon(v.id);
              const isSelected = selectedVariableId === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => onSelectVariable(v)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-nasa-blue/20 border-nasa-cyan"
                      : "bg-space-900/60 border-space-800 hover:border-space-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-nasa-cyan" />
                    <span className="text-xs font-bold text-white">{v.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2">{v.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
