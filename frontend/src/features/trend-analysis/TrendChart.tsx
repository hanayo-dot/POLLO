import type { CSSProperties } from "react";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { BarChart, LineChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import ReactEChartsCore from "echarts-for-react/lib/core";

echarts.use([BarChart, LineChart, DataZoomComponent, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

export default function TrendChart(props: { option: EChartsOption; notMerge?: boolean; className?: string; style?: CSSProperties }) {
  return <ReactEChartsCore echarts={echarts} {...props} />;
}
