"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Compass,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  Film,
} from "lucide-react";

interface SpaceJourneyVideoProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onStageChange?: (stage: number) => void;
}

export const SpaceJourneyVideo: React.FC<SpaceJourneyVideoProps> = ({
  containerRef,
  onStageChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(17.8);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeStage, setActiveStage] = useState<number>(1);
  const [objectFitMode, setObjectFitMode] = useState<"contain" | "cover">("cover");

  // Exact known duration of this screencast
  const KNOWN_DURATION = 17.801;

  useEffect(() => {
    const video = videoRef.current;
    const bgVideo = bgVideoRef.current;
    if (!video) return;

    // Initial configuration: mute and pause so scrolling controls motion
    video.muted = true;
    video.pause();
    if (bgVideo) {
      bgVideo.muted = true;
      bgVideo.pause();
    }

    const handleLoadedMetadata = () => {
      const dur = video.duration && !Number.isNaN(video.duration) && video.duration > 0
        ? video.duration
        : KNOWN_DURATION;
      setVideoDuration(dur);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    let isSeeking = false;
    let targetTime = 0;

    const onSeeked = () => {
      isSeeking = false;
    };
    video.addEventListener("seeked", onSeeked);

    // Continuous RAF loop for seeking without stutter
    let animationId: number;
    const renderLoop = () => {
      if (video && !Number.isNaN(targetTime)) {
        const diff = Math.abs(video.currentTime - targetTime);
        if (diff > 0.03 && !isSeeking) {
          isSeeking = true;
          video.currentTime = targetTime;
          if (bgVideo) {
            bgVideo.currentTime = targetTime;
          }
          setCurrentTime(targetTime);
        }
      }
      animationId = requestAnimationFrame(renderLoop);
    };
    animationId = requestAnimationFrame(renderLoop);

    // Scroll listener: directly maps scroll position to video timeline
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, scrollY / (scrollHeight || 1)));

      setScrollProgress(progress);

      const dur = video.duration && !Number.isNaN(video.duration) && video.duration > 0
        ? video.duration
        : KNOWN_DURATION;

      // Calculate video target time based on scroll progress
      targetTime = Math.min(dur - 0.04, Math.max(0, progress * dur));

      // Calculate flight stage (1 to 5)
      let stage = 1;
      if (progress < 0.2) stage = 1; // Deep space
      else if (progress < 0.45) stage = 2; // Approaching Earth
      else if (progress < 0.68) stage = 3; // Atmosphere
      else if (progress < 0.88) stage = 4; // Cloud descent
      else stage = 5; // Earth observation

      setActiveStage(stage);
      if (onStageChange) onStageChange(stage);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    // Initial sync
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      cancelAnimationFrame(animationId);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [containerRef, onStageChange]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    const bgVideo = bgVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      if (bgVideo) bgVideo.pause();
      setIsPlaying(false);
    } else {
      video.play();
      if (bgVideo) bgVideo.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const jumpToStage = (stageProgress: number) => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: stageProgress * scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div className="fixed inset-0 w-full h-full z-0 overflow-hidden select-none pointer-events-none">
      {/* 1. Ambient Background Glow Video Layer (fills widescreen with soft ambient light) */}
      <video
        ref={bgVideoRef}
        src="/landing-earth-journey.webm"
        className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-35 scale-110"
        playsInline
        muted
        preload="auto"
        aria-hidden="true"
      />

      {/* 2. Main Foreground Video (High-Definition Screencast Video) */}
      <video
        ref={videoRef}
        src="/landing-earth-journey.webm"
        className={`absolute inset-0 w-full h-full transition-all duration-300 ${
          objectFitMode === "cover" ? "object-cover" : "object-contain"
        }`}
        playsInline
        muted={isMuted}
        preload="auto"
      />

      {/* 3. Subtle Gradient Overlays for High Legibility (Light and Non-Obtrusive) */}
      <div className="absolute inset-0 bg-gradient-to-t from-space-950/80 via-transparent to-space-950/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-space-950/30 via-transparent to-space-950/30 pointer-events-none" />

      {/* 4. Telemetry Motion HUD Bar (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-auto flex flex-wrap items-center gap-3 bg-space-950/85 backdrop-blur-md border border-space-800 rounded-xl px-4 py-2.5 text-xs font-mono shadow-2xl">
        <div className="flex items-center gap-2 pr-3 border-r border-space-800">
          <button
            onClick={togglePlayPause}
            className="p-1.5 rounded-lg bg-space-850 hover:bg-space-800 text-gray-200 hover:text-white transition-colors"
            title={isPlaying ? "Pause Video Playback" : "Auto-Play Video"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-space-850 hover:bg-space-800 text-gray-200 hover:text-white transition-colors"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setObjectFitMode(objectFitMode === "cover" ? "contain" : "cover")}
            className="p-1.5 rounded-lg bg-space-850 hover:bg-space-800 text-gray-200 hover:text-white transition-colors"
            title={objectFitMode === "cover" ? "Switch to Fit Screen (Contain)" : "Switch to Fill Screen (Cover)"}
          >
            {objectFitMode === "cover" ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Live Scroll-Scrub Indicator */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-nasa-cyan animate-pulse" />
          <span className="text-gray-300 font-semibold">
            {isPlaying ? "Continuous Playback" : "Scroll-Driven Motion Active"}
          </span>
          <span className="text-nasa-cyan">
            {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
          </span>
        </div>

        {/* Quick Stage Shortcuts */}
        <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-space-800 text-[11px] text-gray-400">
          <button onClick={() => jumpToStage(0.0)} className="hover:text-nasa-cyan px-1 transition-colors">
            Space
          </button>
          <span>•</span>
          <button onClick={() => jumpToStage(0.35)} className="hover:text-nasa-cyan px-1 transition-colors">
            Orbit
          </button>
          <span>•</span>
          <button onClick={() => jumpToStage(0.55)} className="hover:text-nasa-cyan px-1 transition-colors">
            Atmosphere
          </button>
          <span>•</span>
          <button onClick={() => jumpToStage(0.95)} className="hover:text-nasa-cyan px-1 transition-colors">
            Surface
          </button>
        </div>
      </div>
    </div>
  );
};
