export interface BoundingBox {
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
}

export interface Region {
  id: string;
  name: string;
  country: string;
  jurisdictions: string[];
  bbox: BoundingBox;
  area_sq_km: number;
  description: string;
}

export interface DatasetVariable {
  id: string;
  name: string;
  mission: string;
  instrument: string;
  producing_org: string;
  units: string;
  spatial_resolution: string;
  temporal_resolution: string;
  category: "atmosphere" | "precipitation" | "land" | "vegetation";
  baseline_period: string;
  supported_regions: string[];
}

export interface TimeSeriesPoint {
  date: string;
  timestamp: number;
  value: number;
  baseline?: number;
  anomaly?: number;
  deseasonalized?: number;
  std_anomaly?: number;
}

export interface TrendResult {
  variable_id: string;
  region_id: string;
  data_points: number;
  start_date: string;
  end_date: string;
  s_statistic: number;
  variance_s: number;
  z_statistic: number;
  p_value: number;
  kendall_tau: number;
  sens_slope: number;
  annual_rate: number;
  units: string;
  significance: "significant" | "marginal" | "none";
  trend_direction: "increasing" | "decreasing" | "neutral";
  interpretation: string;
}

export interface DivergenceAnalysis {
  variable_id: string;
  region_a: Region;
  region_b: Region;
  trend_a: TrendResult;
  trend_b: TrendResult;
  slope_delta: number;
  divergence_metric: number;
  is_bipolar: boolean;
  scientific_summary: string;
}

export interface GIBSLayer {
  id: string;
  title: string;
  layer_name: string;
  format: string;
  tile_matrix_set: string;
  description: string;
}
