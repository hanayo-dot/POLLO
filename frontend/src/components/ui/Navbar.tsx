import React from "react";
import { Globe2, Satellite, Activity, ShieldCheck, Database } from "lucide-react";

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-space-800 bg-space-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-nasa-blue via-indigo-600 to-nasa-cyan flex items-center justify-center shadow-lg shadow-nasa-blue/20">
            <Globe2 className="w-6 h-6 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-wider text-white">POLLO</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-nasa-blue/30 text-nasa-cyan border border-nasa-blue/50 font-mono">
                TREND-X v1.0
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-sans tracking-wide">
              Planetary Intelligence & Earth Observation Divergence
            </p>
          </div>
        </div>

        {/* Live Badges */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-850 border border-space-700 text-xs">
            <Satellite className="w-4 h-4 text-nasa-cyan" />
            <span className="text-gray-300">NASA Earthdata:</span>
            <span className="text-emerald-400 font-mono font-medium">GIBS Connected</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-space-850 border border-space-700 text-xs">
            <Activity className="w-4 h-4 text-nasa-amber" />
            <span className="text-gray-300">Benchmark:</span>
            <span className="text-white font-mono font-medium">Lake Victoria Basin</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Mann-Kendall & Sen's Slope Verified</span>
          </div>
        </div>
      </div>
    </header>
  );
};
