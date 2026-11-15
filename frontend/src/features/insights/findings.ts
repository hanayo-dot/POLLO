import type { fetchTimeSeries } from "../../services/api";
import { variableKind, variableLabel } from "../trend-analysis/variables";

export type Analysis = Awaited<ReturnType<typeof fetchTimeSeries>>;
export type Selection = { region: string; variable: string; start: string; end: string };
export const formatNumber = (value: number) => Number.isFinite(value) ? value.toLocaleString("en", { maximumSignificantDigits: 4 }) : "Unavailable";
export const formatP = (value: number) => value === 0 ? "< 0.000001" : `= ${value < 0.001 ? value.toExponential(2) : formatNumber(value)}`;

export function readSelection(search: string): Selection | null {
  const params = new URLSearchParams(search);
  const region = params.get("region") || "";
  const variable = params.get("variable") || "";
  const start = params.get("start") || "";
  const end = params.get("end") || "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/;
  return region && variable && month.test(start) && month.test(end) && start <= end ? { region, variable, start, end } : null;
}

export function hasTrend(data: Analysis): boolean {
  const trend = data.trend;
  return data.series.some(point => Number.isFinite(point.value)) && !!trend
    && [trend.annual_rate, trend.p_value, trend.sens_slope].every(Number.isFinite)
    && trend.p_value >= 0 && trend.p_value <= 1
    && ["increasing", "decreasing", "neutral"].includes(trend.trend_direction)
    && ["significant", "marginal", "none"].includes(trend.significance);
}

export function describeFindings(data: Analysis) {
  const trend = data.trend!;
  const label = variableLabel(data.variable);
  const significant = trend.significance === "significant";
  const direction = trend.trend_direction;
  const rate = `${formatNumber(trend.annual_rate)} ${trend.units}/year`;
  const significance = significant ? "Significant" : trend.significance === "marginal" ? "Marginal" : "Not significant";
  const evidence = significant ? "The trend meets the 5% significance threshold. This does not establish its cause or predict future conditions." : "The evidence does not meet the 5% significance threshold. A persistent long-term change is uncertain.";
  const measured = `${label} at the reference point in ${data.region.name} ${direction === "neutral" ? "shows no clear directional trend" : `shows ${direction === "increasing" ? "an" : "a"} ${direction} trend`}, with an annual rate of ${rate}.`;
  const simple = `${label} measurements ${direction === "neutral" ? "do not show a clear upward or downward pattern" : direction === "increasing" ? "tend to go up over this period" : "tend to go down over this period"}. The estimated yearly change is ${rate}. ${significant ? "The statistical test supports this pattern, but it cannot tell us why it happened." : "The statistical test does not give strong enough evidence to call this a lasting change."}`;
  const kind = variableKind(data.variable);
  const context = kind === "rainfall"
    ? direction === "decreasing" ? "Lower rainfall could put pressure on crop water supply, water storage and local ecosystems." : direction === "increasing" ? "Higher rainfall could support water supply, while intense rainfall could increase runoff and flood exposure." : "Rainfall variability can affect growing seasons and water storage even without a clear long-term trend."
    : kind === "temperature" ? "Temperature changes can affect evaporation, crop development, heat exposure and ecosystem health."
    : kind === "vegetation" ? "Changes in vegetation greenness can reflect shifts in plant growth, land use or seasonal conditions. Greenness alone does not measure crop yield."
    : kind === "soil-moisture" ? "Soil moisture changes can affect plant water supply, irrigation needs and ecosystem resilience."
    : "Changes in this variable may affect local environmental conditions.";
  return { label, direction, rate, significance, evidence, measured, simple,
    implications: `${context} ${significant ? "These are possible consequences, not measured impacts." : "Because this trend is uncertain, these are areas to investigate rather than conclusions about impacts."}`,
    takeaway: `${measured} ${significant ? "The trend is statistically significant; local impacts need separate evidence." : "A lasting change has not been established at the 5% significance threshold."}` };
}

const escapeHTML = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

