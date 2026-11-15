import { Region, DatasetVariable, TimeSeriesPoint, TrendResult, DivergenceAnalysis, GIBSLayer, DataSource } from "../types";

const API_BASE = (globalThis as { __POLLO_API_URL__?: string }).__POLLO_API_URL__ || "/api/v1";

export async function fetchHealth(): Promise<{ status: string; version: string; mode: string }> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return { status: "offline", version: "1.0.0", mode: "local-fallback" };
  }
}

export async function fetchRegions(): Promise<Region[]> {
  try {
    const res = await fetch(`${API_BASE}/regions`);
    if (!res.ok) throw new Error("Failed to fetch regions");
    return await res.json();
  } catch (err) {
    // Fallback baseline regions
    return [
      {
        id: "lake_victoria_basin",
        name: "Lake Victoria Basin",
        country: "East Africa (Multi-national)",
        jurisdictions: ["Uganda", "Kenya", "Tanzania", "Rwanda", "Burundi"],
        bbox: { min_lon: 29.0, min_lat: -4.5, max_lon: 36.0, max_lat: 2.5 },
        area_sq_km: 251000,
        description: "Benchmark region exhibiting acute hydrological variability and convective storm generation.",
      },
      {
        id: "horn_of_africa",
        name: "Horn of Africa",
        country: "East Africa",
        jurisdictions: ["Somalia", "Ethiopia", "Kenya"],
        bbox: { min_lon: 40.0, min_lat: 0.0, max_lon: 51.5, max_lat: 12.0 },
        area_sq_km: 750000,
        description: "Arid and semi-arid ecosystem subject to multi-year rainfall failures.",
      },
      {
        id: "congo_basin",
        name: "Congo Rainforest Basin",
        country: "Central Africa",
        jurisdictions: ["DR Congo", "Congo", "Gabon", "Cameroon"],
        bbox: { min_lon: 14.0, min_lat: -5.0, max_lon: 29.0, max_lat: 5.0 },
        area_sq_km: 3700000,
        description: "Equatorial rainforest carbon sink and planetary atmospheric moisture pump.",
      },
      {
        id: "sahel_belt",
        name: "Sudano-Sahel Transition Belt",
        country: "West-Central Africa",
        jurisdictions: ["Chad", "Niger", "Sudan", "Mali"],
        bbox: { min_lon: -5.0, min_lat: 11.0, max_lon: 25.0, max_lat: 18.0 },
        area_sq_km: 1800000,
        description: "Dynamic ecological ecotone sensitive to West African Monsoon shifts.",
      },
    ];
  }
}

export async function fetchDatasets(options?: { strict?: boolean; signal?: AbortSignal }): Promise<DatasetVariable[]> {
  try {
    const res = await fetch(`${API_BASE}/datasets`, { signal: options?.signal });
    if (!res.ok) throw new Error("Failed to fetch datasets");
    const datasets = await res.json();
    if (!Array.isArray(datasets)) throw new Error("The dataset catalog is invalid.");
    return datasets;
  } catch (err) {
    if (options?.strict || options?.signal?.aborted) throw err;
    return [
      {
        id: "GPM_PRECIP",
        name: "Precipitation Accumulation (IMERG V07)",
        mission: "GPM",
        instrument: "GMI / DPR Multi-satellite Blend",
        producing_org: "NASA GSFC / JAXA",
        units: "mm/month",
        spatial_resolution: "0.1° (~10 km)",
        temporal_resolution: "Monthly",
        category: "precipitation",
        baseline_period: "2000-2020",
        supported_regions: ["lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"],
      },
      {
        id: "MERRA2_T2M",
        name: "2-Meter Surface Air Temperature",
        mission: "MERRA-2",
        instrument: "ADAS",
        producing_org: "NASA GMAO",
        units: "°C",
        spatial_resolution: "0.5° × 0.625°",
        temporal_resolution: "Monthly Mean",
        category: "atmosphere",
        baseline_period: "2000-2020",
        supported_regions: ["lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"],
      },
      {
        id: "MODIS_LST",
        name: "Daytime Land Surface Temperature",
        mission: "Terra / Aqua MODIS",
        instrument: "MODIS",
        producing_org: "NASA LP DAAC",
        units: "°C",
        spatial_resolution: "0.05° (~5.6 km)",
        temporal_resolution: "Monthly CMG",
        category: "land",
        baseline_period: "2000-2020",
        supported_regions: ["lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"],
      },
      {
        id: "SMAP_SOIL",
        name: "Root-Zone Soil Moisture L4",
        mission: "SMAP",
        instrument: "L-band Radiometer",
        producing_org: "NASA JPL / GSFC",
        units: "m³/m³",
        spatial_resolution: "9 km EASE-Grid",
        temporal_resolution: "Monthly Aggregate",
        category: "land",
        baseline_period: "2015-2024",
        supported_regions: ["lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"],
      },
    ];
  }
}

export async function fetchTimeSeries(
  regionId: string,
  variableId: string,
  deseasonalize: boolean = false,
  range?: { start?: string; end?: string; signal?: AbortSignal }
): Promise<{ region: Region; variable: DatasetVariable; series: TimeSeriesPoint[]; trend?: TrendResult; source?: DataSource }> {
  const params = new URLSearchParams({ region: regionId, variable: variableId, deseasonalize: String(deseasonalize) });
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);
  const res = await fetch(`${API_BASE}/timeseries?${params}`, { signal: range?.signal });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error || "Failed to fetch time series. Please try again.");
  }
  return await res.json();
}

export async function fetchDivergence(
  regionA: string,
  regionB: string,
  variableId: string,
  deseasonalize: boolean = true
): Promise<DivergenceAnalysis> {
  const res = await fetch(`${API_BASE}/divergence/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      region_a_id: regionA,
      region_b_id: regionB,
      variable_id: variableId,
      deseasonalize,
    }),
  });
  if (!res.ok) throw new Error("Failed to execute divergence analysis");
  return await res.json();
}

export async function fetchGIBSLayers(): Promise<GIBSLayer[]> {
  try {
    const res = await fetch(`${API_BASE}/gibs/layers`);
    if (!res.ok) throw new Error("Failed to fetch GIBS layers");
    return await res.json();
  } catch (err) {
    return [
      {
        id: "MODIS_Terra_CorrectedReflectance_TrueColor",
        title: "MODIS Terra Corrected Reflectance (True Color)",
        layer_name: "MODIS_Terra_CorrectedReflectance_TrueColor",
        format: "jpg",
        tile_matrix_set: "GoogleMapsCompatible_Level9",
        description: "Daily high-resolution true-color Earth imagery.",
      },
      {
        id: "IMERG_Precipitation_Rate",
        title: "GPM IMERG Precipitation Rate (V07)",
        layer_name: "IMERG_Precipitation_Rate",
        format: "png",
        tile_matrix_set: "GoogleMapsCompatible_Level6",
        description: "Global multi-satellite precipitation estimates.",
      },
    ];
  }
}
