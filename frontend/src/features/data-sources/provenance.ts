import type { DatasetVariable } from "../../types";
import type { Analysis, Selection } from "../insights/findings";

export interface Reference { title: string; url: string }
export interface DatasetDocumentation {
  title: string;
  description: string;
  processing: string;
  limitations: string;
  references: Reference[];
}

const weather = { title: "Open-Meteo historical weather API — data access and attribution", url: "https://open-meteo.com/en/docs/historical-weather-api" };
const era5 = { title: "Hersbach et al. (2020). The ERA5 global reanalysis. doi:10.1002/qj.3803", url: "https://doi.org/10.1002/qj.3803" };
const land = { title: "Muñoz-Sabater et al. (2021). ERA5-Land: a state-of-the-art global reanalysis dataset for land applications. doi:10.5194/essd-13-4349-2021", url: "https://doi.org/10.5194/essd-13-4349-2021" };

/** Documentation describes the actual observational paths implemented by the backend. */
export const documentation: Record<string, DatasetDocumentation> = {
  ERA5_RAIN: {
    title: "ERA5",
    description: "Liquid rainfall from ECMWF reanalysis, accessed through Open-Meteo. Reanalysis combines observations with a physical model; it is not a direct satellite rainfall retrieval.",
    processing: "The backend requests ERA5 daily rain sums and adds them into monthly totals. Months with missing daily values are excluded.",
    limitations: "Rainfall here is liquid rain, not total precipitation including snow. A reference grid cell represents the investigation; local terrain and convective rainfall may differ within that cell.",
    references: [era5, weather],
  },
  ERA5_TEMP: {
    title: "ERA5-Land",
    description: "Near-surface air temperature from ECMWF land reanalysis, accessed through Open-Meteo. This is temperature at 2 metres, not satellite land surface temperature.",
    processing: "The backend averages daily mean 2-metre temperatures into monthly means, retaining only complete months.",
    limitations: "Modelled air temperature may differ from local station conditions. Air temperature and MODIS land surface temperature are distinct quantities and cannot be substituted without additional analysis.",
    references: [land, weather],
  },
  ERA5_SOIL: {
    title: "ERA5-Land",
    description: "Surface soil moisture from ECMWF land reanalysis, accessed through Open-Meteo. It represents the model's upper 0–7 cm soil layer.",
    processing: "Daily mean surface soil moisture is averaged into monthly values. Months with incomplete daily observations are excluded.",
    limitations: "Surface moisture is not root-zone moisture. Soil parameters and grid-cell averaging limit interpretation for individual fields and irrigation decisions.",
    references: [land, weather],
  },
  MODIS_NDVI: {
    title: "MODIS · MOD13Q1",
    description: "NASA Terra MODIS vegetation greenness (NDVI), retrieved through ORNL DAAC. NDVI describes vegetation condition; it does not classify land cover.",
    processing: "The backend retains 16-day composites with pixel reliability 0, scales NDVI by 0.0001 and averages available good-quality values by month. At least one good composite is required per month.",
    limitations: "Clouds and quality screening can leave gaps. NDVI does not directly measure yield, biomass or a land cover class. The backend does not report a collection version; confirm the granule version before assigning a version-specific DOI.",
    references: [
      { title: "NASA MODIS Vegetation Indices (MOD13) product documentation", url: "https://modis.gsfc.nasa.gov/data/dataprod/mod13.php" },
      { title: "ORNL DAAC MODIS and VIIRS land-product subsets — data access", url: "https://modis.ornl.gov/data/modis_webservice.html" },
    ],
  },
};

export function usedDatasets(catalog: DatasetVariable[], analysis: Analysis, selection: Selection): DatasetVariable[] {
  if (analysis.region?.id !== selection.region || analysis.variable?.id !== selection.variable) throw new Error("The returned source does not match the investigation. Run Trend Analysis again.");
  if (!analysis.source || !["reanalysis", "satellite"].includes(analysis.source.kind)) throw new Error("No verified observational source was returned. Benchmark data cannot be presented as investigation evidence.");
  if (!Array.isArray(analysis.series)) throw new Error("The analysis measurements are invalid.");
  const dataset = catalog.find(item => item.id === analysis.variable.id);
  if (!dataset) throw new Error("The investigation's dataset is missing from the backend catalog.");
  if (!dataset.supported_regions?.includes(selection.region)) throw new Error("The catalog does not support this dataset for the selected region.");
  return analysis.series.some(point => Number.isFinite(point.value)) ? [dataset] : [];
}

export function safeSourceURL(value?: string): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}

export const NASA_REFERENCES: Reference[] = [
  { title: "IMERG — NASA multi-satellite precipitation estimates", url: "https://gpm.nasa.gov/data/imerg" },
  { title: "MODIS MOD11 — land surface temperature and emissivity", url: "https://modis.gsfc.nasa.gov/data/dataprod/mod11.php" },
  { title: "MCD12Q1 — annual land cover type classification", url: "https://modis.gsfc.nasa.gov/data/dataprod/mod12.php" },
];
