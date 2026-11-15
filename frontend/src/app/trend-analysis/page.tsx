import type { Metadata } from "next";
import TrendAnalysis from "../../features/trend-analysis/TrendAnalysis";

export const metadata: Metadata = {
  title: "POLLO | Trend Analysis",
  description: "Explore how climate measurements change over time.",
};

export default function TrendAnalysisPage() {
  return <TrendAnalysis />;
}
