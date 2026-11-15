"use client";

import React, { useState } from "react";
import { MapPin, Search, Globe, ChevronRight } from "lucide-react";
import { GeographicalTarget } from "../../types";
import { GEOGRAPHICAL_TARGETS } from "../../services/catalogData";

interface GeographicalSelectorProps {
  selectedTargetId: string;
  onSelectTarget: (target: GeographicalTarget) => void;
}

export const GeographicalSelector: React.FC<GeographicalSelectorProps> = ({
  selectedTargetId,
  onSelectTarget,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterLevel, setFilterLevel] = useState<"all" | "country" | "county" | "basin">("all");

  const filteredTargets = GEOGRAPHICAL_TARGETS.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLevel = filterLevel === "all" || t.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            3. Select Geographical Target
          </h3>
          <p className="text-xs text-gray-400">Default: Kenya benchmark demonstration extent</p>
        </div>
        <span className="text-[11px] font-mono text-nasa-cyan bg-space-850 px-2.5 py-0.5 rounded border border-space-700">
          Kenya &amp; Sub-Regions
        </span>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Kenya, counties (Turkana, Nakuru...), or basins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-space-900 border border-space-800 text-xs text-white rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-nasa-cyan"
          />
        </div>

        <div className="flex items-center bg-space-900 border border-space-800 rounded-lg p-1 text-[11px] font-mono">
          <button
            onClick={() => setFilterLevel("all")}
            className={`px-2 py-1 rounded ${filterLevel === "all" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterLevel("country")}
            className={`px-2 py-1 rounded ${filterLevel === "country" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"}`}
          >
            National
          </button>
          <button
            onClick={() => setFilterLevel("county")}
            className={`px-2 py-1 rounded ${filterLevel === "county" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"}`}
          >
            Counties
          </button>
          <button
            onClick={() => setFilterLevel("basin")}
            className={`px-2 py-1 rounded ${filterLevel === "basin" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"}`}
          >
            Basins
          </button>
        </div>
      </div>

      {/* Target List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
        {filteredTargets.map((target) => {
          const isSelected = selectedTargetId === target.id;

          return (
            <button
              key={target.id}
              onClick={() => onSelectTarget(target)}
              className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                isSelected
                  ? "bg-nasa-blue/25 border-nasa-cyan shadow-sm"
                  : "bg-space-900/70 border-space-800 hover:border-space-700 hover:bg-space-850"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white truncate">{target.name}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase ${
                      target.level === "country"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : target.level === "county"
                        ? "bg-blue-950 text-blue-300 border border-blue-800"
                        : "bg-purple-950 text-purple-300 border border-purple-800"
                    }`}
                  >
                    {target.level}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{target.description}</p>
                <div className="text-[10px] font-mono text-gray-500 mt-1">
                  Area: {target.areaSqKm.toLocaleString()} km²
                </div>
              </div>

              {isSelected && <div className="w-2 h-2 rounded-full bg-nasa-cyan shrink-0 mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
