import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import TrendAnalysis from "./features/trend-analysis/TrendAnalysis";
import { AppShell } from "./components/ui/AppShell";
import "./app/globals.css";
const Dashboard = lazy(() => import("./app/page"));
const Insights = lazy(() => import("./features/insights/Insights"));
const page = window.location.pathname === "/dashboard"
  ? <AppShell><Suspense fallback={<p>Loading dashboard…</p>}><Dashboard /></Suspense></AppShell>
  : window.location.pathname === "/insights" ? <Suspense fallback={<p role="status">Loading insights…</p>}><Insights /></Suspense> : <TrendAnalysis />;
createRoot(document.getElementById("root")!).render(page);
