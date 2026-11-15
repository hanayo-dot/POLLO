"use client";

import React from "react";

interface TrendSparklineProps {
  variableId: "soil_moisture" | "rainfall" | "temperature" | "ndvi";
  customValues?: Array<{ x: number; y: number }>;
  customYMin?: number;
  customYMax?: number;
  customTicks?: number[];
}

export const TrendSparkline: React.FC<TrendSparklineProps> = ({
  variableId,
  customValues,
  customYMin,
  customYMax,
  customTicks,
}) => {
  // Mini dataset matching time series
  const dataMap = {
    soil_moisture: {
      yMin: 0.2,
      yMax: 0.6,
      ticks: [0.6, 0.4, 0.2],
      values: [
        { x: 2000, y: 0.28 },
        { x: 2002, y: 0.31 },
        { x: 2004, y: 0.35 },
        { x: 2005, y: 0.39 },
        { x: 2006, y: 0.38 },
        { x: 2008, y: 0.31 },
        { x: 2010, y: 0.36 },
        { x: 2012, y: 0.39 },
        { x: 2014, y: 0.37 },
        { x: 2015, y: 0.41 },
        { x: 2016, y: 0.43 },
        { x: 2018, y: 0.46 },
        { x: 2020, y: 0.49 },
        { x: 2022, y: 0.46 },
        { x: 2024, y: 0.49 },
        { x: 2025, y: 0.5 },
      ],
    },
    rainfall: {
      yMin: 1.0,
      yMax: 4.5,
      ticks: [4.5, 2.5, 1.0],
      values: [
        { x: 2000, y: 2.1 },
        { x: 2002, y: 2.3 },
        { x: 2004, y: 2.6 },
        { x: 2005, y: 2.9 },
        { x: 2006, y: 3.1 },
        { x: 2008, y: 2.2 },
        { x: 2010, y: 2.7 },
        { x: 2012, y: 2.9 },
        { x: 2014, y: 2.4 },
        { x: 2015, y: 3.0 },
        { x: 2016, y: 2.8 },
        { x: 2018, y: 3.4 },
        { x: 2020, y: 3.8 },
        { x: 2022, y: 2.7 },
        { x: 2024, y: 3.3 },
        { x: 2025, y: 3.5 },
      ],
    },
    temperature: {
      yMin: 22.0,
      yMax: 26.0,
      ticks: [26.0, 24.0, 22.0],
      values: [
        { x: 2000, y: 23.1 },
        { x: 2002, y: 23.3 },
        { x: 2004, y: 23.4 },
        { x: 2005, y: 23.6 },
        { x: 2006, y: 23.8 },
        { x: 2008, y: 23.6 },
        { x: 2010, y: 24.1 },
        { x: 2012, y: 23.9 },
        { x: 2014, y: 24.0 },
        { x: 2015, y: 24.3 },
        { x: 2016, y: 24.5 },
        { x: 2018, y: 24.4 },
        { x: 2020, y: 24.7 },
        { x: 2022, y: 24.6 },
        { x: 2024, y: 24.9 },
        { x: 2025, y: 25.0 },
      ],
    },
    ndvi: {
      yMin: 0.2,
      yMax: 0.6,
      ticks: [0.6, 0.4, 0.2],
      values: [
        { x: 2000, y: 0.36 },
        { x: 2002, y: 0.38 },
        { x: 2004, y: 0.41 },
        { x: 2005, y: 0.44 },
        { x: 2006, y: 0.43 },
        { x: 2008, y: 0.37 },
        { x: 2010, y: 0.42 },
        { x: 2012, y: 0.44 },
        { x: 2014, y: 0.4 },
        { x: 2015, y: 0.45 },
        { x: 2016, y: 0.46 },
        { x: 2018, y: 0.48 },
        { x: 2020, y: 0.51 },
        { x: 2022, y: 0.47 },
        { x: 2024, y: 0.5 },
        { x: 2025, y: 0.52 },
      ],
    },
  }[variableId];

  const yMin = customYMin !== undefined ? customYMin : dataMap.yMin;
  const yMax = customYMax !== undefined ? customYMax : dataMap.yMax;
  const ticks = customTicks && customTicks.length > 0 ? customTicks : dataMap.ticks;
  const values = customValues && customValues.length > 0 ? customValues : dataMap.values;

  const width = 280;
  const height = 95;
  const padLeft = 28;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 20;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const startX = values[0]?.x || 2000;
  const endX = values[values.length - 1]?.x || 2025;

  const getX = (year: number) => padLeft + ((year - startX) / (endX - startX || 1)) * chartW;
  const getY = (val: number) => padTop + chartH - ((val - yMin) / (yMax - yMin || 1)) * chartH;

  const path = values
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.x).toFixed(1)} ${getY(p.y).toFixed(1)}`)
    .join(" ");

  const xTicks = [2000, 2005, 2010, 2015, 2020, 2025];

  return (
    <div className="w-full my-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
        {/* Y-axis Ticks */}
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
                strokeDasharray="2 2"
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                fill="#64748b"
                fontSize="9"
                fontFamily="monospace"
              >
                {t.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X-axis Ticks */}
        {xTicks.map((year) => {
          const x = getX(year);
          return (
            <text
              key={year}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fill="#64748b"
              fontSize="9"
              fontFamily="sans-serif"
            >
              {year}
            </text>
          );
        })}

        {/* Sparkline Curve */}
        <path
          d={path}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="filter drop-shadow-[0_1px_3px_rgba(56,189,248,0.5)]"
        />

        {/* Sparkline Points */}
        {values.map((p) => (
          <circle
            key={p.x}
            cx={getX(p.x)}
            cy={getY(p.y)}
            r={2.2}
            fill="#38bdf8"
            stroke="#0b101d"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
};
