import type { Metadata } from "next";
import Insights from "../../features/insights/Insights";

export const metadata: Metadata = {
  title: "POLLO | Insights & Findings",
  description: "Discover what your climate analysis reveals.",
};

export default function InsightsPage() {
  return <Insights />;
}
