"use client";

import React from "react";
import { Sparkles, Compass, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { InvestigationResult } from "../../types";

interface ScientificInterpretationCardProps {
  result: InvestigationResult;
}

export const ScientificInterpretationCard: React.FC<ScientificInterpretationCardProps> = ({ result }) => {
  const { scientificInterpretation, trend, datasetMetadata, config } = result;

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-space-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-nasa-cyan" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            What Does This Tell Us? (Scientific Interpretation)
          </h3>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800">
          Synthesized from NASA Observational Record
        </span>
      </div>

      {/* Main Headline */}
      <div className="bg-gradient-to-r from-nasa-blue/20 via-space-950 to-space-900 p-4 rounded-xl border border-nasa-blue/40">
        <h4 className="text-base font-bold text-white mb-2 leading-snug">
          {scientificInterpretation.headline}
        </h4>
        <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
          {scientificInterpretation.narrative}
        </p>
      </div>

      {/* Structured Details: Trend Dynamics & Statistical Significance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trend Dynamics */}
        <div className="bg-space-950 p-4 rounded-xl border border-space-800/80 space-y-2">
          <span className="text-xs font-bold text-nasa-cyan uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            Physical Trajectory &amp; Climate Shocks
          </span>
          <p className="text-xs text-gray-300 leading-relaxed">
            {scientificInterpretation.trendExplanation}
          </p>
        </div>

        {/* Statistical Significance Context */}
        <div className="bg-space-950 p-4 rounded-xl border border-space-800/80 space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Statistical Significance Evaluation
          </span>
          <p className="text-xs text-gray-300 leading-relaxed">
            {scientificInterpretation.significanceExplanation}
          </p>
        </div>
      </div>

      {/* Caveats, Limitations & Provenance */}
      <div className="bg-space-950/60 p-4 rounded-xl border border-space-800/70 space-y-2">
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" />
          Observational Limitations &amp; Dataset Caveats
        </span>
        <p className="text-xs text-gray-400 leading-relaxed">
          {scientificInterpretation.caveatsAndLimitations}
        </p>
        <div className="pt-2 text-[10px] text-gray-500 font-mono">
          Attribution: NASA EOSDIS GES DISC • DOI: {datasetMetadata.doi || "N/A"} • Product: {datasetMetadata.name}
        </div>
      </div>
    </div>
  );
};
