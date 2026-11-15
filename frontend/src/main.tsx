import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import TrendAnalysis from "./features/trend-analysis/TrendAnalysis";
import "./app/globals.css";
const Dashboard = lazy(() => import("./app/page"));
const AppShell = lazy(() => import("./components/ui/AppShell").then(module => ({ default: module.AppShell })));
const Insights = lazy(() => import("./features/insights/Insights"));
const DataSources = lazy(() => import("./features/data-sources/DataSources"));
const page = window.location.pathname === "/dashboard"
  ? <Suspense fallback={<p>Loading dashboard…</p>}><AppShell><Dashboard /></AppShell></Suspense>
  : window.location.pathname === "/insights" ? <Suspense fallback={<p role="status">Loading insights…</p>}><Insights /></Suspense>
  : window.location.pathname === "/data-sources" ? <Suspense fallback={<p role="status">Loading data sources…</p>}><DataSources /></Suspense> : <TrendAnalysis />;
createRoot(document.getElementById("root")!).render(page);
