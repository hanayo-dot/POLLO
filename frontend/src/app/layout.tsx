import type { Metadata } from "next";
import "./globals.css";
import { NextAppShell } from "../components/ui/NextAppShell";

export const metadata: Metadata = {
  title: "POLLO — Planetary Intelligence & Earth System Divergence",
  description: "Explore climate measurements and statistical trends across regions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body className="bg-space-950 text-gray-100 flex flex-col min-h-screen"><NextAppShell>{children}</NextAppShell></body></html>;
}
