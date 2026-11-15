"use client";

import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { Download, RefreshCw, Layers, ZoomIn } from "lucide-react";
import { TimeSeriesPoint, TrendResult } from "../../types";

interface TimeSeriesEChartProps {
  series: TimeSeriesPoint[];
  trend: TrendResult & {
    decadalRate?: number;
    confidenceInterval95?: [number, number];
    meanValue?: number;
  };
  variableName: string;
  units: string;
  title?: string;
  onHoverDate?: (date: string) => void;
}

export const TimeSeriesEChart: React.FC<TimeSeriesEChartProps> = ({
  series,
  trend,
  variableName,
  units,
  title,
  onHoverDate,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const [chartMode, setChartMode] = useState<"historical" | "anomalies" | "trend">("trend");
  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);

  useEffect(() => {
    if (!chartRef.current || !series || series.length === 0) return;

    // Dispose existing chart if any
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    const chart = echarts.init(chartRef.current, "dark", {
      renderer: "canvas",
    });
    chartInstanceRef.current = chart;

    const dates = series.map((p) => p.date);
    const rawValues = series.map((p) => p.value);
    const baselines = series.map((p) => p.baseline ?? 0);
    const anomalies = series.map((p) => p.anomaly ?? 0);
    const deseasonalized = series.map((p) => p.deseasonalized ?? p.value);

    // Compute Sen's slope linear regression points
    const n = series.length;
    const meanVal = trend.meanValue ?? rawValues.reduce((a, b) => a + b, 0) / n;
    const midIndex = Math.floor(n / 2);

    const trendLinePoints = series.map((_, idx) => {
      const offsetMonths = idx - midIndex;
      return Number((meanVal + trend.sens_slope * offsetMonths).toFixed(4));
    });

    // 95% Confidence Interval Envelope
    const ciUpper = series.map((_, idx) => {
      const offsetMonths = idx - midIndex;
      const ciRate = trend.confidenceInterval95 ? trend.confidenceInterval95[1] / 12 : trend.sens_slope * 1.3;
      return Number((meanVal + ciRate * offsetMonths + 0.008).toFixed(4));
    });

    const ciLower = series.map((_, idx) => {
      const offsetMonths = idx - midIndex;
      const ciRate = trend.confidenceInterval95 ? trend.confidenceInterval95[0] / 12 : trend.sens_slope * 0.7;
      return Number((meanVal + ciRate * offsetMonths - 0.008).toFixed(4));
    });

    // Build series configuration based on active chartMode
    let seriesConfig: any[] = [];

    if (chartMode === "historical") {
      seriesConfig = [
        {
          name: "Observed Measurements",
          type: "line",
          data: rawValues,
          smooth: 0.2,
          symbol: "circle",
          symbolSize: 4,
          lineStyle: { color: "#00e5ff", width: 2 },
          itemStyle: { color: "#00e5ff" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(0, 229, 255, 0.25)" },
              { offset: 1, color: "rgba(0, 229, 255, 0.01)" },
            ]),
          },
        },
        {
          name: "12-Month Climatological Baseline",
          type: "line",
          data: baselines,
          smooth: true,
          lineStyle: { color: "#94a3b8", width: 1.5, type: "dashed" },
          symbol: "none",
        },
      ];
    } else if (chartMode === "anomalies") {
      seriesConfig = [
        {
          name: "Standardized Monthly Anomaly",
          type: "bar",
          data: anomalies.map((val) => ({
            value: val,
            itemStyle: {
              color: val >= 0 ? "#10b981" : "#ef4444",
            },
          })),
          barWidth: "65%",
        },
      ];
    } else {
      // Trend Mode (Sen's slope regression + confidence envelope)
      seriesConfig = [
        {
          name: "Deseasonalized Observations",
          type: "scatter",
          data: deseasonalized,
          symbolSize: 5,
          itemStyle: {
            color: "#38bdf8",
            opacity: 0.65,
          },
        },
        {
          name: `Sen's Slope Trend Fit (${trend.annual_rate > 0 ? "+" : ""}${trend.annual_rate.toFixed(4)} ${units}/yr)`,
          type: "line",
          data: trendLinePoints,
          lineStyle: {
            color: trend.annual_rate > 0 ? "#10b981" : "#f43f5e",
            width: 3,
            shadowColor: trend.annual_rate > 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)",
            shadowBlur: 10,
          },
          symbol: "none",
        },
      ];

      if (showConfidenceInterval) {
        seriesConfig.push(
          {
            name: "CI Lower Bound",
            type: "line",
            data: ciLower,
            lineStyle: { opacity: 0 },
            stack: "confidence-band",
            symbol: "none",
          },
          {
            name: "95% Confidence Interval Envelope",
            type: "line",
            data: ciUpper.map((upper, i) => upper - ciLower[i]),
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: "rgba(56, 189, 248, 0.12)",
            },
            stack: "confidence-band",
            symbol: "none",
          }
        );
      }
    }

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 800,
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0d1117",
        borderColor: "#27324a",
        textStyle: { color: "#f8fafc", fontFamily: "JetBrains Mono, monospace", fontSize: 11 },
        axisPointer: {
          type: "cross",
          label: { backgroundColor: "#1e293b" },
          lineStyle: { color: "#00e5ff", type: "dashed" },
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const dateStr = params[0].axisValue;
          let tooltipHtml = `<div class="font-bold border-b border-gray-700 pb-1 mb-1 text-white">${dateStr}</div>`;

          params.forEach((p: any) => {
            if (p.seriesName.includes("CI Lower")) return;
            const val = typeof p.value === "number" ? p.value.toFixed(4) : p.value;
            tooltipHtml += `
              <div class="flex items-center justify-between gap-4 py-0.5">
                <span class="flex items-center gap-1.5 text-gray-300">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${p.color}"></span>
                  ${p.seriesName.split("(")[0]}
                </span>
                <span class="font-bold text-white font-mono">${val} ${units}</span>
              </div>
            `;
          });
          return tooltipHtml;
        },
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "15%",
        top: "14%",
        containLabel: true,
      },
      legend: {
        top: "2%",
        left: "center",
        textStyle: { color: "#94a3b8", fontSize: 11 },
        itemGap: 14,
      },
      xAxis: {
        type: "category",
        boundaryGap: chartMode === "anomalies",
        data: dates,
        axisLine: { lineStyle: { color: "#27324a" } },
        axisLabel: {
          color: "#94a3b8",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          formatter: (value: string) => value.slice(0, 7),
        },
      },
      yAxis: {
        type: "value",
        name: units,
        nameTextStyle: { color: "#94a3b8", fontSize: 10, padding: [0, 0, 0, 10] },
        splitLine: { lineStyle: { color: "#1b2232", type: "dashed" } },
        axisLabel: {
          color: "#94a3b8",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
          formatter: (val: number) => val.toFixed(3),
        },
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          bottom: "2%",
          height: 22,
          borderColor: "#1b2232",
          fillerColor: "rgba(0, 229, 255, 0.15)",
          textStyle: { color: "#94a3b8", fontSize: 9 },
          handleStyle: { color: "#00e5ff" },
        },
        {
          type: "inside",
        },
      ],
      series: seriesConfig,
    };

    chart.setOption(option, true);

    chart.on("mouseover", (params: any) => {
      if (onHoverDate && params.name) {
        onHoverDate(params.name);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [series, trend, chartMode, showConfidenceInterval]);

  const handleExportChart = () => {
    if (!chartInstanceRef.current) return;
    const url = chartInstanceRef.current.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#07090e",
    });
    const link = document.createElement("a");
    link.download = `TREND-X_${variableName}_${series[0]?.date}_to_${series[series.length - 1]?.date}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="bg-space-900 border border-space-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Chart Top Bar & Mode Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-space-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-nasa-cyan" />
            {title || `${variableName} Non-Parametric Time Series`}
          </h3>
          <p className="text-xs text-gray-400 font-mono">
            {series.length} Monthly Granules ({series[0]?.date} to {series[series.length - 1]?.date})
          </p>
        </div>

        {/* View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-space-950 p-1 rounded-lg border border-space-800 text-xs font-mono">
            <button
              onClick={() => setChartMode("trend")}
              className={`px-3 py-1 rounded transition-all ${
                chartMode === "trend" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Trend Analysis (Sen's β)
            </button>
            <button
              onClick={() => setChartMode("historical")}
              className={`px-3 py-1 rounded transition-all ${
                chartMode === "historical" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Historical Series
            </button>
            <button
              onClick={() => setChartMode("anomalies")}
              className={`px-3 py-1 rounded transition-all ${
                chartMode === "anomalies" ? "bg-nasa-blue text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Anomalies (±Z)
            </button>
          </div>

          {/* Export PNG */}
          <button
            onClick={handleExportChart}
            title="Export High-Resolution Chart PNG"
            className="p-1.5 rounded-lg bg-space-800 hover:bg-space-700 text-gray-300 hover:text-white border border-space-700 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ECharts Viewport */}
      <div ref={chartRef} className="w-full h-[400px]" />

      {/* Footer Notes */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-500 pt-2 border-t border-space-800/80">
        <div>
          Sen's Slope: <span className="text-white font-bold">{trend.annual_rate > 0 ? "+" : ""}{trend.annual_rate.toFixed(4)} {units}/yr</span>
          {" • "}
          p-value: <span className="text-emerald-400 font-bold">{trend.p_value < 0.001 ? "< 0.001" : trend.p_value.toFixed(4)}</span>
        </div>
        <div className="text-gray-400">
          Scroll to zoom • Drag slider to pan observation window
        </div>
      </div>
    </div>
  );
};
