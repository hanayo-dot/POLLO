"use client";

import React, { useState } from "react";
import { Download, FileSpreadsheet, FileJson, Copy, Check, X, ShieldCheck } from "lucide-react";
import { InvestigationResult } from "../../types";
import { exportInvestigationCSV } from "../../services/investigationApi";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: InvestigationResult;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, result }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadCSV = () => {
    const csvContent = exportInvestigationCSV(result);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NASA_POLLO_${result.config.variableId}_${result.config.geographicalTarget.id}_${result.config.dateRange.startDate}_${result.config.dateRange.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NASA_POLLO_Investigation_${result.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCitation = () => {
    const citation = `${result.datasetMetadata.citation} Data accessed via POLLO Scientific Trend Detective, NASA Space Apps Challenge 2026. Target: ${result.config.geographicalTarget.name} (${result.config.dateRange.startDate} to ${result.config.dateRange.endDate}). Mann-Kendall S=${result.trend.s_statistic}, p=${result.trend.p_value}, Sen's slope rate=${result.trend.annual_rate} ${result.datasetMetadata.units}/yr.`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/85 backdrop-blur-md">
      <div className="bg-space-900 border border-space-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-6 relative">
        <div className="flex items-center justify-between pb-3 border-b border-space-800">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-nasa-cyan" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Export Scientific Investigation Data
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-space-800 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-gray-300 leading-relaxed">
          Export verified NASA satellite time series, non-parametric trend parameters, and complete analytical
          metadata for reproducibility, research reports, or offline GIS analysis.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3 font-mono text-xs">
          {/* Option 1: CSV */}
          <button
            onClick={handleDownloadCSV}
            className="w-full p-4 rounded-xl bg-space-950 hover:bg-space-850 border border-space-800 hover:border-nasa-cyan flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-700 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-left font-sans">
                <div className="font-bold text-white text-sm">Download Observations CSV</div>
                <div className="text-[11px] text-gray-400 font-mono">
                  {result.timeSeries.length} rows • Includes baseline, anomalies &amp; Sen's line fit
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-500 group-hover:text-nasa-cyan" />
          </button>

          {/* Option 2: JSON Metadata */}
          <button
            onClick={handleDownloadJSON}
            className="w-full p-4 rounded-xl bg-space-950 hover:bg-space-850 border border-space-800 hover:border-nasa-cyan flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-950/60 border border-blue-700 flex items-center justify-center text-nasa-cyan group-hover:scale-105 transition-transform">
                <FileJson className="w-5 h-5" />
              </div>
              <div className="text-left font-sans">
                <div className="font-bold text-white text-sm">Complete Investigation JSON</div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Full config, statistics, spatial points &amp; interpretation
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-gray-500 group-hover:text-nasa-cyan" />
          </button>

          {/* Option 3: Citation Copy */}
          <button
            onClick={handleCopyCitation}
            className="w-full p-4 rounded-xl bg-space-950 hover:bg-space-850 border border-space-800 hover:border-nasa-cyan flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-700 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </div>
              <div className="text-left font-sans">
                <div className="font-bold text-white text-sm">
                  {copied ? "Citation Copied to Clipboard!" : "Copy Scientific Citation"}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  Standardized peer-review format with NASA DOI
                </div>
              </div>
            </div>
            <span className="text-[10px] text-nasa-cyan font-mono">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <div className="pt-2 text-[10px] text-gray-500 font-mono flex items-center justify-between border-t border-space-800">
          <span>Attribution: {result.datasetMetadata.provider}</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            EOSDIS Open Data Policy
          </span>
        </div>
      </div>
    </div>
  );
};
