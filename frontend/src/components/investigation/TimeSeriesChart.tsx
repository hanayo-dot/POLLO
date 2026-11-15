"use client";

import React, { useState } from "react";
import { BarChart2 } from "lucide-react";

export interface TimeSeriesDataPoint {
  year: number;
  value: number;
  stdDev: number;
  trend: number;
}

interface TimeSeriesChartProps {
  variableId: "soil_moisture" | "rainfall" | "temperature" | "ndvi";
  variableUnit: string;
  regionLabel?: string;
  customData?: TimeSeriesDataPoint[];
  customYMin?: number;
  customYMax?: number;
  customTicks?: number[];
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  variableId,
  variableUnit,
  regionLabel = "Regional",
  customData,
  customYMin,
  customYMax,
  customTicks,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Default fallback datasets
  const datasetMap: Record<
    "soil_moisture" | "rainfall" | "temperature" | "ndvi",
    {
      yMin: number;
      yMax: number;
      ticks: number[];
      data: TimeSeriesDataPoint[];
    }
  > = {
    soil_moisture: {
      yMin: 0.2,
      yMax: 0.6,
      ticks: [0.6, 0.4, 0.2],
      data: [
        { year: 2000, value: 0.28, stdDev: 0.05, trend: 0.29 },
        { year: 2002, value: 0.31, stdDev: 0.05, trend: 0.31 },
        { year: 2004, value: 0.35, stdDev: 0.06, trend: 0.33 },
        { year: 2005, value: 0.39, stdDev: 0.06, trend: 0.34 },
        { year: 2006, value: 0.38, stdDev: 0.06, trend: 0.35 },
        { year: 2008, value: 0.31, stdDev: 0.05, trend: 0.37 },
        { year: 2010, value: 0.36, stdDev: 0.05, trend: 0.38 },
        { year: 2012, value: 0.39, stdDev: 0.06, trend: 0.4 },
        { year: 2014, value: 0.37, stdDev: 0.05, trend: 0.41 },
        { year: 2015, value: 0.41, stdDev: 0.06, trend: 0.42 },
        { year: 2016, value: 0.43, stdDev: 0.06, trend: 0.43 },
        { year: 2018, value: 0.46, stdDev: 0.07, trend: 0.45 },
        { year: 2020, value: 0.49, stdDev: 0.07, trend: 0.47 },
        { year: 2022, value: 0.46, stdDev: 0.06, trend: 0.48 },
        { year: 2024, value: 0.49, stdDev: 0.06, trend: 0.49 },
        { year: 2025, value: 0.5, stdDev: 0.06, trend: 0.5 },
      ],
    },
    rainfall: {
      yMin: 1.0,
      yMax: 4.5,
      ticks: [4.5, 2.5, 1.0],
      data: [
        { year: 2000, value: 2.1, stdDev: 0.35, trend: 2.2 },
        { year: 2002, value: 2.3, stdDev: 0.38, trend: 2.3 },
        { year: 2004, value: 2.6, stdDev: 0.42, trend: 2.4 },
        { year: 2005, value: 2.9, stdDev: 0.45, trend: 2.5 },
        { year: 2006, value: 3.1, stdDev: 0.48, trend: 2.6 },
        { year: 2008, value: 2.2, stdDev: 0.36, trend: 2.7 },
        { year: 2010, value: 2.7, stdDev: 0.41, trend: 2.8 },
        { year: 2012, value: 2.9, stdDev: 0.44, trend: 2.9 },
        { year: 2014, value: 2.4, stdDev: 0.38, trend: 3.0 },
        { year: 2015, value: 3.0, stdDev: 0.45, trend: 3.05 },
        { year: 2016, value: 2.8, stdDev: 0.42, trend: 3.1 },
        { year: 2018, value: 3.4, stdDev: 0.5, trend: 3.2 },
        { year: 2020, value: 3.8, stdDev: 0.55, trend: 3.3 },
        { year: 2022, value: 2.7, stdDev: 0.4, trend: 3.35 },
        { year: 2024, value: 3.3, stdDev: 0.48, trend: 3.45 },
        { year: 2025, value: 3.5, stdDev: 0.5, trend: 3.5 },
      ],
    },
    temperature: {
      yMin: 22.0,
      yMax: 26.0,
      ticks: [26.0, 24.0, 22.0],
      data: [
        { year: 2000, value: 23.1, stdDev: 0.3, trend: 23.2 },
        { year: 2002, value: 23.3, stdDev: 0.3, trend: 23.35 },
        { year: 2004, value: 23.4, stdDev: 0.32, trend: 23.5 },
        { year: 2005, value: 23.6, stdDev: 0.32, trend: 23.6 },
        { year: 2006, value: 23.8, stdDev: 0.35, trend: 23.7 },
        { year: 2008, value: 23.6, stdDev: 0.3, trend: 23.8 },
        { year: 2010, value: 24.1, stdDev: 0.36, trend: 24.0 },
        { year: 2012, value: 23.9, stdDev: 0.34, trend: 24.1 },
        { year: 2014, value: 24.0, stdDev: 0.35, trend: 24.25 },
        { year: 2015, value: 24.3, stdDev: 0.37, trend: 24.3 },
        { year: 2016, value: 24.5, stdDev: 0.38, trend: 24.4 },
        { year: 2018, value: 24.4, stdDev: 0.36, trend: 24.55 },
        { year: 2020, value: 24.7, stdDev: 0.4, trend: 24.7 },
        { year: 2022, value: 24.6, stdDev: 0.38, trend: 24.8 },
        { year: 2024, value: 24.9, stdDev: 0.4, trend: 24.9 },
        { year: 2025, value: 25.0, stdDev: 0.4, trend: 25.0 },
      ],
    },
    ndvi: {
      yMin: 0.2,
      yMax: 0.6,
      ticks: [0.6, 0.4, 0.2],
      data: [
        { year: 2000, value: 0.36, stdDev: 0.04, trend: 0.37 },
        { year: 2002, value: 0.38, stdDev: 0.04, trend: 0.38 },
        { year: 2004, value: 0.41, stdDev: 0.05, trend: 0.39 },
        { year: 2005, value: 0.44, stdDev: 0.05, trend: 0.4 },
        { year: 2006, value: 0.43, stdDev: 0.05, trend: 0.41 },
        { year: 2008, value: 0.37, stdDev: 0.04, trend: 0.42 },
        { year: 2010, value: 0.42, stdDev: 0.04, trend: 0.43 },
        { year: 2012, value: 0.44, stdDev: 0.05, trend: 0.44 },
        { year: 2014, value: 0.4, stdDev: 0.04, trend: 0.45 },
        { year: 2015, value: 0.45, stdDev: 0.05, trend: 0.46 },
        { year: 2016, value: 0.46, stdDev: 0.05, trend: 0.47 },
        { year: 2018, value: 0.48, stdDev: 0.06, trend: 0.48 },
        { year: 2020, value: 0.51, stdDev: 0.06, trend: 0.49 },
        { year: 2022, value: 0.47, stdDev: 0.05, trend: 0.5 },
        { year: 2024, value: 0.5, stdDev: 0.05, trend: 0.51 },
        { year: 2025, value: 0.52, stdDev: 0.05, trend: 0.52 },
      ],
    },
  };

