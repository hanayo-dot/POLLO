"use client";

import { Navbar } from "./Navbar";

export function AppShell({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) {
  if (fullWidth) return <div className="min-h-screen">{children}</div>;
  return <>
    <Navbar />
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    <footer className="border-t border-space-800 bg-space-900/60 py-6 text-center text-xs text-gray-500">
      <p>© 2026 POLLO Research Initiative — Powered by NASA EOSDIS, GMAO MERRA-2, GPM IMERG, &amp; MODIS.</p>
    </footer>
  </>;
}
