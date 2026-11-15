"use client";

import { useEffect, useId, useRef } from "react";
import { gsap } from "gsap";
import type { ClimateVariable } from "./variables";

/** Decorative variable cue, independent of measured trend direction. */
export function VariableIllustration({ kind }: { kind: ClimateVariable }) {
  const root = useRef<SVGSVGElement>(null);
  const prefix = useId().replace(/:/g, "");
  const fill = (name: string) => `url(#${prefix}-${name})`;

  useEffect(() => {
    const motion = gsap.matchMedia();
    motion.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        if (kind === "rainfall") {
          gsap.fromTo(".variable-rain", { y: -3, opacity: 0.35 }, { y: 9, opacity: 1, repeat: -1, duration: 1.1, stagger: 0.22, ease: "none" });
          gsap.to(".variable-cloud", { y: -2, duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut" });
        } else if (kind === "temperature") {
          gsap.to(".variable-sun-rays", { rotation: 360, transformOrigin: "50% 50%", duration: 40, repeat: -1, ease: "none" });
          gsap.to(".variable-heat", { y: -5, opacity: 0.4, duration: 1.8, stagger: 0.3, repeat: -1, yoyo: true, ease: "sine.inOut" });
        } else if (kind === "vegetation") {
          gsap.to(".variable-stem", { rotation: 4, svgOrigin: "120 91", duration: 2.5, stagger: 0.35, repeat: -1, yoyo: true, ease: "sine.inOut" });
          gsap.to(".variable-sun", { opacity: 0.6, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut" });
        } else {
          gsap.fromTo(".variable-water", { y: -5, opacity: 1 }, { y: 15, opacity: 0.1, duration: 2, stagger: 0.5, repeat: -1, ease: "power1.in" });
          gsap.fromTo(".variable-ripple", { scaleX: 0.6, opacity: 0.7, transformOrigin: "50% 50%" }, { scaleX: 1.15, opacity: 0.15, duration: 2.5, repeat: -1, ease: "sine.out" });
        }
      }, root);
      return () => context.revert();
    });
    return () => motion.revert();
  }, [kind]);

  return <svg ref={root} className="trend-variable-illustration" data-variable={kind} viewBox="0 0 240 105" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${prefix}-cloud`} x1="118" y1="7" x2="118" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#a8ffff" /><stop offset=".35" stopColor="#00c7f2" /><stop offset="1" stopColor="#0057a1" /></linearGradient>
      <linearGradient id={`${prefix}-land`} x1="130" y1="75" x2="130" y2="108" gradientUnits="userSpaceOnUse"><stop stopColor="#7bd52e" /><stop offset="1" stopColor="#092f35" /></linearGradient>
      <linearGradient id={`${prefix}-leaf`}><stop stopColor="#c7fb3d" /><stop offset="1" stopColor="#059749" /></linearGradient>
      <linearGradient id={`${prefix}-soil`} x1="120" y1="61" x2="120" y2="105" gradientUnits="userSpaceOnUse"><stop stopColor="#a77b45" /><stop offset="1" stopColor="#483f32" /></linearGradient>
      <linearGradient id={`${prefix}-warm`} x1="138" y1="30" x2="138" y2="86" gradientUnits="userSpaceOnUse"><stop stopColor="#ffd56b" /><stop offset="1" stopColor="#ff715f" /></linearGradient>
    </defs>
    {kind === "soil-moisture" ? <>
      <path d="M18 68Q119 44 221 68L233 104H7Z" fill={fill("soil")} stroke="#b59d66" />
      <path d="M22 77q99-20 197 0M17 92q104-21 208 0" stroke="#c4aa7044" strokeWidth="2" />
      <path d="M96 66c12 13-6 15 6 30m40-32c-10 12 7 18-1 35m-24-37c-6 12 9 18 2 39" stroke="#16cadd" strokeWidth="2" opacity=".6" />
      {[85, 120, 155].map((x, i) => <path className="variable-water" key={x} d={`M${x} ${14 + i * 4}c-4 8-10 13-10 19a10 10 0 0 0 20 0c0-6-6-11-10-19Z`} fill={fill("cloud")} stroke="#8df4ff" />)}
      <ellipse className="variable-ripple" cx="120" cy="64" rx="49" ry="5" stroke="#4feef0" />
      <path d="m49 88 4 1m134-3 4-1m-119 12 3 1m100 0 3-1" stroke="#cfb887" strokeWidth="2" strokeLinecap="round" />
    </> : <>
      <path d="M2 104c51-23 91-25 130-25 41 0 70 14 106 25" fill={fill("land")} stroke="#3bbd5e" />
      <path d="M47 103c40-17 75-19 103-14 30 5 47 10 68 15M82 103c15-9 36-16 60-19" stroke="#a0cb25" strokeWidth="1.6" />
    </>}
    {kind === "rainfall" && <>
      <path className="variable-cloud" d="M86 43c-16 2-20-18-8-25 6-4 13-2 17 1 4-22 34-23 40-2 12-7 25 2 25 12 19 0 18 17 3 18H89" fill={fill("cloud")} stroke="#88f6ff" strokeWidth="1.8" />
      <g stroke="#00d5ff" strokeWidth="2" strokeLinecap="round">{[0, 1, 2].map(i => <path className="variable-rain" key={i} d={`m${91 + i * 18} 55-4 7m${100 + i * 18} 67-4 7`} />)}</g>
      <g fill={fill("leaf")} stroke="#a0e457" strokeWidth=".6"><path d="M65 94V65m0 11c-13 0-17-12-17-12 12-2 19 6 17 12Zm0 7c0-11 11-14 11-14 3 9-3 15-11 14ZM176 94V65m0 12c-2-12 11-15 11-15 1 11-5 16-11 15Zm0 8c-12 0-16-11-16-11 12-3 18 6 16 11Z" /></g>
    </>}
    {kind === "temperature" && <>
      <g className="variable-sun-rays" stroke="#ffca63" strokeWidth="2" strokeLinecap="round"><path d="M76 5v7m0 42v7M48 33h7m42 0h7M56 13l5 5m30 30 5 5M56 53l5-5m30-30 5-5" /></g>
      <circle cx="76" cy="33" r="17" fill="#ffcc60" stroke="#ffeab5" strokeWidth="1.5" />
      <path d="M132 60V24a8 8 0 0 1 16 0v36a17 17 0 1 1-16 0Z" fill="#09283b" stroke="#d5f7ff" strokeWidth="2" />
      <path d="M140 39v34" stroke={fill("warm")} strokeWidth="7" strokeLinecap="round" /><circle cx="140" cy="75" r="10" fill={fill("warm")} />
      <path d="M150 31h5m-5 10h5m-5 10h5" stroke="#bdeaf1" strokeWidth="1.5" />
      {[176, 191, 206].map(x => <path className="variable-heat" key={x} d={`M${x} 70c-9-7 9-13 0-21s9-13 0-21`} stroke="#ffc879" strokeWidth="2" strokeLinecap="round" />)}
    </>}
    {kind === "vegetation" && <>
      <circle className="variable-sun" cx="186" cy="23" r="13" fill="#ffe481" opacity=".9" />
      {[{ x: 75, y: 42 }, { x: 119, y: 16 }, { x: 160, y: 45 }].map(({ x, y }) => <g key={x} className="variable-stem" fill={fill("leaf")} stroke="#a9eb78" strokeWidth="1">
        <path d={`M${x} 94Q${x - 4} 64 ${x} ${y}`} stroke="#8edf68" strokeWidth="2" />
        <path d={`M${x} ${y + 24}c-25 0-26-19-26-19 22-4 28 9 26 19Zm0 13c2-23 24-25 24-25 2 20-11 27-24 25Zm0-32c-6-15 4-24 4-24 14 12 6 21-4 24Z`} />
      </g>)}
    </>}
  </svg>;
}
