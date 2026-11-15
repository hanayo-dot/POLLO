"use client";

import React, { useState, useRef } from "react";
import { Map as MapIcon, ChevronDown, Info, Plus, Minus, Crosshair } from "lucide-react";

interface InvestigationMapProps {
  variableId: "soil_moisture" | "rainfall" | "temperature" | "ndvi";
  variableName: string;
  variableUnit: string;
  datasetName: string;
  onDatasetClick?: () => void;
  onInfoClick?: () => void;
}

// 82-point accurate simplified Kenya boundary coordinates mapped to 1200x900 viewport
// covering bounding box [lon: 28.5 to 46.5, lat: -7.5 to 7.5]
const KENYA_SVG_PATH =
  "M480.4 172.8L482.6 169.1L485.4 172.8L494.7 172.8L496.0 179.5L502.8 183.4L556.3 184.1L567.7 187.8L640.1 233.2L663.1 233.9L667.3 231.0L693.0 239.2L721.1 240.3L733.6 245.8L750.9 228.9L756.6 218.0L817.6 192.9L844.2 213.4L892.3 211.4L856.2 257.9L831.0 281.2L832.0 502.2L868.2 544.4L869.0 551.8L852.2 568.1L847.9 565.3L845.7 569.4L834.2 572.5L833.7 564.1L829.7 574.4L824.1 567.8L827.5 581.5L832.0 584.5L829.7 588.6L824.2 583.9L818.3 586.8L821.1 593.9L810.0 602.4L799.4 601.7L782.1 610.1L777.5 626.1L782.2 628.9L774.9 646.0L765.9 652.4L764.4 649.3L757.7 667.0L752.1 664.0L757.8 671.7L752.4 685.0L745.6 685.0L749.7 688.1L746.6 692.9L744.0 688.2L737.4 692.4L744.4 696.7L726.4 727.7L720.0 725.7L712.7 730.7L618.1 669.3L613.9 661.6L606.6 660.8L605.7 654.8L613.3 648.9L609.7 632.8L366.7 510.2L360.3 510.2L363.6 459.3L359.6 443.4L372.3 429.2L376.6 413.8L392.5 401.1L399.1 385.1L419.9 376.1L418.6 366.7L431.5 350.7L433.8 335.0L424.4 309.1L428.2 301.4L425.0 294.5L421.2 294.1L415.3 278.8L405.6 274.3L402.3 262.9L395.6 259.1L392.1 241.4L396.0 229.9L376.8 223.5L380.3 217.5L372.3 217.4L371.3 204.7L365.1 196.8L392.1 172.8L460.8 148.2L459.7 154.4L471.4 155.7L468.1 163.2L474.0 172.8L480.4 172.8Z";

