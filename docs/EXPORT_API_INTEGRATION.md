# POLLO Data Export Engine — Frontend Integration Guide

This guide provides the complete API specification, data schemas, and copy/download code snippets for integrating the **Data Export Engine** and **Executive Policy Dossier** into the POLLO Next.js frontend (Issue #8).

---

## 1. Overview of Export Endpoints

Base URL: `http://localhost:8080/api/v1` (or `process.env.NEXT_PUBLIC_API_URL`)

| Endpoint | Method | Format | Content-Type | Purpose |
| :--- | :---: | :---: | :--- | :--- |
| `/export/timeseries` | `GET` | CSV (default) | `text/csv; charset=utf-8` | Tabular 25-yr observations, anomalies, and trend parameters |
| `/export/timeseries` | `GET` | JSON | `application/json; charset=utf-8` | Full structured timeseries, trend statistics, and metadata |
| `/export/geometries` | `GET` | GeoJSON | `application/geo+json; charset=utf-8` | RFC 7946 Polygon boundaries of regional catchments |

Both endpoints automatically send standard `Content-Disposition: attachment; filename="..."` headers so clicking a direct link or opening the URL in a browser automatically triggers a file download.

---

## 2. Time Series Export (`/export/timeseries`)

### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :---: | :---: | :---: | :--- |
| `region` | `string` | No | `lake_victoria_basin` | Basin identifier (e.g. `lake_victoria_basin`, `horn_of_africa`, `congo_basin`, `sahel_belt`) |
| `variable` | `string` | No | `GPM_PRECIP` | NASA dataset identifier (`GPM_PRECIP`, `MERRA2_T2M`, `MODIS_LST`, `SMAP_SOIL`, `MERRA2_QV2M`) |
| `format` | `string` | No | `csv` | Export format: `csv` or `json` |
| `deseasonalize`| `boolean`| No | `true` | When `true`, removes the 12-month annual cycle to expose decadal anomalies |
| `start` | `string` | No | — | Start date boundary in `YYYY-MM` format (e.g. `2000-01`) |
| `end` | `string` | No | — | End date boundary in `YYYY-MM` format (e.g. `2024-12`) |

---

### A. CSV Export (`format=csv`)

#### Request URL Example
```http
GET /api/v1/export/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&format=csv&deseasonalize=true
```

#### Response Headers
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="pollo_timeseries_lake_victoria_basin_GPM_PRECIP.csv"
Cache-Control: public, max-age=300
```

#### CSV Response Body Example
```csv
# ==============================================================================
# POLLO Earth System Intelligence — Planetary Time Series Data Export
# Exported At: 2026-11-14T20:30:00Z
# Region: Lake Victoria Basin (ID: lake_victoria_basin)
# Country / Catchment: East Africa (Multi-national)
# Jurisdictions: Uganda, Kenya, Tanzania, Rwanda, Burundi
# Area: 251000 sq km
# Bounding Box (WGS84): [29.0000, -4.5000, 36.0000, 2.5000]
# Variable: Precipitation Accumulation (IMERG V07) (ID: GPM_PRECIP)
# Mission: Global Precipitation Measurement (GPM) | Instrument: GMI & DPR Multi-satellite Blend
# Producing Organization: NASA GSFC / JAXA
# Units: mm/month | Spatial Resolution: 0.1° (~10 km)
# Climatological Baseline Period: 2000-2020
# Deseasonalized: true
# Mann-Kendall Trend: Z = +4.18, p-value = 0.000029, S = 11842, Tau = +0.264
# Sen's Slope (Monthly Rate): +0.0600 mm/month/month
# Sen's Annual Rate: +0.7200 mm/month/year
# Significance: significant | Trend Direction: increasing
# Interpretation: Lake Victoria Basin exhibits an increasing trend at a rate of +0.720 mm/month/year (p=2.9000e-05, Kendall tau=+0.264)
# ==============================================================================
date,timestamp,value,baseline,anomaly,deseasonalized,std_anomaly
2000-01,947937600,128.450,131.200,-2.750,125.700,-0.185
2000-02,950616000,115.120,118.400,-3.280,111.840,-0.220
2000-03,953121600,165.800,160.100,5.700,171.500,0.380
...
```

---

### B. JSON Export (`format=json`)

#### Request URL Example
```http
GET /api/v1/export/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&format=json
```

#### JSON Response Body Example
```json
{
  "exported_at": "2026-11-14T20:30:00Z",
  "platform": "POLLO Planetary Intelligence Platform",
  "region": {
    "id": "lake_victoria_basin",
    "name": "Lake Victoria Basin",
    "country": "East Africa (Multi-national)",
    "jurisdictions": ["Uganda", "Kenya", "Tanzania", "Rwanda", "Burundi"],
    "bbox": { "min_lon": 29, "min_lat": -4.5, "max_lon": 36, "max_lat": 2.5 },
    "area_sq_km": 251000,
    "description": "World's second largest freshwater lake..."
  },
  "variable": {
    "id": "GPM_PRECIP",
    "name": "Precipitation Accumulation (IMERG V07)",
    "mission": "Global Precipitation Measurement (GPM)",
    "instrument": "GMI & DPR Multi-satellite Blend",
    "producing_org": "NASA GSFC / JAXA",
    "units": "mm/month",
    "spatial_resolution": "0.1° (~10 km)",
    "temporal_resolution": "Monthly",
    "category": "precipitation",
    "baseline_period": "2000-2020",
    "supported_regions": ["lake_victoria_basin", "horn_of_africa", "congo_basin", "sahel_belt"]
  },
  "deseasonalized": true,
  "trend": {
    "variable_id": "GPM_PRECIP",
    "region_id": "lake_victoria_basin",
    "data_points": 300,
    "start_date": "2000-01",
    "end_date": "2024-12",
    "s_statistic": 11842,
    "variance_s": 2250000,
    "z_statistic": 4.18,
    "p_value": 0.000029,
    "kendall_tau": 0.264,
    "sens_slope": 0.060,
    "annual_rate": 0.720,
    "units": "mm/month",
    "significance": "significant",
    "trend_direction": "increasing",
    "interpretation": "Lake Victoria Basin exhibits an increasing trend..."
  },
  "data_points": 300,
  "series": [
    {
      "date": "2000-01",
      "timestamp": 947937600,
      "value": 128.45,
      "baseline": 131.2,
      "anomaly": -2.75,
      "deseasonalized": 125.7,
      "std_anomaly": -0.185
    }
  ]
}
```

---

## 3. Geometry GeoJSON Export (`/export/geometries`)

Complies with standard **RFC 7946 (The GeoJSON Format)**. Coordinates follow `[longitude, latitude]` order (WGS 84 / EPSG:4326) and polygons are closed counterclockwise rings.

### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :---: | :---: | :---: | :--- |
| `region` | `string` | No | `all` | Specific region ID (`lake_victoria_basin`, `horn_of_africa`, `congo_basin`, `sahel_belt`) or omit for all regions. |

---

### A. All Regions (`FeatureCollection`)

#### Request URL Example
```http
GET /api/v1/export/geometries
# or
GET /api/v1/export/geometries?region=all
```

#### Response Body Example
```json
{
  "type": "FeatureCollection",
  "bbox": [-5.0, -5.0, 51.5, 18.0],
  "features": [
    {
      "type": "Feature",
      "id": "lake_victoria_basin",
      "bbox": [29.0, -4.5, 36.0, 2.5],
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [29.0, -4.5],
            [36.0, -4.5],
            [36.0, 2.5],
            [29.0, 2.5],
            [29.0, -4.5]
          ]
        ]
      },
      "properties": {
        "id": "lake_victoria_basin",
        "name": "Lake Victoria Basin",
        "country": "East Africa (Multi-national)",
        "jurisdictions": ["Uganda", "Kenya", "Tanzania", "Rwanda", "Burundi"],
        "area_sq_km": 251000,
        "description": "World's second largest freshwater lake..."
      }
    }
  ]
}
```

---

### B. Single Region (`Feature`)

#### Request URL Example
```http
GET /api/v1/export/geometries?region=lake_victoria_basin
```

#### Response Body Example
```json
{
  "type": "Feature",
  "id": "lake_victoria_basin",
  "bbox": [29.0, -4.5, 36.0, 2.5],
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [29.0, -4.5],
        [36.0, -4.5],
        [36.0, 2.5],
        [29.0, 2.5],
        [29.0, -4.5]
      ]
    ]
  },
  "properties": {
    "id": "lake_victoria_basin",
    "name": "Lake Victoria Basin",
    "country": "East Africa (Multi-national)",
    "jurisdictions": ["Uganda", "Kenya", "Tanzania", "Rwanda", "Burundi"],
    "area_sq_km": 251000,
    "description": "World's second largest freshwater lake..."
  }
}
```

---

## 4. Frontend Integration Snippets

You can paste or adapt these functions inside `frontend/src/services/api.ts` or directly within your UI components.

### A. Download Helper Functions

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// 1. One-click Download CSV
export function downloadTimeSeriesCSV(regionId: string, variableId: string, deseasonalize = true): void {
  const url = `${API_BASE}/export/timeseries?region=${regionId}&variable=${variableId}&format=csv&deseasonalize=${deseasonalize}`;
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `pollo_timeseries_${regionId}_${variableId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. One-click Download GeoJSON
export function downloadRegionGeoJSON(regionId?: string): void {
  const url = regionId
    ? `${API_BASE}/export/geometries?region=${regionId}`
    : `${API_BASE}/export/geometries`;
  const filename = regionId ? `pollo_geometry_${regionId}.geojson` : `pollo_geometries_all.geojson`;
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

---

### B. Copy to Clipboard Functions

```typescript
// Copy raw CSV string to clipboard
export async function copyTimeSeriesCSVToClipboard(
  regionId: string,
  variableId: string,
  deseasonalize = true
): Promise<boolean> {
  try {
    const url = `${API_BASE}/export/timeseries?region=${regionId}&variable=${variableId}&format=csv&deseasonalize=${deseasonalize}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch CSV export");
    const csvText = await res.text();
    await navigator.clipboard.writeText(csvText);
    return true;
  } catch (err) {
    console.error("Clipboard copy error:", err);
    return false;
  }
}

