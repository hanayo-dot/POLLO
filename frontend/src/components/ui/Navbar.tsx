
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  BarChart2,
  Bell,
  Globe,
  Activity,
  Lightbulb,
  Database,
  Menu,
  X,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/investigate", label: "Investigate", icon: Search },
    { href: "/visualize", label: "Visualize", icon: BarChart2 },
    { href: "/trend-analysis", label: "Trend Analysis", icon: Activity },
    { href: "/insights", label: "Insights", icon: Lightbulb },
    { href: "/data-sources", label: "Data Sources", icon: Database },
  ];

  return (
    <header className="border-b border-[#1c2a47]/70 bg-[#070d1e]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setMenuOpen(false)}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-700 via-blue-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-[#070d1e] flex items-center justify-center">
              <Globe className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-wider text-white leading-tight">
              POLLO
            </span>
            <span className="text-[10px] text-gray-400 font-sans tracking-tight">
              Earth System Trend Detective
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 h-full text-xs font-medium transition-all ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-gray-400 hover:text-gray-200"
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

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-[#0e172e] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          <div className="hidden sm:flex w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs items-center justify-center shadow-md shadow-blue-600/30 font-sans select-none">
            JD
          </div>

          {/* Mobile and Tablet Menu Button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-[#0e172e] transition-colors"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile and Tablet Navigation */}
      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="lg:hidden border-t border-[#1c2a47]/70 bg-[#070d1e] px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-600/15 text-blue-400 font-semibold"
                      : "text-gray-300 hover:bg-[#0e172e] hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
};
