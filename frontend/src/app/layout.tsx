import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "../components/ui/Navbar";

export const metadata: Metadata = {
  title: "POLLO — Planetary Intelligence & Earth System Divergence",
  description: "Advanced non-parametric trend detection and climate divergence platform powered by authentic NASA Earth Science data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-space-950 text-gray-100 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
        <footer className="border-t border-space-800 bg-space-900/60 py-6 text-center text-xs text-gray-500">
          <p>© 2026 POLLO Research Initiative — Powered by NASA EOSDIS, GMAO MERRA-2, GPM IMERG, & MODIS.</p>
        </footer>
      </body>
    </html>
  );
}