  const defaultConf = datasetMap[variableId];
  const data = customData && customData.length > 0 ? customData : defaultConf.data;
  const yMin = customYMin !== undefined ? customYMin : defaultConf.yMin;
  const yMax = customYMax !== undefined ? customYMax : defaultConf.yMax;
  const ticks = customTicks !== undefined && customTicks.length > 0 ? customTicks : defaultConf.ticks;

  // SVG Chart Geometry
  const width = 760;
  const height = 180;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const startYear = 2000;
  const endYear = 2025;

  const getX = (year: number) => padLeft + ((year - startYear) / (endYear - startYear)) * chartW;
  const getY = (val: number) => padTop + chartH - ((val - yMin) / (yMax - yMin)) * chartH;

  // Build SVG Path for Average line
  const linePath = data
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${getX(pt.year).toFixed(1)} ${getY(pt.value).toFixed(1)}`)
    .join(" ");

  // Build SVG Ribbon Path for ±1 Std Dev
  const upperPoints = data.map((pt) => ({ x: getX(pt.year), y: getY(Math.min(yMax, pt.value + pt.stdDev)) }));
  const lowerPoints = data.map((pt) => ({ x: getX(pt.year), y: getY(Math.max(yMin, pt.value - pt.stdDev)) }));

  const ribbonPath =
    upperPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    " " +
    lowerPoints
      .reverse()
      .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ") +
    " Z";

  // Trend Line endpoints
  const trendStartX = getX(data[0].year);
  const trendStartY = getY(data[0].trend);
  const trendEndX = getX(data[data.length - 1].year);
  const trendEndY = getY(data[data.length - 1].trend);

  const xTickYears = [2000, 2005, 2010, 2015, 2020, 2025];

  return (
    <div className="bg-[#0b101d] border border-slate-800/80 rounded-2xl p-4 flex flex-col shadow-xl">
      {/* Chart Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 mb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide">Time Series Analysis</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
            <span>{regionLabel} Average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600/40 border border-blue-500/50" />
            <span>±1 Std Dev</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-white" />
            <span>Trend Line</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines & Y-axis Ticks */}
          {ticks.map((t) => {
            const y = getY(t);
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {t.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X-axis Ticks */}
          {xTickYears.map((year) => {
            const x = getX(year);
            return (
              <g key={year}>
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  {year}
                </text>
              </g>
            );
          })}

          {/* ±1 Std Dev Ribbon */}
          <path d={ribbonPath} fill="#2563eb" fillOpacity="0.22" className="transition-all duration-300" />

          {/* Dashed White Trend Line */}
          <line
            x1={trendStartX}
            y1={trendStartY}
            x2={trendEndX}
            y2={trendEndY}
            stroke="#ffffff"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />

          {/* Solid Blue Average Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="filter drop-shadow-[0_2px_4px_rgba(56,189,248,0.4)]"
          />

          {/* Interactive Data Points & Hover Targets */}
          {data.map((pt, i) => {
            const cx = getX(pt.year);
            const cy = getY(pt.value);
            const isHovered = hoverIndex === i;

            return (
              <g
                key={pt.year}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#38bdf8"
                  stroke="#0b101d"
                  strokeWidth="1.5"
                  className="transition-all duration-150"
                />
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={9}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeOpacity="0.8"
                    className="animate-ping"
                  />
                )}
                <circle cx={cx} cy={cy} r={14} fill="transparent" />
              </g>
            );
          })}

          {/* Hover Vertical Guide */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(data[hoverIndex].year)}
                y1={padTop}
                x2={getX(data[hoverIndex].year)}
                y2={height - padBottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip HTML */}
        {hoverIndex !== null && (
          <div
            className="absolute -top-1 pointer-events-none bg-[#0a0f1d]/95 backdrop-blur-md border border-blue-500/40 rounded-lg px-2.5 py-1.5 shadow-xl text-[11px] text-white transition-all transform -translate-x-1/2"
            style={{
              left: `${(getX(data[hoverIndex].year) / width) * 100}%`,
            }}
          >
            <div className="font-semibold text-blue-300">{data[hoverIndex].year}</div>
            <div className="flex items-center gap-2 text-slate-200">
              <span>{regionLabel}:</span>
              <span className="font-mono font-medium text-white">
                {data[hoverIndex].value} {variableUnit}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Trend: {data[hoverIndex].trend} {variableUnit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
