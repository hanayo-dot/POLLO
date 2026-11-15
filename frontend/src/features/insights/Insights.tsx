"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "gsap";
import { ArrowDownRight, ArrowLeft, ArrowUpDown, ArrowUpRight, CalendarDays, ChartColumnIncreasing, ChartLine, Check, Database, Download, Droplets, FileText, House, Leaf, Lightbulb, LoaderCircle, MapPin, Minus, Search, Sparkles, Sprout, Star, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fetchTimeSeries } from "../../services/api";
import { VariableIllustration } from "../trend-analysis/VariableIllustration";
import { variableKind } from "../trend-analysis/variables";
import { buildReport, describeFindings, formatP, hasTrend, readSelection } from "./findings";
import type { Analysis, Selection } from "./findings";

const NAV_LINK = "flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-sm transition-colors hover:text-cyan-200 max-[600px]:text-xs";
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

  return <div ref={root} className="insights-page relative isolate min-h-screen overflow-clip bg-discovery-space font-[Arial,Helvetica,sans-serif] text-[#f4f7ff] [&_:focus-visible]:outline [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-4 [&_:focus-visible]:outline-cyan-200">
    <a className="fixed left-2 top-2 z-50 -translate-y-[150%] rounded-lg bg-discovery-surface p-3 focus:translate-y-0" href="#insights-main">Skip to findings</a>
    <div className="insights-earth pointer-events-none absolute right-0 top-[63px] -z-10 h-[310px] w-full max-[600px]:top-[116px] max-[600px]:opacity-40" aria-hidden="true"/>

    <nav className="relative z-30 flex min-h-[62px] items-center justify-between gap-[18px] border-b border-[#164165] bg-[#02101ee8] px-[max(28px,calc((100vw-1560px)/2))] max-[1250px]:flex-wrap max-[1250px]:py-2.5 max-[600px]:px-4" aria-label="Main navigation">
      <a className="flex shrink-0 items-center gap-2.5 text-[27px] font-bold tracking-tight max-[600px]:gap-1 max-[600px]:text-xl" href="/dashboard"><svg viewBox="0 0 70 52" className="h-11 w-14 text-cyan-300 max-[600px]:h-9 max-[600px]:w-10" fill="none" aria-hidden="true"><circle cx="34" cy="26" r="21" stroke="currentColor" strokeWidth="1.8"/><ellipse cx="34" cy="27" rx="33" ry="9" transform="rotate(-25 34 27)" stroke="currentColor" strokeWidth="1.8"/><path d="M19 23c1-9 8-15 16-14" stroke="currentColor" strokeWidth="2"/></svg><span>POLLO</span></a>
      <div className="flex items-center justify-center gap-[clamp(8px,1.2vw,24px)] max-[1250px]:order-3 max-[1250px]:w-full max-[1250px]:justify-between max-[1250px]:overflow-x-auto max-[600px]:justify-start max-[600px]:gap-[18px] [&_svg]:h-[22px] [&_svg]:w-[22px] [&_span]:max-[600px]:sr-only">
        <a href="/dashboard" aria-label="Home" className={NAV_LINK}><House aria-hidden="true"/><span>Home</span></a>
        <a href={`${back}#analysis-controls`} aria-label="Investigate" className={NAV_LINK}><Search aria-hidden="true"/><span>Investigate</span></a>
        <a href={`${back}#trend-chart`} aria-label="Visualise" className={NAV_LINK}><ChartColumnIncreasing aria-hidden="true"/><span>Visualise</span></a>
        <a href={back} aria-label="Trend Analysis" className={NAV_LINK}><ChartLine aria-hidden="true"/><span>Trend Analysis</span></a>
        <a href="#insights-main" aria-current="page" aria-label="Insights" className={`${NAV_LINK} rounded-full border border-cyan-300 bg-cyan-500/10 px-[17px] shadow-[inset_0_-3px_8px_#00c8ff38] [&_svg]:text-cyan-300 [&_span]:max-[600px]:not-sr-only`}><Lightbulb aria-hidden="true"/><span>Insights</span></a>
        <a href="#insights-source" aria-label="Data Sources" className={NAV_LINK}><Database aria-hidden="true"/><span>Data Sources</span></a>
      </div>
      <span className="flex max-w-[250px] items-center gap-[9px] rounded-full border border-[#164b71] bg-[#061d30c9] px-[17px] py-2 text-sm max-[600px]:max-w-[180px] max-[600px]:text-xs"><MapPin size={20} className="shrink-0 text-discovery-earth" aria-hidden="true"/>{data?.region.name || "Your investigation"}</span>
    </nav>

    <main id="insights-main" className="mx-auto w-[calc(100%-96px)] max-w-[1560px] pb-6 max-[1250px]:w-[calc(100%-48px)] max-[600px]:w-[calc(100%-28px)]" tabIndex={-1}>
      <header className="insights-reveal pl-[58px] pt-[25px] max-[950px]:pl-3 max-[600px]:pl-1">
        <p className="mb-2 text-sm font-bold leading-[18px] tracking-[.16em] text-cyan-300">INSIGHTS &amp; FINDINGS</p>
        <h1 className="text-[clamp(25px,2.1vw,34px)] font-bold leading-[1.3] tracking-[-.6px] max-[600px]:text-[27px]">Key <em className="insights-discoveries relative text-cyan-400">Discoveries</em> from Your Investigation</h1>
        <p className="mt-2 text-[17px] leading-normal max-[600px]:text-[15px]">A clear, data-based summary of what the analysis reveals about environmental changes.</p>
      </header>

      <section className="insights-panel insights-reveal mx-4 mb-5 mt-6 grid min-h-[78px] grid-cols-[1.25fr_1fr_auto] items-center gap-7 border-cyan-400 bg-gradient-to-r from-[#07334cd9] to-[#03182be8] px-[34px] py-[13px] shadow-[inset_0_0_20px_#009edb24] max-[1250px]:mx-0 max-[1250px]:gap-[18px] max-[1250px]:px-[22px] max-[1250px]:py-4 max-[950px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:rounded-[20px] max-[600px]:p-[18px]" aria-label="Analysis selection">
        <div className="flex min-w-0 items-center gap-5 border-r border-[#477795] pr-[18px] text-lg max-[1250px]:gap-3 max-[1250px]:text-[15px] max-[600px]:border-0"><Droplets className="h-[30px] w-[30px] shrink-0 text-cyan-200" aria-hidden="true"/><span>Analysis: <strong>{findings ? `${findings.label} in ${data!.region.name}` : data ? `${data.variable.name} in ${data.region.name}` : loading ? "Loading your investigation…" : "No analysis selected"}</strong></span></div>
        <div className="flex min-w-0 items-center gap-5 text-lg max-[1250px]:gap-3 max-[1250px]:text-[15px]"><CalendarDays className="h-[30px] w-[30px] shrink-0 text-cyan-200" aria-hidden="true"/><span>Period: <strong>{selection ? `${selection.start} – ${selection.end}` : "Select in Trend Analysis"}</strong></span></div>
        <a className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-[#3a789e] bg-gradient-to-t from-[#123753] to-[#082139] px-[22px] py-2.5 text-base transition hover:-translate-y-0.5 hover:border-cyan-300 motion-reduce:transform-none motion-reduce:transition-none max-[1250px]:px-[15px] max-[1250px]:text-sm max-[950px]:col-span-2 max-[950px]:justify-self-start max-[600px]:col-span-1" href={back}><ArrowLeft size={21} aria-hidden="true"/>Back to Trend Analysis</a>
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
