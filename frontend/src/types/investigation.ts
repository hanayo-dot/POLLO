import { BoundingBox, Region, DatasetVariable, TimeSeriesPoint, TrendResult } from "./index";

export type EnvironmentalVariableId =
  | "soil_moisture"
  | "precipitation"
  | "temperature"
  | "vegetation"
  | "evaporation"
  | "humidity";

export interface EnvironmentalVariable {
  id: EnvironmentalVariableId;
  name: string;
  category: "land" | "precipitation" | "atmosphere" | "vegetation";
  tagline: string;
  description: string;
  iconName: string;
  primaryUnit: string;
  supportedDatasets: string[];
  parameterConfigs: VariableParameterConfig[];
}

export interface VariableParameterConfig {
  id: string;
  label: string;
  type: "select" | "radio" | "range";
  options?: { value: string; label: string; description?: string }[];
  defaultValue: string;
  helpText: string;
}

export interface NASADatasetMetadata {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  doi?: string;
  mission: string;
  instrument: string;
  dataType: "Assimilated Land Surface Model" | "Direct Satellite Observation" | "Atmospheric Reanalysis" | "Multi-Sensor Blend";
  isDirectObservation: boolean;
  temporalCoverage: {
    start: string;
    end: string;
    resolution: "Monthly" | "Daily" | "Annual";
  };
  spatialResolution: string;
  spatialCoverage: string;
  units: string;
  description: string;
  citation: string;
  limitations: string;
  supportedVariables: EnvironmentalVariableId[];
}

export interface GeographicalTarget {
  id: string;
  name: string;
  level: "country" | "county" | "basin" | "custom";
  country: string;
  bbox: BoundingBox;
  areaSqKm: number;
  centerCoordinates: [number, number]; // [lon, lat]
  description?: string;
  geojson?: any;
}

export interface InvestigationConfig {
  id?: string;
  title: string;
  variableId: EnvironmentalVariableId;
  datasetId: string;
  geographicalTarget: GeographicalTarget;
  dateRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
  parameters: {
    soilDepth?: "0-10cm" | "10-40cm" | "40-100cm" | "100-200cm";
    temporalResolution?: "monthly" | "annual";
    temperatureMetric?: "air_2m" | "land_day" | "land_night";
    vegetationIndex?: "ndvi" | "evi";
    deseasonalize?: boolean;
    [key: string]: any;
  };
}

export type InvestigationStatus = "pending" | "processing" | "completed" | "failed";

export interface SpatialGridPoint {
  lat: number;
  lon: number;
  value: number;
  anomaly: number;
  rateOfChange: number;
  pVal: number;
  isSignificant: boolean;
}

export interface SpatialMapDataset {
  variableId: EnvironmentalVariableId;
  timestamp: string;
  bounds: BoundingBox;
  gridResolution: number;
  points: SpatialGridPoint[];
  colorRamp: {
    min: number;
    max: number;
    units: string;
    stops: { offset: number; color: string; label: string }[];
  };
}

export interface InvestigationResult {
  id: string;
  config: InvestigationConfig;
  status: InvestigationStatus;
  progressPercent: number;
  submittedAt: string;
  completedAt?: string;
  error?: string;
  datasetMetadata: NASADatasetMetadata;
  timeSeries: TimeSeriesPoint[];
  trend: TrendResult & {
    decadalRate: number;
    confidenceInterval95: [number, number];
    meanValue: number;
    minValue: number;
    maxValue: number;
    stdDev: number;
  };
  spatialData: SpatialMapDataset;
  scientificInterpretation: {
    headline: string;
    narrative: string;
    trendExplanation: string;
    significanceExplanation: string;
    caveatsAndLimitations: string;
  };
}

export interface InvestigationComparison {
  primaryResult: InvestigationResult;
  comparisonType: "region" | "period";
  secondaryTargetName: string;
  secondaryPeriodLabel: string;
  secondaryTrend: {
    sensSlope: number;
    annualRate: number;
    pValue: number;
    trendDirection: "increasing" | "decreasing" | "neutral";
    significance: "significant" | "marginal" | "none";
  };
  deltaRate: number;
  isDivergent: boolean;
  scientificSummary: string;
}
