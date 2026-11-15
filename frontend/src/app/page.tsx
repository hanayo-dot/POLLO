"use client";

import React, { useRef } from "react";
import { PhotographicJourney } from "../components/landing/PhotographicJourney";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[500vh] bg-space-950 overflow-x-hidden"
    >
      {/* Fixed Interactive 5-Stage Photographic Camera Journey */}
      <PhotographicJourney containerRef={containerRef} />
    </div>
  );
}
