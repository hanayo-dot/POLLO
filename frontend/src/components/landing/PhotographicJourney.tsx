"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Sparkles,
  Compass,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";

interface PhotographicJourneyProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

interface StageMetadata {
  id: number;
  label: string;
  altitude: string;
  imageSrc: string;
  alt: string;
  startProgress: number;
  peakProgress: number;
  endProgress: number;
}

const STAGES: StageMetadata[] = [
  {
    id: 1,
    label: "Deep Space",
    altitude: "384,400 km • Moon & Comet",
    imageSrc: "/images/journey/stage1-deep-space.jpg",
    alt: "Deep space showing the Moon, starry cosmos and a passing comet",
    startProgress: 0.0,
    peakProgress: 0.12,
    endProgress: 0.28,
  },
  {
    id: 2,
    label: "Lunar Orbit",
    altitude: "8,500 km • Ingress to Earth",
    imageSrc: "/images/journey/stage2-approaching-earth.jpg",
    alt: "View across lunar cratered terrain looking toward planet Earth",
    startProgress: 0.18,
    peakProgress: 0.35,
    endProgress: 0.50,
  },
  {
    id: 3,
    label: "Atmosphere",
    altitude: "50 km • Stratospheric Rim",
    imageSrc: "/images/journey/stage3-earth-atmosphere.png",
    alt: "Sun rising over curved Earth horizon with blue atmospheric glow and cloud deck",
    startProgress: 0.40,
    peakProgress: 0.58,
    endProgress: 0.72,
  },
  {
    id: 4,
    label: "Cloud Deck",
    altitude: "7,500 m • Tropospheric Descent",
    imageSrc: "/images/journey/stage4-descending-clouds.jpg",
    alt: "Flying through sunlit cumulus clouds in bright blue sky",
    startProgress: 0.62,
    peakProgress: 0.78,
    endProgress: 0.90,
  },
  {
    id: 5,
    label: "Earth Surface",
    altitude: "0 m • Terrestrial Biosphere",
    imageSrc: "/images/journey/stage5-earth-surface.jpg",
    alt: "Lush green rolling hills and open fields under summer sky",
    startProgress: 0.82,
    peakProgress: 0.95,
    endProgress: 1.0,
  },
];

