"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "gsap";
import { ArrowDownRight, ArrowLeft, ArrowUpDown, ArrowUpRight, CalendarDays, ChartColumnIncreasing, ChartLine, Check, Database, Download, Droplets, FileText, Leaf, Lightbulb, LoaderCircle, MapPin, Minus, Sparkles, Sprout, Star, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchTimeSeries } from "../../services/api";
import { VariableIllustration } from "../trend-analysis/VariableIllustration";
import { variableKind } from "../trend-analysis/variables";
import { buildReport, describeFindings, formatP, hasTrend, readSelection } from "./findings";
import type { Analysis, Selection } from "./findings";

const STATE_PANEL = "insights-panel flex min-h-[370px] flex-col items-center justify-center gap-5 p-8 text-center";

function Heading({ icon: Icon, children, className = "" }: { icon: LucideIcon; children: ReactNode; className?: string }) {
  return <h2 className={`insights-heading ${className}`}><Icon aria-hidden="true"/>{children}</h2>;
}

function FindingCard({ icon: Icon, label, value, detail, tone }: {
  icon: LucideIcon; label: string; value: string; detail?: string; tone: "red" | "blue" | "teal" | "amber" | "neutral";
}) {
  const tones = {
    red: "border-[#ec637f] bg-gradient-to-br from-[#713548] to-[#12273c] [--wave:#ff526e] [&_strong]:text-[#ff8b96] [&_svg]:text-[#ff8b96]",
    blue: "border-discovery-earth bg-gradient-to-br from-[#063d70] to-[#031e35] [--wave:#0084ff] [&_svg]:text-cyan-300",
    teal: "border-discovery-teal bg-gradient-to-br from-[#005b58] to-[#032637] [--wave:#00d9ad] [&_strong]:text-[#35eed9] [&_svg]:text-[#35eed9]",
    amber: "border-[#b99446] bg-gradient-to-br from-[#49422b] to-[#092738] [--wave:#d6aa48] [&_strong]:text-[#f8d782] [&_svg]:text-[#f8d782]",
    neutral: "border-[#7188aa] bg-gradient-to-br from-[#334158] to-[#0b2439] [--wave:#9caacb] [&_strong]:text-[#dae5f8] [&_svg]:text-[#dae5f8]",
  };
  return <article className={`insights-stat relative isolate flex min-h-[158px] flex-col items-center overflow-hidden rounded-3xl border px-2.5 pb-5 pt-2.5 text-center shadow-[inset_0_5px_22px_#158be820] max-[950px]:min-h-[170px] max-[600px]:min-h-[135px] ${tones[tone]}`}>
    <span className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-[#001a326e]"><Icon className="h-[35px] w-[35px]" aria-hidden="true"/></span>
    <h3 className="mb-1 text-base">{label}</h3>
    <strong className="break-words text-[clamp(18px,1.65vw,26px)] font-bold leading-tight max-[950px]:text-[25px]">{value}</strong>
    {detail && <span className={`mt-1 ${label === "Rate of Change" ? "text-[11px] text-[#c3d9ed]" : "text-[15px]"}`}>{detail}</span>}
  </article>;
}

export default function Insights() {
  const root = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [simple, setSimple] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const selected = readSelection(window.location.search);
    setSelection(selected);
    if (!selected) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null); setSimple(false);
    fetchTimeSeries(selected.region, selected.variable, false, { start: selected.start, end: selected.end, signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        if (result.region?.id !== selected.region || result.variable?.id !== selected.variable || !Array.isArray(result.series)) throw new Error("The returned analysis does not match your selection. Please run Trend Analysis again.");
        if (!result.source || result.source.kind === "benchmark") throw new Error("This analysis has no observational source. Choose a supported reanalysis or satellite variable in Trend Analysis.");
        setData(result);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not retrieve your findings."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const back = `/trend-analysis${selection ? `?${new URLSearchParams(selection)}` : ""}`;
  const ready = !!data && hasTrend(data);
  const findings = ready && data ? describeFindings(data) : null;
  const trend = ready && data ? data.trend! : null;
  const DirectionIcon = trend?.trend_direction === "decreasing" ? ArrowDownRight : trend?.trend_direction === "increasing" ? ArrowUpRight : Minus;
  const sourceURL = data?.source?.url && /^https?:\/\//i.test(data.source.url) ? data.source.url : undefined;

  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo(".insights-reveal", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .5, stagger: .07, ease: "power2.out", clearProps: "transform,opacity" });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, [loading, ready]);

  useEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.fromTo("#insight-explanation", { opacity: .35, y: 3 }, { opacity: 1, y: 0, duration: .25, clearProps: "transform,opacity" });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, [simple, ready]);

  async function download() {
    if (!data || !selection || !ready) return;
    setDownloading(true); setDownloadError(""); setDownloaded(false);
    let url: string | undefined;
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      url = URL.createObjectURL(new Blob([buildReport(data, selection)], { type: "text/html;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `POLLO-insights-${data.region.id.replace(/[^a-z0-9_-]/gi, "_")}-${selection.start}-${selection.end}.html`;
      document.body.appendChild(link); link.click(); link.remove();
      setDownloaded(true);
    } catch { setDownloadError("The report could not be created. Please try again."); }
    finally { if (url) { const blobURL = url; setTimeout(() => URL.revokeObjectURL(blobURL), 10000); } setDownloading(false); }
  }

  return <div ref={root} className="insights-page relative isolate min-h-screen overflow-clip text-[#f4f7ff] pb-12 [&_:focus-visible]:outline [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-cyan-200">
    <main id="insights-main" className="mx-auto w-[calc(100%-48px)] max-w-[1560px] pt-6 pb-6 max-[600px]:w-[calc(100%-28px)]" tabIndex={-1}>
      <header className="insights-reveal mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-cyan-400 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>NASA OBSERVATIONAL ARCHIVE • SYNTHESIS &amp; INTERPRETATION</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
          Key Discoveries <span className="text-cyan-400">&amp;</span> Planetary Insights
        </h1>
        <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-3xl">
          A clear, scientifically sound executive summary of what multi-decadal observations reveal about environmental change.
        </p>
      </header>

      <section className="insights-panel insights-reveal mb-6 grid min-h-[78px] grid-cols-[1.25fr_1fr_auto] items-center gap-6 border-cyan-400/40 bg-gradient-to-r from-[#07334cd9] to-[#03182be8] px-6 py-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] max-[1250px]:gap-4 max-[950px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:rounded-[16px] max-[600px]:p-4" aria-label="Analysis selection">
        <div className="flex min-w-0 items-center gap-4 border-r border-[#477795]/50 pr-4 text-base max-[1250px]:text-sm max-[600px]:border-0"><Droplets className="h-6 w-6 shrink-0 text-cyan-300" aria-hidden="true"/><span>Analysis: <strong>{findings ? `${findings.label} in ${data!.region.name}` : data ? `${data.variable.name} in ${data.region.name}` : loading ? "Loading your investigation…" : "No analysis selected"}</strong></span></div>
        <div className="flex min-w-0 items-center gap-4 text-base max-[1250px]:text-sm"><CalendarDays className="h-6 w-6 shrink-0 text-cyan-300" aria-hidden="true"/><span>Period: <strong>{selection ? `${selection.start} – ${selection.end}` : "Select in Trend Analysis"}</strong></span></div>
        <div className="flex items-center gap-3 max-[950px]:col-span-2 max-[950px]:justify-self-start max-[600px]:col-span-1 max-[600px]:flex-wrap">
          <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-[#082139] px-4 py-2 text-sm font-medium transition hover:border-cyan-300 hover:bg-[#0c2f52]" href={back}><ArrowLeft size={16} aria-hidden="true"/>Back to Trend Analysis</a>
          <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-[#082139] px-4 py-2 text-sm font-medium transition hover:border-cyan-300 hover:bg-[#0c2f52]" href={`/data-sources${selection ? `?${new URLSearchParams(selection)}` : ""}`}><Database size={16} aria-hidden="true"/>Data Sources</a>
        </div>
      </section>

      {loading ? <section className={STATE_PANEL} role="status" aria-live="polite"><LoaderCircle className="animate-spin text-discovery-teal motion-reduce:animate-none" size={38} aria-hidden="true"/><h2 className="text-2xl font-bold">Reading your climate findings…</h2><p className="max-w-[650px] text-[#c7dfef]">Retrieving the selected measurements and statistical results. Vegetation data may take a few minutes.</p></section>
        : error ? <section className={STATE_PANEL} role="alert"><h2 className="text-2xl font-bold">We couldn’t load your findings</h2><p className="max-w-[650px] text-[#c7dfef]">{error}</p><button className="insights-button" onClick={() => setRetry(value => value + 1)}>Try again</button><a className="text-cyan-200 underline" href={back}>Return to your analysis</a></section>
        : !findings || !trend || !data ? <section className={STATE_PANEL} role="status"><ChartLine size={42} className="text-discovery-teal" aria-hidden="true"/><h2 className="text-2xl font-bold">{data ? "Not enough data for findings" : "Your discoveries start with an analysis"}</h2><p className="max-w-[650px] text-[#c7dfef]">{data ? "The backend did not return usable trend statistics for this period. Try another variable or a longer period." : "Choose a region, climate variable and time period in Trend Analysis, then open Insights."}</p><a href={back} className="insights-button">Go to Trend Analysis <ArrowUpRight size={20} aria-hidden="true"/></a></section>
        : <>
          <div className="grid grid-cols-[minmax(0,.96fr)_minmax(0,1.24fr)] grid-rows-[auto_auto] gap-[18px] max-[950px]:grid-cols-1">
            <section className="insights-panel insights-reveal relative row-span-2 min-h-[395px] overflow-hidden border-cyan-400 bg-[#031a2a] max-[950px]:row-span-1 max-[950px]:min-h-[370px]">
              <div className="insights-insight-art absolute inset-0 opacity-[.96] max-[600px]:opacity-[.65]" aria-hidden="true"/>
              <div className="relative flex min-h-full flex-col items-start pb-[30px] pl-[46px] pr-9 pt-[27px] max-[1250px]:p-[25px] max-[950px]:p-[30px] max-[600px]:p-[25px]">
                <Heading icon={Sparkles} className="mb-[15px] !text-[22px] text-cyan-300">Data-based Insight</Heading>
                <h3 className="max-w-[90%] text-[clamp(28px,2.3vw,39px)] font-bold leading-[1.14] max-[600px]:text-[32px]">{findings.label}<em className="block capitalize text-cyan-400">{findings.direction === "neutral" ? "No clear direction" : `is ${findings.direction}`}</em></h3>
                <div id="insight-explanation" className="mb-[22px] mt-[17px] max-w-[75%] text-lg leading-[1.4] [text-shadow:0_1px_8px_#00101d] max-[1250px]:max-w-[85%] max-[1250px]:text-[17px] max-[950px]:max-w-[65%] max-[600px]:max-w-full" aria-live="polite"><p>{simple ? findings.simple : findings.measured}</p>{!simple && <p className="mt-2.5 text-[15px] text-[#d6e9f5]">{findings.evidence}</p>}</div>
                <button className="insights-button mt-auto" aria-pressed={simple} aria-controls="insight-explanation" onClick={() => setSimple(value => !value)}><Sparkles size={23} className="text-cyan-300" aria-hidden="true"/>{simple ? "Show Technical Detail" : "Explain Simply"}</button>
              </div>
            </section>

            <section className="insights-panel insights-reveal px-[18px] pb-3.5 pt-[15px] max-[600px]:px-3 max-[600px]:py-5">
              <Heading icon={ChartColumnIncreasing} className="mx-1.5 mb-3.5">Key Findings</Heading>
              <div className="grid grid-cols-3 gap-4 max-[1250px]:gap-2.5 max-[600px]:grid-cols-1 max-[600px]:gap-3">
                <FindingCard icon={DirectionIcon} label="Trend" value={findings.direction === "neutral" ? "No clear trend" : findings.direction.charAt(0).toUpperCase() + findings.direction.slice(1)} tone={findings.direction === "decreasing" ? "red" : findings.direction === "increasing" ? "teal" : "neutral"}/>
                <FindingCard icon={ArrowUpDown} label="Rate of Change" value={findings.rate} detail="Change in monthly values" tone="blue"/>
                <FindingCard icon={trend.significance === "significant" ? Check : Minus} label="Significance" value={findings.significance} detail={`(p ${formatP(trend.p_value)})`} tone={trend.significance === "significant" ? "teal" : "amber"}/>
              </div>
            </section>

            <section className="insights-panel insights-meaning insights-reveal relative flex min-h-[145px] items-center overflow-hidden border-discovery-teal bg-gradient-to-r from-[#072337] to-[#093b57] px-6 py-[17px] max-[600px]:p-[22px]"><div className="relative z-10 w-[78%] max-[600px]:w-full"><Heading icon={Leaf}>What This Means</Heading><p className="ml-[25px] mt-2 text-[17px] leading-[1.4] max-[600px]:ml-0 max-[600px]:text-base">{findings.implications}</p></div><VariableIllustration kind={variableKind(data.variable) || "rainfall"}/></section>
          </div>

          <div className="mt-[18px] grid grid-cols-[1.16fr_1.02fr_.9fr] gap-5 max-[1250px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:gap-4">
            <section className="insights-panel insights-reveal min-w-0 bg-gradient-to-br from-[#0d263e] to-[#123553] px-[26px] py-[19px] max-[600px]:p-[23px]"><Heading icon={Target}>Why It Matters</Heading><div className="mt-[18px] grid grid-cols-3 divide-x divide-[#387391]">{[{ icon: Sprout, first: "Crop & food", second: "security" }, { icon: Droplets, first: "Water", second: "availability" }, { icon: Users, first: "Community", second: "livelihoods" }].map(({ icon: Icon, first, second }) => <div key={first} className="flex flex-col items-center gap-2 text-center text-[17px] leading-[1.3] max-[600px]:text-[15px]"><Icon className="h-[34px] w-[34px] text-cyan-300" strokeWidth={1.7} aria-hidden="true"/><span>{first}<br/>{second}</span></div>)}</div><p className="mt-[13px] text-center text-[11px] text-[#b4cbdc]">Potential areas of impact; not measured by this analysis.</p></section>
            <section className="insights-panel insights-reveal min-w-0 border-t-cyan-300 px-[26px] py-[19px] max-[600px]:p-[23px]"><Heading icon={Star}>Key Takeaway</Heading><p className="mt-[13px] rounded-[20px] border border-discovery-teal bg-[#0323309c] px-[23px] py-3.5 text-[17px] leading-[1.4] shadow-[inset_0_-4px_12px_#00c6d622]">{findings.takeaway}</p></section>
            <section className="insights-panel insights-reveal flex min-w-0 gap-[17px] px-[26px] py-[19px] max-[1250px]:col-span-2 max-[1250px]:justify-center max-[600px]:col-span-1 max-[600px]:justify-start max-[600px]:p-[23px]"><FileText className="h-[53px] w-[43px] shrink-0 rounded-full bg-[#00516c] p-[7px] text-cyan-300" aria-hidden="true"/><div className="max-[1250px]:grid max-[1250px]:grid-cols-[1fr_auto] max-[1250px]:gap-x-6 max-[600px]:block"><h2 className="text-[22px] font-bold leading-tight max-[1250px]:col-start-1">Download Report</h2><p className="mb-3 mt-[7px] text-base leading-[1.4] max-[1250px]:col-start-1">Save your findings, source details, chart and measurements.</p><button className="insights-button insights-download-button whitespace-nowrap !px-5 max-[1250px]:col-start-2 max-[1250px]:row-span-2 max-[1250px]:row-start-1 max-[1250px]:self-center" disabled={downloading} onClick={() => void download()}>{downloading ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Download aria-hidden="true"/>}{downloading ? "Creating Report…" : "Download Report"}</button><span className="mt-2 block text-[11px] text-[#bdd3e7] max-[1250px]:col-span-2" role="status">{downloaded ? "Report downloaded. Open it to read or print to PDF." : "HTML report · ready to read or print"}</span>{downloadError && <p role="alert" className="mt-2 text-sm text-rose-200 max-[1250px]:col-span-2">{downloadError}</p>}</div></section>
          </div>
          {trend.interpretation && <details className="mx-2.5 mt-5 text-[13px] leading-relaxed text-[#bbd2e6] [&_p]:mt-2"><summary className="w-fit cursor-pointer py-1 text-cyan-200">Backend interpretation &amp; methodology</summary><p>{trend.interpretation}</p><p>Two-sided Mann–Kendall test and Sen’s slope on monthly measurements, without seasonal adjustment. Seasonal cycles and serial correlation can affect inference. The annual rate is change in the original monthly measurement units per year, not annual accumulated totals.</p><p>Available record: {trend.start_date.slice(0, 7)} – {trend.end_date.slice(0, 7)} · {trend.data_points} measurements.</p></details>}
        </>}

      <footer id="insights-source" className="mx-2.5 mt-[18px] flex scroll-mt-5 items-start gap-2.5 text-xs leading-relaxed text-[#adc8dd]"><Database size={16} className="mt-0.5 shrink-0 text-discovery-teal" aria-hidden="true"/><div>{data ? <><p>{sourceURL ? <a className="text-cyan-200 underline" href={sourceURL} target="_blank" rel="noreferrer">{data.source?.name}</a> : data.source?.name || data.variable.producing_org} · {data.variable.name}</p><p>Reference grid cell, not a whole-region average. {data.source && <>Missing months: {data.source.missing_months} · Retrieved {data.source.retrieved_at.slice(0, 10)}.</>}</p></> : <p>Findings appear only when a backend analysis is available.</p>}<p>Data-based explanation · No AI service connected. Decorative imagery does not represent measured conditions.</p></div></footer>
    </main>
  </div>;
}
