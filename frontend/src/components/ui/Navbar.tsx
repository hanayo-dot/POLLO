"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  BarChart2,
  Compass,
  Bell,
  Globe,
  BookOpen,
  Activity,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/investigate", label: "Investigate", icon: Search },
    { href: "/visualize", label: "Visualize", icon: BarChart2 },
    { href: "/trend-analysis", label: "Trend Analysis", icon: Activity },
    { href: "/research", label: "Research Hub", icon: BookOpen },
    { href: "/dashboard", label: "Dashboard", icon: Compass },
  ];

  return (
    <header className="border-b border-[#1c2a47]/70 bg-[#070d1e]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-[#070d1e] flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-wider text-white leading-tight">POLLO</span>
            <span className="text-[10px] text-gray-400 font-sans tracking-tight">Earth System Trend Detective</span>
          </div>
        </Link>

        {/* Center Navigation Links with Underline Indicator */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 h-full text-xs font-medium transition-all ${
                  isActive ? "text-white font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Notifications & Avatar */}
        <div className="flex items-center gap-4">
          <button
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#0e172e] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/30 font-sans select-none">
            JD
          </div>
        </div>
      </div>
    </header>
  );
};
