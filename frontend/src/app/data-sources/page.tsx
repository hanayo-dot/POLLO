import type { Metadata } from "next";
import DataSources from "../../features/data-sources/DataSources";

export const metadata: Metadata = {
  title: "POLLO | Data Sources",
  description: "Explore the verified data sources behind your climate investigation.",
};

export default function DataSourcesPage() { return <DataSources />; }