export const PhotographicJourney: React.FC<PhotographicJourneyProps> = ({ containerRef }) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [lerpedProgress, setLerpedProgress] = useState<number>(0);
  const [activeStageId, setActiveStageId] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);

  // Mouse parallax state for interactive 3D perspective
  const [mouseOffset, setMouseOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const targetProgressRef = useRef<number>(0);
  const currentLerpRef = useRef<number>(0);
  const autoPlayIntervalRef = useRef<any>(null);

  // Scroll listener & 60fps damped spring interpolation
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, scrollY / (scrollHeight || 1)));

      targetProgressRef.current = progress;
      setScrollProgress(progress);

      // Active stage determination
      let stage = 1;
      if (progress < 0.22) stage = 1;
      else if (progress < 0.45) stage = 2;
      else if (progress < 0.68) stage = 3;
      else if (progress < 0.88) stage = 4;
      else stage = 5;

      setActiveStageId(stage);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();

    // 60fps damped inertia loop for continuous camera motion
    let rafId: number;
    const render = () => {
      const diff = targetProgressRef.current - currentLerpRef.current;
      if (Math.abs(diff) > 0.0001) {
        currentLerpRef.current += diff * 0.14;
        setLerpedProgress(currentLerpRef.current);
      }
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      cancelAnimationFrame(rafId);
      if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
    };
  }, [containerRef]);

  // Interactive Mouse Parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const normX = (e.clientX - centerX) / centerX; // -1 to 1
      const normY = (e.clientY - centerY) / centerY; // -1 to 1

      setMouseOffset({
        x: normX * 12,
        y: normY * 10,
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Automated camera glide tour
  const toggleAutoFlight = () => {
    if (isAutoPlaying) {
      if (autoPlayIntervalRef.current) clearInterval(autoPlayIntervalRef.current);
      setIsAutoPlaying(false);
    } else {
      setIsAutoPlaying(true);
      autoPlayIntervalRef.current = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const currentY = window.scrollY;
        const step = 14;

        if (currentY + step >= scrollHeight) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: currentY + step, behavior: "auto" });
        }
      }, 25);
    }
  };

  const jumpToStage = (targetProgress: number) => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: targetProgress * scrollHeight,
      behavior: "smooth",
    });
  };

  /**
   * Calculate opacity and 3D camera zoom/elevation for each stage
   */
  const calculateLayerTransform = (stage: StageMetadata) => {
    const p = lerpedProgress;
    let opacity = 0;
    let scale = 1.0;
    let translateY = 0;

    if (p < stage.startProgress) {
      opacity = 0;
      scale = 1.0;
    } else if (p >= stage.startProgress && p <= stage.peakProgress) {
      const ratio = (p - stage.startProgress) / (stage.peakProgress - stage.startProgress || 0.01);
      opacity = Math.min(1, ratio);
      scale = 1.0 + ratio * 0.15;
      translateY = (1 - ratio) * 20;
    } else if (p > stage.peakProgress && p <= stage.endProgress) {
      const ratio = (p - stage.peakProgress) / (stage.endProgress - stage.peakProgress || 0.01);
      opacity = Math.max(0, 1 - ratio);
      scale = 1.15 + ratio * 0.25;
      translateY = -ratio * 30;
    } else {
      opacity = 0;
      scale = 1.4;
    }

    if (stage.id === 5 && p >= stage.peakProgress) {
      opacity = 1.0;
      scale = 1.0 + (p - stage.peakProgress) * 0.06;
      translateY = 0;
    }

    if (stage.id === 1 && p <= stage.startProgress) {
      opacity = 1.0;
      scale = 1.0;
      translateY = 0;
    }

    return {
      opacity,
      transform: `scale(${scale}) translate3d(${mouseOffset.x}px, ${translateY + mouseOffset.y}px, 0)`,
    };
  };

  const currentStageMeta = STAGES.find((s) => s.id === activeStageId) || STAGES[0];

  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden bg-space-950 select-none">
      {/* 5 Photographic Stage Layers with Interactive Parallax & Camera Zoom */}
      {STAGES.map((stage) => {
        const { opacity, transform } = calculateLayerTransform(stage);

        return (
          <div
            key={stage.id}
            className="absolute inset-0 w-full h-full will-change-transform pointer-events-none"
            style={{
              opacity,
              transition: "opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Ambient Background Glow Layer for Ultrawide displays */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl opacity-35 scale-110"
              style={{ backgroundImage: `url(${stage.imageSrc})` }}
              aria-hidden="true"
            />

            {/* High-Definition Foreground Image */}
            <img
              src={stage.imageSrc}
              alt={stage.alt}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-75 ease-out"
              style={{ transform }}
            />
          </div>
        );
      })}

      {/* Subtle Atmospheric Contrast Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-space-950/80 via-transparent to-space-950/50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-space-950/35 via-transparent to-space-950/35 pointer-events-none" />

      {/* FIXED HERO WORDS: Pinned stationary over the scrolling visual flight */}
      <div className="fixed inset-0 flex flex-col justify-center items-center px-6 text-center z-20 pointer-events-none">
        <div className="max-w-4xl space-y-6">
          {/* Main Headline from User Screenshot */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
            Earth is constantly
            <br />
            changing.
            <br />
            <span className="bg-gradient-to-r from-nasa-cyan via-sky-300 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(0,229,255,0.4)]">
              Are we paying attention?
            </span>
          </h1>

          {/* Subtitle from User Screenshot */}
          <p className="text-base sm:text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
            Explore multi-decadal patterns, uncover critical environmental trends, and
            understand the physical forces shaping our planet through authentic NASA
            satellite observations.
          </p>

          {/* Buttons from User Screenshot */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pointer-events-auto">
            <Link
              href="/investigate"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-nasa-blue to-blue-600 hover:from-blue-600 hover:to-nasa-cyan text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xl shadow-nasa-blue/40 border border-nasa-cyan/40 hover:scale-105 transition-all group"
            >
              <span>Launch First Investigation</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              onClick={() => jumpToStage(0.35)}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-space-900/80 hover:bg-space-800 text-gray-200 hover:text-white font-medium text-sm flex items-center justify-center gap-2 border border-space-700/80 backdrop-blur-md transition-all shadow-lg"
            >
              <span>Explore The Journey</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </div>

          {/* Scroll Indicator from User Screenshot */}
          <div className="pt-8 flex flex-col items-center gap-2 text-xs text-gray-300 font-mono drop-shadow">
            <span>Scroll to travel towards Earth</span>
            <div className="w-5 h-8 rounded-full border-2 border-gray-400/80 flex items-start justify-center p-1 bg-space-950/40 backdrop-blur-sm">
              <div className="w-1 h-2 rounded-full bg-nasa-cyan animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE FLIGHT HUD & STAGE SCRUBBER (Bottom) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-3 bg-space-950/90 backdrop-blur-md border border-space-800/90 rounded-2xl px-5 py-2.5 text-xs font-mono shadow-2xl max-w-2xl w-[92%] sm:w-auto justify-between">
        {/* Auto Flight Toggle */}
        <button
          onClick={toggleAutoFlight}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
            isAutoPlaying
              ? "bg-nasa-cyan text-space-950 font-bold"
              : "bg-space-850 hover:bg-space-800 text-gray-200"
          }`}
          title={isAutoPlaying ? "Pause automated flight" : "Start automated camera flight tour"}
        >
          {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span className="text-[11px] hidden sm:inline">{isAutoPlaying ? "Pause" : "Auto Flight"}</span>
        </button>

        {/* Live Stage Readout */}
        <div className="flex items-center gap-2 px-2 border-l border-r border-space-800">
          <span className="w-2.5 h-2.5 rounded-full bg-nasa-cyan animate-ping shrink-0" />
          <span className="text-white font-bold truncate">{currentStageMeta.label}</span>
          <span className="text-nasa-cyan font-bold">
            {Math.round(scrollProgress * 100)}%
          </span>
        </div>

        {/* Interactive Click-to-Fly Stage Buttons */}
        <div className="flex items-center gap-1 text-[11px]">
          {STAGES.map((s) => {
            const isActive = activeStageId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => jumpToStage(s.peakProgress)}
                className={`px-2 py-1 rounded-md transition-all ${
                  isActive
                    ? "bg-nasa-blue text-white font-bold border border-nasa-cyan/40 shadow-sm"
                    : "text-gray-400 hover:text-white hover:bg-space-800"
                }`}
                title={s.altitude}
              >
                {s.id}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