export const InvestigationMap: React.FC<InvestigationMapProps> = ({
  variableId,
  variableName,
  variableUnit,
  datasetName,
  onDatasetClick,
  onInfoClick,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 2.2));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.8));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Variable-specific Legend Labels & Ramp
  const legendConfig = {
    soil_moisture: {
      title: "Soil Moisture",
      unit: "(m³/m³)",
      top: "0.6",
      mid: "0.4",
      bottom: "0.2",
      gradient: "from-[#1e40af] via-[#06b6d4] via-[#eab308] to-[#ea580c]",
    },
    rainfall: {
      title: "Rainfall",
      unit: "(mm/day)",
      top: "4.5",
      mid: "2.5",
      bottom: "1.0",
      gradient: "from-[#4338ca] via-[#38bdf8] via-[#a3e635] to-[#f59e0b]",
    },
    temperature: {
      title: "Temperature",
      unit: "(°C)",
      top: "30",
      mid: "24",
      bottom: "18",
      gradient: "from-[#b91c1c] via-[#ea580c] via-[#eab308] to-[#0284c7]",
    },
    ndvi: {
      title: "NDVI Index",
      unit: "(0–1)",
      top: "0.7",
      mid: "0.4",
      bottom: "0.1",
      gradient: "from-[#047857] via-[#10b981] via-[#ca8a04] to-[#78350f]",
    },
  }[variableId];

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col shadow-xl">
      {/* Map Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3">
        <div className="flex items-center gap-2">
          <MapIcon className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">
            Kenya {variableName} Map
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDatasetClick}
            className="bg-[#131b2e] hover:bg-[#1a253f] border border-slate-700/70 text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>{datasetName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            onClick={onInfoClick}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Dataset Information"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Viewport */}
      <div
        className="relative w-full h-[370px] sm:h-[400px] rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none bg-[#070b14]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transform Container */}
        <div
          className="w-full h-full relative transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* Base ESRI Satellite Imagery */}
          <img
            src="/images/east-africa-satellite.jpg"
            alt="East Africa Satellite Terrain"
            className="w-full h-full object-cover pointer-events-none filter brightness-[0.85] contrast-[1.12]"
          />

          {/* SVG Overlay: Scientific Heatmap, Glowing Kenya Border & Labels */}
          <svg
            viewBox="0 0 1200 900"
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Outer Border Glow Filter */}
              <filter id="border-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#ffffff" floodOpacity="0.85" />
                <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#38bdf8" floodOpacity="0.6" />
              </filter>

              {/* Kenya Boundary Clip Path */}
              <clipPath id="kenya-boundary-clip">
                <path d={KENYA_SVG_PATH} />
              </clipPath>

              {/* Authentic Soil Moisture Multi-Gradient Matching Screenshot */}
              {/* 1. Deep Blue & Cyan in Western Kenya (Lake Victoria basin & highlands) */}
              <radialGradient id="sm-west-lake" cx="37%" cy="46%" r="22%">
                <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#0284c7" stopOpacity="0.9" />
                <stop offset="85%" stopColor="#06b6d4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.75" />
              </radialGradient>

              {/* 2. Central Green & Yellow Band */}
              <radialGradient id="sm-central-green" cx="52%" cy="48%" r="35%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.85" />
                <stop offset="45%" stopColor="#84cc16" stopOpacity="0.85" />
                <stop offset="75%" stopColor="#eab308" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.78" />
              </radialGradient>

              {/* 3. Northeast Orange/Red Arid Region (Wajir, Mandera, Garissa) */}
              <radialGradient id="sm-northeast-arid" cx="68%" cy="32%" r="28%">
                <stop offset="0%" stopColor="#ea580c" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.85" />
                <stop offset="80%" stopColor="#eab308" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#84cc16" stopOpacity="0.65" />
              </radialGradient>

              {/* 4. Southern Tsavo / Magadi Warm Tongue */}
              <radialGradient id="sm-south-tongue" cx="54%" cy="65%" r="22%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.88" />
                <stop offset="50%" stopColor="#eab308" stopOpacity="0.82" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.7" />
              </radialGradient>

              {/* Rainfall Gradients */}
              <radialGradient id="rainfall-gradient" cx="42%" cy="48%" r="40%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="80%" stopColor="#10b981" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.65" />
              </radialGradient>

              {/* Temperature Gradients */}
              <radialGradient id="temp-gradient" cx="60%" cy="32%" r="45%">
                <stop offset="0%" stopColor="#dc2626" stopOpacity="0.88" />
                <stop offset="40%" stopColor="#ea580c" stopOpacity="0.82" />
                <stop offset="75%" stopColor="#eab308" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
              </radialGradient>

              {/* Vegetation NDVI Gradients */}
              <radialGradient id="ndvi-gradient" cx="44%" cy="52%" r="42%">
                <stop offset="0%" stopColor="#047857" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#10b981" stopOpacity="0.82" />
                <stop offset="75%" stopColor="#ca8a04" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#78350f" stopOpacity="0.65" />
              </radialGradient>

              {/* Subtle Grid Pattern for Scientific Overlay */}
              <pattern id="grid-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.7" fill="#ffffff" fillOpacity="0.1" />
              </pattern>
            </defs>

            {/* Scientific Heatmap Layer Clipped to Kenya */}
            <g clipPath="url(#kenya-boundary-clip)">
              {variableId === "soil_moisture" && (
                <>
                  <rect x="0" y="0" width="1200" height="900" fill="url(#sm-central-green)" />
                  <rect x="0" y="0" width="1200" height="900" fill="url(#sm-northeast-arid)" />
                  <rect x="0" y="0" width="1200" height="900" fill="url(#sm-south-tongue)" />
                  <rect x="0" y="0" width="1200" height="900" fill="url(#sm-west-lake)" />
                </>
              )}
              {variableId === "rainfall" && (
                <rect x="0" y="0" width="1200" height="900" fill="url(#rainfall-gradient)" />
              )}
              {variableId === "temperature" && (
                <rect x="0" y="0" width="1200" height="900" fill="url(#temp-gradient)" />
              )}
              {variableId === "ndvi" && (
                <rect x="0" y="0" width="1200" height="900" fill="url(#ndvi-gradient)" />
              )}
              {/* Raster Scan Overlay */}
              <rect x="0" y="0" width="1200" height="900" fill="url(#grid-dots)" />
            </g>

            {/* Glowing White Kenya Boundary Line */}
            <path
              d={KENYA_SVG_PATH}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.8"
              filter="url(#border-glow)"
              className="drop-shadow-lg"
            />

            {/* Surrounding Country Labels (Authentic positions matching screenshot) */}
            <text
              x="330"
              y="240"
              fill="#ffffff"
              fontSize="19"
              fontWeight="600"
              letterSpacing="0.03em"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.95))" }}
            >
              South Sudan
            </text>

            <text
              x="650"
              y="240"
              fill="#ffffff"
              fontSize="19"
              fontWeight="600"
              letterSpacing="0.03em"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.95))" }}
            >
              Ethiopia
            </text>

            <text
              x="840"
              y="420"
              fill="#ffffff"
              fontSize="19"
              fontWeight="600"
              letterSpacing="0.03em"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.95))" }}
            >
              Somalia
            </text>

            <text
              x="380"
              y="480"
              fill="#ffffff"
              fontSize="19"
              fontWeight="600"
              letterSpacing="0.03em"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.95))" }}
            >
              Uganda
            </text>

            <text
              x="450"
              y="780"
              fill="#ffffff"
              fontSize="19"
              fontWeight="600"
              letterSpacing="0.03em"
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.95))" }}
            >
              Tanzania
            </text>

            {/* Prominent Kenya Label In Center of Country */}
            <text
              x="625"
              y="450"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="34"
              fontWeight="800"
              letterSpacing="0.02em"
              style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.95))" }}
            >
              Kenya
            </text>
          </svg>
        </div>

        {/* Inset Left Floating Legend */}
        <div className="absolute top-4 left-4 bg-[#0a0f1d]/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 shadow-2xl pointer-events-auto">
          <div className="text-[11px] font-semibold text-slate-200">{legendConfig.title}</div>
          <div className="text-[10px] text-slate-400 mb-2">{legendConfig.unit}</div>

          <div className="flex items-center gap-2">
            {/* Vertical Color Ramp */}
            <div
              className={`w-3 h-28 rounded-full bg-gradient-to-b ${legendConfig.gradient} shadow-inner border border-white/20`}
            />
            {/* Ticks */}
            <div className="h-28 flex flex-col justify-between text-[10px] text-slate-300 font-mono">
              <span>{legendConfig.top}</span>
              <span>{legendConfig.mid}</span>
              <span>{legendConfig.bottom}</span>
            </div>
          </div>
        </div>

        {/* Inset Bottom-Right Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 pointer-events-auto">
          <div className="bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/60 rounded-lg flex flex-col overflow-hidden shadow-lg">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="h-px bg-slate-700/60" />
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 bg-[#0f172a]/90 backdrop-blur-md border border-slate-700/60 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-lg"
            title="Recenter Map"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
