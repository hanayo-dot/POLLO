"use client";

import { Navbar } from "./Navbar";

export function AppShell({ children }: { children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 w-full flex flex-col">{children}</main>
      <footer className="border-t border-[#1c2a47]/70 bg-[#070d1e]/90 py-6 text-center text-xs text-gray-500">
        <p>© 2026 POLLO Research Initiative — Powered by NASA EOSDIS, GMAO MERRA-2, GPM IMERG, &amp; MODIS.</p>
      </footer>
    </div>
  );
}
