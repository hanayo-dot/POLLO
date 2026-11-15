"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";


import type { EChartsOption } from "echarts";
import { gsap } from "gsap";
import { ArrowDownRight, ArrowUpRight, ArrowUpDown, CalendarDays, ChartColumn, ChartLine, ChartArea, Check, ChevronDown, CloudRain, FlaskConical, FileText, Lightbulb, LoaderCircle, MapPin, Minus, RefreshCw, Sparkles, House, Search, Database, Bell, CircleUserRound, X, Thermometer, Sprout, Waves } from "lucide-react";
import { fetchDatasets, fetchRegions, fetchTimeSeries } from "../../services/api";
import type { DatasetVariable, Region } from "../../types";
import { VariableIllustration } from "./VariableIllustration";
import { variableKind, variableLabel, variableOptions } from "./variables";
import "./trend-analysis.css";
import { readSelection } from "../insights/findings";
import type { Selection } from "../insights/findings";

const ReactECharts = lazy(() => import("./TrendChart"));
type Result = Awaited<ReturnType<typeof fetchTimeSeries>>;
const number = (value: number) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumSignificantDigits: 4 }) : "Unavailable";
const probability = (value: number) => value === 0 ? "< 0.000001" : value < 0.001 ? value.toExponential(2) : number(value);
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); const mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };

