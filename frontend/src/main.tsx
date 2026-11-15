import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import TrendAnalysis from "./features/trend-analysis/TrendAnalysis";
import { AppShell } from "./components/ui/AppShell";
import "./app/globals.css";
const Dashboard = lazy(() => import("./app/page"));
const page = window.location.pathname === "/dashboard"
  ? <AppShell><Suspense fallback={<p>Loading dashboard…</p>}><Dashboard /></Suspense></AppShell>
  : <TrendAnalysis />;
createRoot(document.getElementById("root")!).render(page);