// Copy GeoJSON to clipboard
export async function copyGeoJSONToClipboard(regionId?: string): Promise<boolean> {
  try {
    const url = regionId
      ? `${API_BASE}/export/geometries?region=${regionId}`
      : `${API_BASE}/export/geometries`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch GeoJSON");
    const jsonText = await res.text();
    await navigator.clipboard.writeText(jsonText);
    return true;
  } catch (err) {
    console.error("Clipboard copy error:", err);
    return false;
  }
}
```

---

## 5. Executive Climate Policy Dossier Data Mapping

When building the **Executive Climate Policy Dossier** card/modal for environmental researchers and East African Community (EAC) policy stakeholders, map the fields as follows:

| Dossier Section | Field / Source | Example Value |
| :--- | :--- | :--- |
| **Basin Identification** | `region.name` | Lake Victoria Basin |
| **Catchment Extent** | `region.area_sq_km` | 251,000 km² |
| **Jurisdictional Scope** | `region.jurisdictions` | Uganda, Kenya, Tanzania, Rwanda, Burundi |
| **Observation Record** | 2000–2024 (25 Years) | 300 Monthly Granules |
| **Trend Significance** | `trend.p_value` | $p = 2.9 \times 10^{-5}$ ($p \le 0.05$, Significant) |
| **Monotonic Trend Rate** | `trend.annual_rate` & `trend.units` | $+0.72\text{ mm/year}$ wetting rate ($\beta$) |
| **Mann-Kendall Score** | `trend.s_statistic` / `trend.z_statistic` | $S = +11,842, Z = +4.18$ |
| **Bipolar Contrast** | Pair with `horn_of_africa` | Lake Victoria wetting ($+0.72$) vs Horn of Africa drought ($-0.48$), Delta: $1.20\text{ mm/yr}$ |
| **Mission Provenance** | `variable.mission` & `producing_org` | GPM IMERG V07 (NASA GSFC / JAXA), MERRA-2 (NASA GMAO) |

### Print / PDF Styling Tip
To make the Dossier printable as an official PDF brief:
```typescript
<button onClick={() => window.print()} className="...">
  Print / Export PDF Policy Brief
</button>
```
And add `@media print` rules in `globals.css`:
```css
@media print {
  body {
    background: #ffffff !important;
    color: #111827 !important;
  }
  header, nav, button, .no-print {
    display: none !important;
  }
  .dossier-card {
    border: 1px solid #d1d5db !important;
    box-shadow: none !important;
    break-inside: avoid;
  }
}
```