export default function TrendAnalysis() {
  const root = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [datasets, setDatasets] = useState<DatasetVariable[]>([]);
  const [region, setRegion] = useState("");
  const [variable, setVariable] = useState("");
  const [start, setStart] = useState("2000-01");
  const [end, setEnd] = useState("2024-12");
  const [result, setResult] = useState<Result | null>(null);
  const [resultSelection, setResultSelection] = useState<Selection | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"line" | "bar" | "area">("line");
  const [section, setSection] = useState<string | null>(null);
  const [menu, setMenu] = useState<"notifications" | "profile" | null>(null);
  const available = variableOptions(datasets, region);
  const activeChoice = available.find(choice => choice.id === variable);
  const selectedKind = activeChoice?.kind || "rainfall";
  const unavailable = !catalogLoading && !!activeChoice && !activeChoice.dataset;
  const icons = { temperature: Thermometer, rainfall: CloudRain, vegetation: Sprout, "soil-moisture": Waves };
  const SelectionIcon = icons[selectedKind];
  const ResultIcon = icons[result ? variableKind(result.variable) || selectedKind : selectedKind];

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchRegions(), fetchDatasets()]).then(async ([r, d]) => {
      if (!mounted) return;
      const observed = d.filter(v => ["ERA5_TEMP", "ERA5_RAIN", "ERA5_SOIL", "MODIS_NDVI"].includes(v.id));
      setRegions(r); setDatasets(observed);
      const selection = readSelection(window.location.search);
      const initialRegion = r.find(item => item.id === selection?.region) || r[0];
      setRegion(initialRegion?.id || "");
      const initialStart = selection?.start || "2000-01";
      const initialEnd = selection?.end || "2024-12";
      setStart(initialStart); setEnd(initialEnd);
      const initialOptions = variableOptions(observed, initialRegion?.id || "");
      const initialVariable = initialOptions.find(v => v.id === selection?.variable && v.dataset)?.id || (initialOptions.find(v => v.kind === "rainfall" && v.dataset) || initialOptions.find(v => v.dataset))?.id || "rainfall";
      setVariable(initialVariable);
      if (!initialRegion || !initialOptions.find(v => v.id === initialVariable)?.dataset) return;
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      try {
        const data = await fetchTimeSeries(initialRegion.id, initialVariable, false, { start: initialStart, end: initialEnd, signal: controller.signal });
        if (mounted) { setResult({ ...data, series: (data.series || []).filter(p => Number.isFinite(p.value)).sort((a, b) => a.date.localeCompare(b.date)) }); setResultSelection({ region: initialRegion.id, variable: initialVariable, start: initialStart, end: initialEnd }); }
      } catch (err) {
        if (mounted && !controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load the initial analysis.");
      } finally { if (mounted) setLoading(false); }
    }).catch(() => { if (mounted) setError("Could not load the analysis catalog."); })
      .finally(() => { if (mounted) setCatalogLoading(false); });
    return () => { mounted = false; request.current?.abort(); };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => { gsap.from(".trend-reveal", { y: 12, duration: 0.55, stagger: 0.09, ease: "power2.out", clearProps: "all" }); }, root);
    return () => context.revert();
  }, []);

  async function run() {
    if (!region || !variable || !start || !end || start > end || !activeChoice?.dataset) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await fetchTimeSeries(region, variable, false, { start, end, signal: controller.signal });
      if (!controller.signal.aborted) { setResult({ ...data, series: (data.series || []).filter(p => Number.isFinite(p.value)).sort((a, b) => a.date.localeCompare(b.date)) }); setResultSelection({ region, variable, start, end }); }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  const points = result?.series || [];
  const trend = points.length ? result?.trend : undefined;
  const units = result?.variable.units || "";
  const direction = trend?.trend_direction;
  const DirectionIcon = direction === "decreasing" ? ArrowDownRight : direction === "increasing" ? ArrowUpRight : Minus;
  const option = useMemo<EChartsOption>(() => {
    if (!result?.series.length) return {};
    const data = result.series;
    // The backend's Sen slope is per monthly sample. The intercept is the
    // median residual; this visual fit does not recalculate inferential stats.
    const slope = result.trend?.sens_slope;
    const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
    const elapsed = data.map(p => monthIndex(p.date) - monthIndex(data[0].date));
    const intercept = slope === undefined ? 0 : median(data.map((p, i) => p.value - slope * elapsed[i]));
    return {
      backgroundColor: "transparent", textStyle: { color: "#d6e8f7", fontFamily: "Arial, sans-serif", fontSize: 14 },
      animationDuration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450,
      media: [{ query: { maxWidth: 500 }, option: { legend: { textStyle: { fontSize: 11 }, itemGap: 12, itemWidth: 20 }, grid: { left: 48, right: 14, bottom: 68 } } }],
      tooltip: { trigger: "axis", confine: true, backgroundColor: "#071d32", borderColor: "#4bc9e4", textStyle: { color: "#fff" }, valueFormatter: value => `${number(Number(value))} ${result.variable.units}` },
      legend: { bottom: 2, textStyle: { color: "#e4edf8", fontSize: 14 }, itemGap: 32 },
      grid: { left: 72, right: 24, top: 22, bottom: 65 },
      xAxis: { type: "category", data: data.map(p => p.date.slice(0, 7)), boundaryGap: view === "bar", axisLine: { lineStyle: { color: "#8aa3bb" } }, axisLabel: { color: "#e4edf8", hideOverlap: true, showMaxLabel: true, interval: Math.max(0, Math.ceil(data.length / 6) - 1), formatter: (value: string) => data.length > 36 ? value.slice(0, 4) : value }, splitLine: { show: true, interval: Math.max(0, Math.ceil(data.length / 6) - 1), lineStyle: { color: "#1a3b53" } } },
      yAxis: { type: "value", scale: true, name: result.variable.units, nameTextStyle: { color: "#cadfeb" }, axisLabel: { color: "#e4edf8" }, splitLine: { lineStyle: { color: "#1a3b53" } } },
      dataZoom: [{ type: "inside" }, { type: "slider", bottom: 32, height: 10, borderColor: "#204967", fillerColor: "#00e5ff22", textStyle: { color: "#9bb6ce" }, handleStyle: { color: "#00dded" } }],
      series: [{ name: "Monthly measurement", type: view === "bar" ? "bar" : "line", data: data.map(p => p.value), showSymbol: data.length < 60, symbolSize: 6, itemStyle: { color: "#00eeee" }, lineStyle: { width: 2 }, ...(view !== "bar" ? { areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: view === "area" ? "#00dcdca0" : "#00dcdc70" }, { offset: 1, color: "#00dcdc08" }] } } } : {}) }, ...(slope === undefined ? [] : [{ name: "Sen’s trend line", type: "line" as const, data: data.map((_, i) => intercept + slope * elapsed[i]), symbol: "none", lineStyle: { color: "#00d9ff", type: "dashed" as const, width: 2 }, itemStyle: { color: "#00d9ff" } }])],
    };
  }, [result, view]);

  const comparison = useMemo(() => {
    if (points.length < 2) return null;
    const middle = Math.floor(points.length / 2);
    const mean = (values: typeof points) => values.reduce((sum, p) => sum + p.value, 0) / values.length;
    return { early: mean(points.slice(0, middle)), late: mean(points.slice(middle)), split: points[middle].date.slice(0, 7) };
  }, [points]);
  const invalidRange = !start || !end || start > end;

  const selectedRegion = regions.find(r => r.id === region);
  const title = result ? `${variableLabel(result.variable)} Trend in ${result.region.name}` : "Explore your climate story";
  const showSection = (name: string) => { setSection(name); document.getElementById("trend-details")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }); };

  return <div ref={root} className="trend-page">
    <div className="trend-space-art" aria-hidden="true" />
    <nav className="trend-navigation" aria-label="Main navigation">
      <a href="/dashboard" className="trend-brand" aria-label="POLLO home">
        <svg viewBox="0 0 70 52" width="60" height="46" fill="none" aria-hidden="true"><circle cx="34" cy="26" r="21" stroke="#00e9f0" strokeWidth="1.8" /><path d="M19 23c1-9 8-15 16-14M22 42c8 7 19 5 25-2" stroke="#00c8f0" strokeWidth="2" strokeLinecap="round" /><ellipse cx="34" cy="27" rx="33" ry="9" transform="rotate(-25 34 27)" stroke="#00eff4" strokeWidth="1.8" /><path d="m51 11 5 1-3 4" stroke="#00eff4" strokeWidth="1.5" /></svg>
        <span>POLLO</span>
      </a>
      <div className="trend-nav-links">
        <a href="/dashboard"><House /><span>Home</span></a>
        <a href="#analysis-controls"><Search /><span>Investigate</span></a>
        <a href="#trend-chart"><ChartColumn /><span>Visualise</span></a>
        <a href="#trend-chart" className="active" aria-current="page"><ChartLine /><span>Trend Analysis</span></a>
        <a aria-label="Insights" href={result && resultSelection ? `/insights?${new URLSearchParams(resultSelection)}` : "/insights"}><Lightbulb /><span>Insights</span></a>
        <button type="button" onClick={() => showSection("Data Sources")}><Database /><span>Data Sources</span></button>
      </div>
      <div className="trend-nav-actions">
        <label className="trend-location"><MapPin size={21} /><select aria-label="Region" value={region} disabled={catalogLoading || loading} onChange={e => {
          const id = e.target.value; setRegion(id); setResult(null); setError("");
          const next = variableOptions(datasets, id);
          setVariable(next.find(choice => choice.kind === selectedKind)?.id || "rainfall");
        }}>{regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        <button type="button" className="trend-icon-button" aria-label="Analysis notifications" aria-expanded={menu === "notifications"} onClick={() => setMenu(menu === "notifications" ? null : "notifications")}><Bell /></button>
        <button type="button" className="trend-icon-button" aria-label="Workspace menu" aria-expanded={menu === "profile"} onClick={() => setMenu(menu === "profile" ? null : "profile")}><CircleUserRound /></button>
      </div>
      {menu && <div className="trend-nav-popover"><button type="button" className="float-right" aria-label="Close menu" onClick={() => setMenu(null)}><X size={18} /></button><h2>{menu === "notifications" ? "Analysis updates" : "POLLO"}</h2><p>{menu === "notifications" ? loading ? "Your analysis is running…" : error || (result ? `Analysis ready for ${result.region.name}.` : "Choose a variable and run your first analysis.") : "Your climate exploration workspace."}</p>{menu === "profile" && <a href="/dashboard">Go to dashboard →</a>}</div>}
    </nav>

    <div className="trend-content">
      <header className="trend-hero trend-reveal">
        <p className="trend-eyebrow">TREND ANALYSIS</p>
        <h1>What’s <em className="trend-changing">Changing</em> Over Time?</h1>
        <p className="trend-intro">Uncover long-term patterns, the direction of change, and whether it’s statistically significant.</p>
      </header>

      <form id="analysis-controls" onSubmit={e => { e.preventDefault(); void run(); }} className="trend-panel trend-controls trend-reveal">
        <label className="trend-control trend-variable"><SelectionIcon size={34} /><span><span className="trend-control-label">Climate Variable</span><select aria-label="Climate variable" value={variable} disabled={catalogLoading || loading} onChange={e => { setVariable(e.target.value); setResult(null); setError(""); }}>{available.map(choice => <option key={choice.kind} value={choice.id}>{choice.label}</option>)}</select></span><ChevronDown size={22} /></label>
        <span className="trend-control-divider" aria-hidden="true" />
        <details className="trend-date-picker">
          <summary className="trend-control"><CalendarDays size={32} /><span><span className="trend-control-label">Time Range</span><strong>{start.slice(0, 4) || "Start"} – {end.slice(0, 4) || "End"}</strong></span><ChevronDown size={22} /></summary>
          <div className="trend-date-popover"><p>Select the historical period</p><label>From<input aria-label="Start month" type="month" required value={start} disabled={loading} onChange={e => setStart(e.target.value)} /></label><label>To<input aria-label="End month" type="month" required min={start} value={end} disabled={loading} onChange={e => setEnd(e.target.value)} /></label>{invalidRange && <p role="alert" className="text-rose-300">The end must be on or after the start.</p>}<button type="button" onClick={e => e.currentTarget.closest("details")?.removeAttribute("open")}>Apply range <Check size={16} /></button></div>
        </details>
        <button className="trend-run" disabled={loading || catalogLoading || invalidRange || !variable || !region || unavailable} type="submit">{loading ? <LoaderCircle className="animate-spin" size={28} /> : <RefreshCw size={28} />}<span>{loading ? "Analysing…" : "Run Analysis"}</span><span className="trend-button-spark" aria-hidden="true">✳</span></button>
      </form>
      {unavailable && <p role="status" className="trend-unavailable">{activeChoice.label} data is not available for this region yet. Choose another variable to run an analysis.</p>}
      {invalidRange && <p role="alert" className="trend-inline-error">Choose a valid start and end month.</p>}
      {error && <div role="alert" className="trend-error">{error}<button type="button" onClick={() => void run()}>Retry analysis</button></div>}

      <div className="trend-results-grid">
        <section id="trend-chart" className="trend-panel trend-chart-card trend-reveal" aria-busy={loading}>
          <div className="trend-chart-heading"><ResultIcon size={52} className="trend-weather-icon" /><div><h2>{title}</h2><p>{result ? `Monthly measurements (${points[0]?.date.slice(0, 4) || start.slice(0, 4)} – ${points.at(-1)?.date.slice(0, 4) || end.slice(0, 4)})` : `${selectedRegion?.name || "Select a region"} · historical measurements`}</p></div><div role="group" aria-label="Chart style" className="trend-chart-toggle">{([{ id: "line", icon: ChartLine }, { id: "bar", icon: ChartColumn }, { id: "area", icon: ChartArea }] as const).map(({ id, icon: Icon }) => <button type="button" key={id} aria-label={`${id} chart`} aria-pressed={view === id} onClick={() => setView(id)} className={view === id ? "active" : ""}><Icon size={24} /></button>)}</div></div>
          {loading ? <div role="status" className="trend-chart-placeholder"><LoaderCircle size={34} className="animate-spin" /><p>Reading the climate record…</p><span>Vegetation requests can take a few minutes.</span><button type="button" className="rounded-full border border-cyan-400/50 px-5 py-2 text-sm" onClick={() => { request.current?.abort(); setLoading(false); setCatalogLoading(false); }}>Cancel analysis</button></div> : points.length ? <Suspense fallback={<div className="trend-chart-placeholder">Preparing chart…</div>}><ReactECharts option={option} notMerge className="trend-echart" style={{ height: 285, width: "100%" }} /></Suspense> : <div role="status" className="trend-chart-placeholder"><ChartLine size={42} /><p>{unavailable ? `${activeChoice.label} data is not available yet.` : result ? "No measurements available for this period." : "Your climate story starts here."}</p><span>{unavailable ? "Choose another variable to explore its measurements." : result ? "Try another variable or date range." : "Run an analysis to see the measurements and trend."}</span></div>}
        </section>

        <aside className="trend-panel trend-glance trend-reveal"><span className="trend-glance-wave" aria-hidden="true" /><h2><Sparkles size={35} />At a Glance</h2><div className="trend-stats" aria-live="polite">
          <div className="trend-stat"><span className={`trend-stat-icon ${direction === "decreasing" ? "trend-negative" : ""}`}><DirectionIcon size={36} /></span><div><p>Trend</p><strong className={direction === "decreasing" ? "trend-negative" : "trend-positive"}>{direction || "Awaiting analysis"}</strong></div></div>
          <div className="trend-stat"><span className="trend-stat-icon"><ArrowUpDown size={32} /></span><div><p>Rate of change</p><strong>{trend ? `${trend.annual_rate > 0 ? "+" : ""}${number(trend.annual_rate)}` : "—"}<span className="trend-rate-unit">{trend ? ` ${trend.units}/year` : ""}</span></strong></div></div>
          <div className="trend-stat"><span className="trend-stat-icon trend-positive"><span className="trend-check-ring"><Check size={24} /></span></span><div><p>Significance</p><div className="trend-significance"><strong className="trend-positive">{trend ? trend.significance === "significant" ? "Significant" : trend.significance === "marginal" ? "Marginal" : "Not significant" : "—"}</strong>{trend && <span>(p {trend.p_value === 0 ? "" : "="} {probability(trend.p_value)})</span>}</div></div></div>
        </div></aside>
      </div>

      <section id="big-picture" className="trend-panel trend-picture trend-reveal"><h2><Lightbulb size={44} /><em>The Big Picture</em></h2><div className="trend-picture-copy">{trend ? <><p>{variableLabel(result!.variable)} in {result?.region.name} {direction === "neutral" ? "shows no clear directional trend" : `shows ${direction === "increasing" ? "an" : "a"} ${direction} trend`}, changing by {number(trend.annual_rate)} {trend.units}/year.</p><p>{trend.significance === "significant" ? "The trend meets the 5% significance threshold; this does not establish its cause." : "The evidence does not meet the 5% significance threshold for a long-term change."}</p></> : <p>{unavailable ? "This variable needs a supported dataset before its findings can be shown." : points.length ? "The backend did not return trend statistics. At least four measurements are required." : "Discover what is changing, how quickly, and how strong the evidence is. Run an analysis to begin."}</p>}</div><VariableIllustration kind={selectedKind} /></section>

      <div id="trend-details" className="trend-details"><div className="trend-panel trend-detail-tabs">{[{ name: "Key Comparisons", icon: ChartColumn }, { name: "Methodology", icon: FlaskConical }, { name: "Full Results", icon: FileText }].map(({ name, icon: Icon }) => <button type="button" key={name} aria-expanded={section === name} aria-controls="trend-detail" onClick={() => setSection(section === name ? null : name)} className={`trend-detail-button ${section === name || (!section && name === "Key Comparisons") ? "active" : ""}`}><Icon size={22} />{name}{name === "Full Results" && <ChevronDown size={19} className={section === name ? "rotate-180" : ""} />}</button>)}</div>
        {section && <section id="trend-detail" className="trend-panel trend-detail-content"><h2>{section}</h2>
          {section === "Methodology" ? <div className="space-y-3"><p>The backend applies a two-sided Mann–Kendall test to the selected monthly measurements. Sen’s slope is the median of pairwise slopes; multiplying the monthly slope by 12 gives the annual rate. Significance is reported at p ≤ 0.05; p ≤ 0.10 is marginal.</p><p>The dashed line uses the backend Sen slope and a median-residual intercept. The chart preserves monthly measurements and original units. The slope uses elapsed calendar months, including gaps. Seasonal cycles and serial correlation can affect inference; seasonal adjustment is not applied here.</p><p>Temperature, rainfall and soil moisture use ERA5/ERA5-Land reanalysis. Vegetation uses quality-screened satellite NDVI. Results describe a reference grid cell inside the selected region, not a whole-region average.</p></div>
          : section === "Data Sources" ? <div className="space-y-3"><p>The backend retrieves measurements from the provider below. Reanalysis combines observations with a physical model; MODIS is a satellite product.</p>{result?.source && <div className="space-y-2"><p><a href={result.source.url} target="_blank" rel="noreferrer" className="underline">{result.source.name}</a></p><p>{result.source.description}</p><p>Retrieved: {new Date(result.source.retrieved_at).toLocaleString()} · Missing months: {result.source.missing_months}</p></div>}{result && <dl className="grid gap-4 sm:grid-cols-2"><div><dt>Dataset</dt><dd>{result.variable.name}</dd></div><div><dt>Mission reference</dt><dd>{result.variable.mission}</dd></div><div><dt>Resolution</dt><dd>{result.variable.temporal_resolution} · {result.variable.spatial_resolution}</dd></div><div><dt>Units</dt><dd>{result.variable.units}</dd></div></dl>}</div>
          : section === "Key Comparisons" ? comparison ? <div className="grid gap-4 sm:grid-cols-3"><p>Earlier-period mean<strong className="trend-comparison-value">{number(comparison.early)} {units}</strong></p><p>Later-period mean<strong className="trend-comparison-value">{number(comparison.late)} {units}</strong></p><p>Difference<strong className="trend-comparison-value">{number(comparison.late - comparison.early)} {units}</strong></p><p className="text-slate-400 sm:col-span-3">The first and second halves of the returned record, split at {comparison.split}. This descriptive comparison is not a separate significance test.</p></div> : <p>Run an analysis with at least two measurements to compare periods.</p>
          : trend ? <dl className="grid gap-4 sm:grid-cols-2">{Object.entries(trend).map(([key, value]) => <div key={key} className="min-w-0 border-b border-slate-700/60 pb-2"><dt>{key.replaceAll("_", " ")}</dt><dd className="break-words">{typeof value === "number" ? key === "p_value" ? probability(value) : number(value) : value}</dd></div>)}</dl> : <p>Detailed statistics appear when the backend returns an analysis.</p>}
        </section>}
      </div>
      <p className="trend-source-note"><span />{result?.source?.name || "Historical data"} · reference point · monthly measurements · <button type="button" onClick={() => showSection("Data Sources")}>About the data</button></p>
    </div>
  </div>;
}
