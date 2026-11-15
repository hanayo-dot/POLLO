"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { gsap } from "gsap";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChartColumnIncreasing, ChartLine, Check, CloudRain, Database, ExternalLink, House, Info, Layers, Leaf, Lightbulb, LoaderCircle, MapPin, Satellite, Search, ShieldCheck, Thermometer, TriangleAlert, Waves, X } from "lucide-react";
import { fetchDatasets, fetchTimeSeries } from "../../services/api";
import type { DatasetVariable } from "../../types";
import { readSelection } from "../insights/findings";
import type { Analysis, Selection } from "../insights/findings";
import { VariableIllustration } from "../trend-analysis/VariableIllustration";
import { variableKind, variableLabel } from "../trend-analysis/variables";
import { documentation, NASA_REFERENCES, safeSourceURL, usedDatasets } from "./provenance";

type Detail = "methodology" | "limitations" | "citations";
const detailLabels: Record<Detail, string> = { methodology: "Methodology", limitations: "Data Limitations", citations: "Citations" };
const tabs = Object.keys(detailLabels) as Detail[];
const navLink = "flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm hover:text-cyan-200 max-[600px]:text-xs";

function External({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 ${className}`}>{children}<ExternalLink size={17} className="shrink-0" aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>;
}

function keepDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'))
    .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
  const first = elements[0];
  const last = elements.at(-1);
  if (first && last && (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

export default function DataSources() {
  const root = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [catalog, setCatalog] = useState<DatasetVariable[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [used, setUsed] = useState<DatasetVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState<Detail>("methodology");
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const selected = readSelection(window.location.search);
    setSelection(selected);
    const controller = new AbortController();
    setLoading(true); setError(""); setCatalog([]); setAnalysis(null); setUsed([]);
    async function load() {
      try {
        const datasets = await fetchDatasets({ strict: true, signal: controller.signal });
        if (controller.signal.aborted) return;
        setCatalog(datasets);
        if (!selected || datasets.length === 0) return;
        if (!datasets.some(item => item.id === selected.variable)) throw new Error("The selected dataset is not in the backend catalog. Run a supported analysis first.");
        const result = await fetchTimeSeries(selected.region, selected.variable, false, { start: selected.start, end: selected.end, signal: controller.signal });
        if (controller.signal.aborted) return;
        const verified = usedDatasets(datasets, result, selected);
        setAnalysis(result); setUsed(verified);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load data sources. Please try again."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(".sources-reveal", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, stagger: .08, ease: "power2.out", clearProps: "opacity,transform" });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, [loading, used.length]);

  useEffect(() => {
    if (!detailsOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [detailsOpen]);

  function openDetails(tab: Detail = "methodology") {
    setDetail(tab); setDetailsOpen(true); dialog.current?.showModal();
  }

  const query = selection ? `?${new URLSearchParams(selection)}` : "";
  const back = `/trend-analysis${query}`;
  const points = analysis?.series.filter(point => Number.isFinite(point.value)).sort((a, b) => a.date.localeCompare(b.date)) || [];
  const record = points.length ? `${points[0].date.slice(0, 7)} – ${points.at(-1)!.date.slice(0, 7)}` : "No record verified";
  const recordDisplay = points.length ? <><span className="whitespace-nowrap">{points[0].date.slice(0, 7)}</span> – <span className="whitespace-nowrap">{points.at(-1)!.date.slice(0, 7)}</span></> : record;
  const dataset = used[0];
  const kind = dataset ? variableKind(dataset) : undefined;
  const Icon = kind === "temperature" ? Thermometer : kind === "vegetation" ? Leaf : kind === "soil-moisture" ? Waves : CloudRain;
  const doc = dataset ? documentation[dataset.id] : undefined;
  const sourceURL = safeSourceURL(analysis?.source?.url);
  const retrievedAt = typeof analysis?.source?.retrieved_at === "string" && analysis.source.retrieved_at ? analysis.source.retrieved_at : "Not supplied";
  const retrievedDate = retrievedAt === "Not supplied" ? retrievedAt : retrievedAt.slice(0, 10);
  const missingMonths = analysis?.source?.missing_months ?? "Not supplied";

  return <div ref={root} className="sources-page relative isolate min-h-screen overflow-clip bg-discovery-space font-[Arial,Helvetica,sans-serif] text-[#f4f7ff] [&_:focus-visible]:outline [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-cyan-200">
    <a href="#data-sources-main" className="fixed left-2 top-2 z-50 -translate-y-[150%] rounded-lg bg-discovery-surface p-3 focus:translate-y-0">Skip to data sources</a>
    <div aria-hidden="true" className="insights-earth pointer-events-none absolute right-0 top-[63px] -z-10 h-[370px] w-full max-[600px]:top-[116px] max-[600px]:opacity-40"/>
    <nav aria-label="Main navigation" className="relative z-30 flex min-h-[62px] items-center justify-between gap-[18px] border-b border-[#164165] bg-[#02101ee8] px-[max(28px,calc((100vw-1560px)/2))] max-[1250px]:flex-wrap max-[1250px]:py-2.5 max-[600px]:gap-3 max-[600px]:px-4">
      <a href="/dashboard" className="flex shrink-0 items-center gap-2 text-[27px] font-bold max-[600px]:text-xl"><svg viewBox="0 0 70 52" fill="none" aria-hidden="true" className="h-11 w-14 text-cyan-300 max-[600px]:h-9 max-[600px]:w-10"><circle cx="34" cy="26" r="21" stroke="currentColor" strokeWidth="1.8"/><ellipse cx="34" cy="27" rx="33" ry="9" transform="rotate(-25 34 27)" stroke="currentColor" strokeWidth="1.8"/></svg>POLLO</a>
      <div className="flex items-center gap-[clamp(8px,1.2vw,24px)] max-[1250px]:order-3 max-[1250px]:w-full max-[1250px]:justify-between max-[1250px]:overflow-x-auto max-[600px]:gap-3 [&_svg]:h-[22px] [&_svg]:w-[22px]">
        {[{ href: "/dashboard", label: "Home", icon: House }, { href: `${back}#analysis-controls`, label: "Investigate", icon: Search }, { href: `${back}#trend-chart`, label: "Visualise", icon: ChartColumnIncreasing }, { href: back, label: "Trend Analysis", icon: ChartLine }, { href: `/insights${query}`, label: "Insights", icon: Lightbulb }].map(({ href, label, icon: NavIcon }) => <a key={label} href={href} aria-label={label} className={navLink}><NavIcon aria-hidden="true"/><span className="max-[600px]:sr-only">{label}</span></a>)}
        <a href="#data-sources-main" className={`${navLink} rounded-full border border-cyan-300 bg-cyan-500/10 px-[17px] shadow-[inset_0_-3px_8px_#00c8ff38]`} aria-current="page" aria-label="Data Sources"><Database className="text-cyan-300" aria-hidden="true"/><span className="max-[360px]:sr-only">Data Sources</span></a>
      </div>
      <span className="flex max-w-[250px] items-center gap-2 rounded-full border border-[#164b71] bg-[#061d30c9] px-4 py-2 text-sm max-[600px]:max-w-[180px] max-[600px]:text-xs"><MapPin size={20} className="shrink-0 text-discovery-earth" aria-hidden="true"/>{analysis?.region.name || "Your investigation"}</span>
    </nav>

    <main id="data-sources-main" tabIndex={-1} className="mx-auto w-[calc(100%-96px)] max-w-[1560px] pb-8 max-[1250px]:w-[calc(100%-48px)] max-[600px]:w-[calc(100%-28px)]">
      <header className="sources-reveal pb-6 pl-[54px] pt-6 max-[950px]:pl-3 max-[600px]:pl-1"><p className="mb-1.5 text-sm font-bold tracking-[.16em] text-cyan-300">DATA SOURCES</p><h1 className="text-[clamp(28px,2.5vw,39px)] font-bold leading-tight tracking-tight">Where Our Data Comes From</h1><p className="mt-2 text-lg leading-relaxed max-[600px]:text-base">Trusted, open scientific data from NASA and global Earth observation providers.</p></header>

      <div className="grid grid-cols-[1.43fr_1fr] gap-5 max-[950px]:grid-cols-1">
        <section className="insights-panel sources-reveal relative min-h-[254px] overflow-hidden border-cyan-300">
          <img src="/textures/data-sources-satellite.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-[60%] object-cover object-left max-[600px]:w-full max-[600px]:opacity-30"/>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-[#03172a55] to-[#03233f] max-[600px]:from-[#03172ab3]"/>
          <div className="relative ml-[57%] flex min-h-[254px] flex-col items-start justify-center gap-4 p-6 pl-0 max-[1250px]:ml-[49%] max-[600px]:ml-0 max-[600px]:p-6">
            <div className="flex items-center gap-4"><img src="/textures/nasa-logo.svg" alt="NASA" className="h-[74px] w-[88px] shrink-0 max-[1250px]:h-14 max-[1250px]:w-16"/><div><p className="text-sm text-slate-200">Discover open science</p><h2 className="text-[27px] font-bold leading-tight max-[1250px]:text-[23px]">NASA Earthdata</h2></div></div>
            <p className="max-w-[330px] text-base leading-relaxed">Explore satellite observations of our changing planet.</p>
            <External href="https://www.earthdata.nasa.gov/" className="insights-button insights-download-button !px-5 !text-base">Explore NASA Data</External>
          </div>
        </section>

        <section className="insights-panel sources-reveal relative min-h-[254px] overflow-hidden border-discovery-teal bg-gradient-to-br from-[#073045] to-[#021c29] px-7 py-5 max-[600px]:px-5" aria-busy={loading}>
          <div aria-hidden="true" className="sources-wave pointer-events-none absolute -right-8 -top-10 h-28 w-[70%] rotate-[-12deg] rounded-[50%] border border-teal-300/40 bg-gradient-to-t from-transparent to-teal-400/20"/>
          <h2 className="insights-heading"><Layers aria-hidden="true"/>In This Analysis</h2>
          {loading ? <p role="status" className="mt-12 flex items-center justify-center gap-3 text-cyan-100"><LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true"/>Verifying investigation sources…</p>
            : error ? <p className="mt-8 leading-relaxed text-slate-300">Sources could not be verified. Retry below to check the evidence.</p>
            : dataset && analysis ? <><div className="mt-7 grid grid-cols-3 divide-x divide-[#387391] text-center max-[600px]:[&_strong]:text-base max-[360px]:[&_strong]:text-sm max-[600px]:[&_span]:text-xs max-[600px]:[&>div]:px-1"><div className="flex flex-col items-center px-2"><Icon size={36} className="mb-2 text-cyan-300" aria-hidden="true"/><strong className="text-lg">{variableLabel(dataset)}</strong><span className="mt-1 text-sm leading-snug">{doc?.title || dataset.mission}</span></div><div className="flex flex-col items-center px-2"><CalendarDays size={34} className="mb-2 text-sky-400" aria-hidden="true"/><strong className="text-lg">Record</strong><span className="mt-1 text-sm leading-snug">{recordDisplay}<br/>{points.length} monthly values</span></div><div className="flex flex-col items-center px-2"><ShieldCheck size={36} className="mb-2 text-discovery-teal" aria-hidden="true"/><strong className="text-lg">{analysis.source?.kind === "satellite" ? "Satellite" : "Reanalysis"}</strong><span className="mt-1 text-sm leading-snug">Reference grid cell</span></div></div><p className="mt-4 text-center text-xs text-slate-300">Requested: {selection?.start} – {selection?.end} · {analysis.region.name}</p></>
              : <div className="mt-8 leading-relaxed"><p>{selection ? "No measurements were returned for this investigation." : "Choose a climate variable, region and period to see the datasets actually used."}</p><a href={back} className="mt-4 inline-flex items-center gap-2 text-cyan-200 underline">Go to Trend Analysis <ArrowRight size={18}/></a></div>}
        </section>
      </div>

      <section className="sources-reveal mt-5" aria-labelledby="sources-used-heading"><h2 id="sources-used-heading" className="insights-heading mb-4 ml-2"><Satellite aria-hidden="true"/>Data Sources Used</h2>
        {loading ? <div role="status" className="insights-panel flex min-h-[220px] items-center justify-center gap-3 text-cyan-100"><LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true"/>Loading the backend catalog and source record…</div>
          : error ? <div role="alert" className="insights-panel flex min-h-[220px] flex-col items-start justify-center gap-4 p-7"><h3 className="text-xl font-bold">We couldn’t verify the data sources</h3><p className="text-slate-200">{error}</p><button className="insights-button" onClick={() => setRetry(value => value + 1)}>Retry sources</button></div>
            : !dataset || !analysis ? <div role="status" className="insights-panel flex min-h-[220px] flex-col items-start justify-center gap-4 p-7"><h3 className="text-xl font-bold">{catalog.length === 0 ? "No datasets available" : selection ? "No data sources used for this period" : "No investigation selected"}</h3><p className="text-slate-200">{catalog.length === 0 ? "The backend catalog is empty. Try again later." : "Run an analysis to verify its source. Available catalog entries are not evidence of usage."}</p><a className="insights-button" href={back}>Open Trend Analysis <ArrowRight size={18}/></a></div>
              : <article data-testid="used-dataset" className="insights-panel overflow-hidden border-cyan-400">
                <div className="grid grid-cols-[1.15fr_1fr_.85fr] max-[950px]:grid-cols-1">
                  <div className="relative min-h-[218px] overflow-hidden bg-gradient-to-br from-[#05465c] to-[#042036] p-7"><div aria-hidden="true" className="absolute inset-0 opacity-35" style={kind === "rainfall" ? { background: "linear-gradient(90deg,#032038,transparent),url('/textures/insights-rainfall.png') center/cover" } : undefined}/><div className="relative z-10 flex items-center gap-4"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300"><Icon size={35} aria-hidden="true"/></span><div><h3 className="text-[27px] font-bold leading-tight">{doc?.title || dataset.mission}</h3><p className="mt-1 text-base leading-snug">{dataset.name}</p></div></div><span className="relative z-10 mt-7 inline-flex items-center gap-2 rounded-full border border-teal-300/50 bg-teal-500/15 px-4 py-1.5 text-sm"><Check size={17} className="text-cyan-300" aria-hidden="true"/>Used for: {variableLabel(dataset).toLowerCase()} analysis</span>{kind && kind !== "rainfall" && <div className="pointer-events-none absolute bottom-0 right-0 w-48 opacity-40 [&_svg]:w-full"><VariableIllustration kind={kind}/></div>}</div>
                  <div className="border-x border-[#24516a] p-7 max-[950px]:border-x-0 max-[950px]:border-y"><p className="text-base leading-relaxed">{doc?.description || analysis.source?.description || "Source information supplied by the backend."}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-400">Spatial resolution</dt><dd>{dataset.spatial_resolution}</dd></div><div><dt className="text-slate-400">Analysis interval</dt><dd>{dataset.temporal_resolution}</dd></div><div><dt className="text-slate-400">Units</dt><dd>{dataset.units}</dd></div><div><dt className="text-slate-400">Available record</dt><dd>{recordDisplay}</dd></div></dl></div>
                  <div className="flex flex-col items-start justify-center gap-3 p-7"><p className="text-xs font-bold tracking-widest text-cyan-300">VERIFIED SOURCE</p><p className="text-lg font-bold">{analysis.source?.name}</p><p className="text-sm leading-relaxed text-slate-200">{dataset.producing_org}</p>{sourceURL && <External href={sourceURL} className="text-sm text-cyan-200 underline">Open data provider</External>}<button className="insights-button mt-1 !text-sm" onClick={() => openDetails("citations")}>Source &amp; citation details <ArrowRight size={17}/></button></div>
                </div>
              </article>}
      </section>

      <section className="insights-panel sources-reveal mt-6 grid grid-cols-[1fr_1fr_1.15fr_auto] items-center gap-6 px-8 py-5 max-[1250px]:grid-cols-3 max-[950px]:grid-cols-1 max-[600px]:px-6" aria-label="Scientific documentation">
        {[{ id: "methodology" as const, icon: Info, text: "Monthly processing, Mann–Kendall significance and Sen’s rate of change." }, { id: "limitations" as const, icon: TriangleAlert, text: "Coverage gaps, grid-cell scope, model uncertainty and seasonal effects." }, { id: "citations" as const, icon: BookOpen, text: dataset ? `${doc?.title || dataset.mission} references and provider attribution for this investigation.` : "Official references are shown when an investigation's source is verified." }].map(({ id, icon: DetailIcon, text }) => <button key={id} className="flex min-h-[78px] items-start gap-4 text-left transition hover:text-cyan-200 motion-reduce:transition-none" onClick={() => openDetails(id)} aria-haspopup="dialog"><DetailIcon size={32} className="shrink-0 text-cyan-300" aria-hidden="true"/><span><strong className="block text-xl">{detailLabels[id]}</strong><span className="mt-2 block text-sm leading-relaxed text-slate-200">{text}</span></span></button>)}
        <button className="insights-button whitespace-nowrap !px-5 !text-base max-[1250px]:col-span-3 max-[1250px]:justify-self-end max-[950px]:col-span-1 max-[950px]:justify-self-start" aria-haspopup="dialog" onClick={() => openDetails()}>View Details <ArrowRight size={18}/></button>
      </section>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-slate-400"><a href={back} className="inline-flex min-h-11 items-center gap-2 text-cyan-200 hover:underline"><ArrowLeft size={16}/>Back to Trend Analysis</a><p>{analysis?.source && used.length > 0 ? `Source retrieved: ${retrievedDate} · Missing months: ${missingMonths}` : "Used datasets appear only after source verification."}</p><p>Satellite artwork is illustrative. NASA branding does not imply endorsement.</p></div>
    </main>

    <dialog ref={dialog} aria-labelledby="source-details-title" onKeyDown={keepDialogFocus} className="m-auto max-h-[85dvh] w-[min(850px,calc(100%-32px))] overflow-y-auto rounded-3xl border border-cyan-400 bg-[#071b2e] p-7 text-slate-100 shadow-2xl backdrop:bg-black/75 max-[600px]:p-5" onClose={() => setDetailsOpen(false)}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-cyan-300">THE EVIDENCE BEHIND YOUR INVESTIGATION</p><h2 id="source-details-title" className="mt-2 text-2xl font-bold">Data source details</h2></div><button className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-600 hover:bg-slate-700" aria-label="Close details" onClick={() => dialog.current?.close()}><X aria-hidden="true"/></button></div>
      <div role="tablist" aria-label="Source documentation" className="my-6 flex gap-2 overflow-x-auto border-b border-slate-600 pb-3" onKeyDown={event => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (tabs.indexOf(detail) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; setDetail(tabs[index]); dialog.current?.querySelector<HTMLButtonElement>(`#source-tab-${tabs[index]}`)?.focus(); }}>{tabs.map(tab => <button id={`source-tab-${tab}`} key={tab} role="tab" aria-selected={detail === tab} aria-controls={`source-panel-${tab}`} tabIndex={detail === tab ? 0 : -1} onClick={() => setDetail(tab)} className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm ${detail === tab ? "border-cyan-300 bg-cyan-400/10 text-cyan-100" : "border-transparent text-slate-300 hover:text-white"}`}>{detailLabels[tab]}</button>)}</div>
      <section id={`source-panel-${detail}`} role="tabpanel" aria-labelledby={`source-tab-${detail}`} tabIndex={0} className="space-y-4 text-base leading-relaxed">
        {detail === "methodology" ? <><h3 className="text-xl font-bold">From source measurements to a trend</h3><p>{doc?.processing || "Choose an investigation to see its variable-specific processing. The current analysis flow supports raw monthly ERA5/ERA5-Land measurements and quality-screened MODIS NDVI."}</p><p>The backend applies a two-sided Mann–Kendall test to monthly measurements and uses Sen’s slope, based on elapsed calendar months, to estimate change. The annual rate is the monthly slope multiplied by 12, in the original measurement units per year. At least four measurements are required for trend statistics.</p><p>Significance is reported at p ≤ 0.05; p ≤ 0.10 is marginal. Raw monthly tests are not corrected for seasonality or serial correlation. A significant trend does not establish causation or predict future conditions.</p>{analysis?.trend && used.length > 0 && <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/5 p-4"><h4 className="font-bold">Backend interpretation</h4><p>{analysis.trend.interpretation}</p></div>}</>
          : detail === "limitations" ? <><h3 className="text-xl font-bold">Understand the scope of the evidence</h3><p>{doc?.limitations || "Limitations depend on the dataset. Open an investigation to inspect its actual source and record."}</p><p>Results describe a reference grid cell within the selected region, not a whole-region average or an individual farm. Missing months are omitted. Native product intervals and the monthly analysis interval may differ.</p>{analysis?.source && used.length > 0 && <><p>{analysis.source.description}</p><p><strong>Returned record:</strong> {record} · {points.length} monthly values · {missingMonths} missing months.</p></>}<p>Data gaps, measurement and model uncertainty, seasonal cycles and serial correlation can affect trend inference. The current API does not provide measurement-error bounds or a confidence interval for the annual rate.</p><p>MCD12Q1 land cover classification is not part of the current investigation flow. NDVI greenness is not a substitute for land cover classification.</p></>
            : <><h3 className="text-xl font-bold">Cite the actual source</h3>{dataset && analysis ? <><p>{dataset.name} · {dataset.producing_org} · {dataset.mission} · {dataset.instrument}.</p><p>Investigation record: {record}. Source retrieved: {retrievedAt}. Dataset identifier: {dataset.id}.</p><p className="text-sm text-slate-300">Catalog period metadata: {dataset.baseline_period}. This field does not establish the coverage of your returned record.</p><ul className="space-y-4">{doc?.references.map(reference => <li key={reference.url}><External href={reference.url} className="text-cyan-200 underline">{reference.title}</External></li>)}{sourceURL && !doc?.references.some(reference => reference.url === sourceURL) && <li><External href={sourceURL} className="text-cyan-200 underline">Backend data-access source: {analysis.source?.name}</External></li>}</ul>{!doc && <p>The backend supplies the provider above but no product-specific citation. Confirm the exact product and version before formal publication.</p>}</> : <p>No dataset has been verified as used. Select and run an investigation before citing analysis data.</p>}<div className="mt-6 border-t border-slate-600 pt-4"><h4 className="font-bold">NASA product reference library</h4><p className="mb-3 text-sm text-slate-300">Background reading only. These links do not mean that the products were used in this investigation.</p><ul className="space-y-3">{NASA_REFERENCES.map(reference => <li key={reference.url}><External href={reference.url} className="text-sm text-cyan-200 underline">{reference.title}</External></li>)}</ul><p className="mt-4 text-xs text-slate-400">NASA insignia: nasa.gov. Satellite artwork: illustrative, generated for this interface.</p></div></>}
      </section>
    </dialog>
  </div>;
}