/** A self-contained, printable report of the exact response shown on screen. */
export function buildReport(data: Analysis, selection: Selection): string {
  if (!hasTrend(data)) throw new Error("Trend statistics are required to create a report.");
  const findings = describeFindings(data);
  const trend = data.trend!;
  const points = data.series.filter(point => Number.isFinite(point.value)).sort((a, b) => a.date.localeCompare(b.date));
  const min = Math.min(...points.map(point => point.value));
  const max = Math.max(...points.map(point => point.value));
  const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
  const firstMonth = monthIndex(points[0].date);
  const months = Math.max(1, monthIndex(points.at(-1)!.date) - firstMonth);
  const line = points.map(point => `${40 + (monthIndex(point.date) - firstMonth) / months * 920},${220 - (point.value - min) / (max - min || 1) * 190}`).join(" ");
  const e = escapeHTML;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>POLLO Insights Report</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:24px;color:#142537}h1,h2{color:#09667b}section{margin:28px 0}dt{font-weight:bold}dd{margin:0 0 12px}table{border-collapse:collapse;width:100%}td,th{padding:6px;border-bottom:1px solid #ccc;text-align:left}svg{width:100%;height:auto}small{color:#475569}@media print{body{margin:0}section{break-inside:avoid}}</style><h1>Key Discoveries from Your Investigation</h1><p>${e(findings.label)} · ${e(data.region.name)} · Requested period: ${e(selection.start)} – ${e(selection.end)}</p><p>Available record: ${e(trend.start_date)} – ${e(trend.end_date)} · ${e(trend.data_points)} measurements</p><small>Generated ${e(new Date().toISOString())}. Data-based summary; no AI service used.</small><section><h2>Key findings</h2><p>${e(findings.measured)}</p><p>${e(findings.evidence)}</p><p>${e(trend.interpretation)}</p><dl>${Object.entries(trend).map(([key, value]) => `<dt>${e(key.replaceAll("_", " "))}</dt><dd>${e(value)}</dd>`).join("")}</dl></section><section><h2>What this means</h2><p>${e(findings.implications)}</p><h2>Why it matters</h2><p>Food security, water availability and community livelihoods may be sensitive to environmental change. This analysis does not directly measure those impacts.</p><h2>Key takeaway</h2><p>${e(findings.takeaway)}</p></section><section><h2>Monthly measurements (${e(data.variable.units)})</h2><svg role="img" aria-label="Monthly measurements over the available record" viewBox="0 0 1000 270"><path d="M40 20V230H960" fill="none" stroke="#94a3b8"/><polyline points="${line}" fill="none" stroke="#087c9a" stroke-width="2"/><text x="40" y="255">${e(points[0].date.slice(0, 7))}</text><text x="880" y="255">${e(points.at(-1)!.date.slice(0, 7))}</text><text x="40" y="16">${e(formatNumber(max))}</text><text x="40" y="225">${e(formatNumber(min))}</text></svg></section><section><h2>Source and limitations</h2><p>${e(data.source?.name || data.variable.producing_org)} · ${e(data.variable.name)} · ${e(data.variable.spatial_resolution)}</p><p>${e(data.source?.url || "")} · Retrieved: ${e(data.source?.retrieved_at || "Not supplied")} · Missing months: ${e(data.source?.missing_months ?? "Not supplied")}</p><p>${e(data.source?.description || "")}</p><p>Reference grid cell, not a whole-region average. Two-sided Mann–Kendall test and Sen’s slope on monthly measurements, without seasonal adjustment. Seasonal cycles, missing data and serial correlation can affect inference. Annual rate describes change in the original monthly measurement units per year, not annual accumulated totals. No causal attribution or forecast is made.</p></section><h2>Measurements</h2><table><thead><tr><th>Date</th><th>Value (${e(data.variable.units)})</th></tr></thead><tbody>${points.map(point => `<tr><td>${e(point.date)}</td><td>${e(point.value)}</td></tr>`).join("")}</tbody></table></html>`;
}
