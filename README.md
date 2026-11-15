# POLLO — Planetary Intelligence & Earth System Trend Detection Platform

[![CI](https://github.com/hanayo-dot/POLLO/actions/workflows/ci.yml/badge.svg)](https://github.com/hanayo-dot/POLLO/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?logo=go&logoColor=white)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![NASA Earthdata](https://img.shields.io/badge/NASA-EOSDIS_/_GIBS-E03C31?logo=nasa&logoColor=white)](https://earthdata.nasa.gov)

**POLLO** is an open, publication-grade Earth observation analytics platform designed to detect, quantify, and visualize multi-decadal planetary trends and environmental divergences. Powered by authentic NASA Earth Science datasets (EOSDIS, MERRA-2, GPM IMERG, MODIS, SMAP), POLLO couples a high-performance Go analytical engine (**TREND-X**) with an interactive Next.js visualization dashboard to deliver statistically robust climate intelligence across critical planetary biomes and freshwater basins.

---

## Table of Contents

- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [NASA Earth Science Datasets](#nasa-earth-science-datasets)
- [Demonstration Catchments & Biomes](#demonstration-catchments--biomes)
- [Scientific Methodology (TREND-X)](#scientific-methodology-trend-x)
- [Scientific Validation & Benchmarks](#scientific-validation--benchmarks)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [Running Locally (Bare Metal)](#running-locally-bare-metal)
- [API Reference](#api-reference)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Documentation Index](#documentation-index)
- [License](#license)

---

## Key Features

- **TREND-X Analytical Core**: Statistically robust, non-parametric trend detection using the **Mann-Kendall** test with exact tie-variance corrections and **Sen's robust slope estimator** to isolate decadal trajectories ($p \le 0.05$) resistant to non-normality, missing observations, and extreme outliers.
- **Deseasonalization & Climatological Anomalies**: Multi-decadal baseline modeling (2000–2020) removing 12-month annual periodic cycles to extract true standardized anomalies ($Z_{t,m}$) and physical delta rates.
- **Inter-Regional Divergence Detection**: Automated tracking of opposing climate trends between coupled ecological zones (e.g., the East African climate dipole: convective precipitation surges in the Lake Victoria Basin versus chronic drought in the Horn of Africa).
- **Geospatial Extraction Pipeline**: Bounding-box and polygon boundary spatial extraction, point-in-polygon clipping, and spatial cell weighting for multi-resolution gridded datasets.
- **NASA GIBS WMTS Proxy & Caching**: Reverse proxy for NASA Global Imagery Browse Services (GIBS) with local disk tile caching for low-latency visual map layer rendering.
- **Data Export Engine**: Policy-ready and scientific data exports in RFC 7946 GeoJSON, CSV with rich metadata headers, and structured JSON.
- **Modern Web Dashboard**: Real-time interactive UI built with Next.js 15 (App Router), Recharts, and Tailwind CSS for multi-variable comparative analytics.

---

## System Architecture

```mermaid
flowchart TD
    subgraph Data Sources ["NASA Earth Science & Observation"]
        MERRA2["NASA GMAO MERRA-2<br/>(T2M, QV2M, SLP, AOD)"]
        GPM["NASA GSFC / JAXA GPM<br/>(IMERG V07 Precipitation)"]
        MODIS["NASA LP DAAC MODIS<br/>(MOD11C3 Land Surface Temp)"]
        SMAP["NASA JPL / GSFC SMAP<br/>(L4 Root-Zone Soil Moisture)"]
        GIBS["NASA GIBS WMTS<br/>(Global Imagery Browse)"]
    end

    subgraph Backend ["POLLO Go Backend Service (:8080)"]
        Router["HTTP API Router & Middleware<br/>(CORS, Logging, Recovery)"]
        
        subgraph Core Engines ["Core Analytical Modules"]
            TrendX["TREND-X Engine<br/>• Mann-Kendall Test<br/>• Sen's Slope Estimator<br/>• Deseasonalization"]
            Divergence["Divergence Detector<br/>• Dipole Metric Δ(Ra, Rb)<br/>• Bipolar Trend Classifier"]
            Geospatial["Geospatial Pipeline<br/>• Grid Generator & Aggregator<br/>• Polygon Masking & Clip"]
            EarthLink["EarthLink Client<br/>• NASA GIBS Tile Proxy<br/>• Local Disk Cache"]
            Exporter["Export Engine<br/>• CSV / JSON / GeoJSON"]
        end
        
        Catalog["Catalog Registry<br/>• Regions & Datasets"]
    end

    subgraph Frontend ["POLLO Next.js Dashboard (:3000)"]
        UI["App Router (Dashboard Page)<br/>• Overview Tab<br/>• Trend-X Analysis Tab<br/>• Regional Divergence Tab"]
        Charts["Recharts Visualizations<br/>• Multi-decadal Time Series<br/>• Deseasonalized Anomalies<br/>• Trend Envelopes"]
        Layers["NASA EOSDIS Map View<br/>• GIBS WMTS Tile Overlay"]
    end

    Data Sources --> EarthLink
    Data Sources -. Ingestion & Benchmark Data .-> Catalog
    Catalog --> Geospatial --> TrendX
    TrendX --> Divergence
    TrendX --> Exporter
    Geospatial --> Exporter

    Router --> TrendX
    Router --> Divergence
    Router --> EarthLink
    Router --> Exporter

    UI --> Router
    Charts --> Router
    Layers --> Router
```

---

## NASA Earth Science Datasets

POLLO unifies observations across the atmosphere, hydrosphere, and land surface:

| Dataset / Product | Mission / Producing DAAC | Spatial Resolution | Temporal Extent | Variables Ingested |
|---|---|---|---|---|
| **MERRA-2** | NASA GMAO | $0.5^\circ \times 0.625^\circ$ | 2000–Present | Surface Air Temp (`T2M`), Specific Humidity (`QV2M`) |
| **GPM IMERG V07** | NASA GSFC / JAXA | $0.1^\circ \times 0.1^\circ$ (~10 km) | 2000–Present | Precipitation Accumulation (`GPM_PRECIP`) |
| **MODIS (MOD11C3)** | NASA LP DAAC (Terra/Aqua) | $0.05^\circ \times 0.05^\circ$ (~5.6 km) | 2000–Present | Daytime Land Surface Temperature (`MODIS_LST`) |
| **SMAP L4** | NASA JPL / GSFC | 9 km EASE-Grid | 2015–Present | Root-Zone Soil Moisture (`SMAP_SOIL`) |

*For complete product specifications and calibration parameters, see [docs/DATASET_CATALOG.md](docs/DATASET_CATALOG.md).*

---

## Demonstration Catchments & Biomes

POLLO benchmarks and verifies multi-decadal trends across diverse continental ecosystems:

1. **Lake Victoria Basin (Primary Benchmark)**
   - *Extent:* $2.5^\circ\text{N} - 4.5^\circ\text{S}$, $29.0^\circ\text{E} - 36.0^\circ\text{E}$ (251,000 km²)
   - *Jurisdictions:* Kenya, Uganda, Tanzania, Rwanda, Burundi
   - *Focus:* Convective precipitation surges, lake elevation dynamics, and agricultural impact for 45M+ residents.
2. **Horn of Africa (Somalia / Ogaden)**
   - *Extent:* $0.0^\circ\text{N} - 12.0^\circ\text{N}$, $40.0^\circ\text{E} - 51.5^\circ\text{E}$ (750,000 km²)
   - *Focus:* Chronic multi-year drought, seasonal failure, and desertification.
3. **Congo Rainforest Basin**
   - *Extent:* $5.0^\circ\text{S} - 5.0^\circ\text{N}$, $14.0^\circ\text{E} - 29.0^\circ\text{E}$ (3,700,000 km²)
   - *Focus:* Global carbon sink stability, canopy temperature, and equatorial moisture flux.
4. **Sudano-Sahel Transition Belt**
   - *Extent:* $11.0^\circ\text{N} - 18.0^\circ\text{N}$, $-5.0^\circ\text{W} - 25.0^\circ\text{E}$ (1,800,000 km²)
   - *Focus:* Semi-arid ecotone vulnerability and Green Sahara precipitation boundaries.

---

## Scientific Methodology (TREND-X)

POLLO's analytical core evaluates multi-decadal time series through a mathematically rigorous pipeline:

### 1. Mann-Kendall Monotonic Trend Test
Evaluates whether a monotonic upward or downward trend exists without assuming a normal distribution:

$$S = \sum_{k=1}^{n-1} \sum_{j=k+1}^{n} \operatorname{sgn}(x_j - x_k)$$

Variance with tie correction for tied observation groups $g$:

$$\operatorname{Var}(S) = \frac{1}{18} \left[ n(n-1)(2n+5) - \sum_{p=1}^{g} t_p(t_p-1)(2t_p+5) \right]$$

Standardized test statistic $Z$ and two-tailed $p$-value:

$$Z = \begin{cases} \frac{S - 1}{\sqrt{\operatorname{Var}(S)}} & S > 0 \\ 0 & S = 0 \\ \frac{S + 1}{\sqrt{\operatorname{Var}(S)}} & S < 0 \end{cases}, \quad p = 2 \times \left(1 - \Phi(|Z|)\right)$$

### 2. Sen's Robust Slope Estimator
Quantifies physical rates of change (e.g., mm/decade or °C/year) robustly against extreme outliers:

$$\beta = \operatorname{median}\left\{ \frac{x_j - x_k}{j - k} : 1 \le k < j \le n \right\}$$

### 3. Climatological Deseasonalization
Removes the 12-month annual harmonic by computing baseline monthly means $\mu_m$ and standard deviations $\sigma_m$ over the 2000–2020 reference period:

$$Z_{t,m} = \frac{x_{t,m} - \mu_m}{\sigma_m}, \quad x^{\text{deseas}}_{t,m} = x_{t,m} - \mu_m$$

### 4. Regional Divergence Metric
Calculates the spatial trend contrast between paired regions:

$$\Delta(R_A, R_B) = \operatorname{sgn}(\beta_A) \times \operatorname{sgn}(\beta_B) \times |\beta_A - \beta_B|$$

When $\operatorname{sgn}(\beta_A) \ne \operatorname{sgn}(\beta_B)$ at $p_A, p_B \le 0.05$, the system flags a **Bipolar Divergence** (climate dipole).

*For extensive derivation and literature citations, see [docs/SCIENTIFIC_METHODOLOGY.md](docs/SCIENTIFIC_METHODOLOGY.md).*

---

## Scientific Validation & Benchmarks

POLLO enforces automated cross-verification against standard peer-reviewed literature benchmarks and reference implementations:

| Benchmark Reference | Target Metric | Acceptance Tolerance |
|---|---|---|
| **Gilbert (1987) Table 16.2** | Tutorial $S$, $\operatorname{Var}(S)$, $Z$, $p$ | $\le 10^{-6}$ |
| **Gilbert (1987) Table 16.3** | Tied variance formulation $\operatorname{Var}(S)$ | Exact / $\le 10^{-6}$ |
| **Gilbert (1987) 15-pt Water Quality** | Hydrological serial trend | $\le 10^{-6}$ |
| **Hirsch, Slack & Smith (1982)** | Seasonal Kendall $S_{\text{seasonal}}$, $\operatorname{Var}(S_{\text{seasonal}})$ | $\le 10^{-6}$ |
| **SciPy `theilslopes` & `siegelslopes`** | Sen's robust slope estimator $\beta$ | $\le 10^{-6}$ |
| **High Tie Frequency ($t_p > 5$)** | Tie group sum calculation | Exact |
| **Abrupt Regime Shifts** | Step change detection sensitivity | $p \le 0.01$ |

Both Go test suites (`backend/tests/scientific_validation_test.go`) and Python reference verification (`scripts/verify_scientific_validation.py`) run automatically on every pull request via GitHub Actions.

---

## Repository Structure

```text
POLLO/
├── backend/                       # Go 1.22+ Backend Service
│   ├── api/                       # HTTP Router, Handlers & Middleware
│   ├── internal/
│   │   ├── config/                # Environment & Application Config
│   │   ├── data/                  # Region & Dataset Catalogs, Spatial Grids
│   │   ├── divergence/            # Regional Divergence & Dipole Detection
│   │   ├── earthlink/             # NASA GIBS Client & Local Cache Proxy
│   │   ├── export/                # CSV, JSON & GeoJSON Exporters
│   │   ├── geospatial/            # Geometry, Clipping, Aggregation, Grids
│   │   ├── models/                # Domain Data Structures & Contracts
│   │   └── trendx/                # Mann-Kendall, Sen's Slope, Deseasonalization
│   ├── tests/                     # Scientific Validation & Integration Tests
│   ├── Dockerfile                 # Multi-stage Go Alpine Container
│   ├── go.mod                     # Go Dependencies
│   └── main.go                    # Entrypoint & Graceful Shutdown
├── frontend/                      # Next.js 15+ Web Application
│   ├── src/
│   │   ├── app/                   # App Router Pages & Layout
│   │   ├── components/            # UI, Charts, Maps & Layer Controls
│   │   ├── services/              # API Client (Backend Fetcher)
│   │   └── types/                 # TypeScript Data Definitions
│   ├── public/                    # Textures & Static Assets
│   ├── Dockerfile                 # Next.js Production Container
│   ├── package.json               # Node Dependencies & Scripts
│   ├── tailwind.config.ts         # Tailwind Configuration
│   └── tsconfig.json              # TypeScript Configuration
├── docs/                          # In-depth Documentation
│   ├── DATASET_CATALOG.md         # NASA Earth Science Ingestion Specs
│   ├── EXPORT_API_INTEGRATION.md  # Export Engine & API Integration Guide
│   └── SCIENTIFIC_METHODOLOGY.md  # TREND-X Mathematical Derivations
├── scripts/                       # Developer & Verification Tooling
│   ├── build.sh                   # Unified Build Script
│   ├── dev.sh                     # Unified Development Runner
│   └── verify_scientific_validation.py # Python Benchmark Cross-Verifier
├── .github/workflows/             # Continuous Integration Pipelines
│   └── ci.yml                     # Automated Build, Test & Benchmark CI
├── docker-compose.yml             # Orchestration for Full Stack
├── .env.example                   # Environment Template
└── Makefile                       # Developer Command Automation
```

---

## Quick Start

### Prerequisites

- **Go**: Version 1.22 or higher
- **Node.js**: Version 20 LTS or higher (`npm` included)
- **Docker & Docker Compose**: Optional, for containerized execution
- **Python**: Version 3.10+ (optional, for running the scientific validation script)

### Environment Configuration

Copy the example environment file and adjust if necessary:

```bash
cp .env.example .env
```

Key environment settings:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Go backend HTTP port | `8080` |
| `API_PREFIX` | Base routing prefix | `/api/v1` |
| `CORS_ALLOWED_ORIGINS` | Permitted client origins | `http://localhost:3000` |
| `CACHE_DIR` | NASA GIBS tile cache path | `./data/cache` |
| `NEXT_PUBLIC_API_URL` | Frontend API target | `http://localhost:8080/api/v1` |
| `NASA_EARTHDATA_USERNAME` | NASA Earthdata Login *(optional for GIBS demo)* | `""` |
| `NASA_EARTHDATA_BEARER_TOKEN` | Bearer token for Earthdata APIs *(optional)* | `""` |

---

### Running with Docker Compose

The simplest way to run the complete stack:

```bash
# Build and start both backend and frontend containers
make dev
# or: docker compose up --build
```

- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend Health Check:** [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)

To run in the background and follow logs:

```bash
make up     # Start in daemon mode
make logs   # Tail container logs
make down   # Tear down containers
```

---

### Running Locally (Bare Metal)

#### 1. Install Dependencies
```bash
make deps
```

#### 2. Run Both Services Simultaneously
```bash
./scripts/dev.sh
```

Or run each service in dedicated terminal sessions:

**Backend:**
```bash
make backend-dev
# or: cd backend && go run .
```

**Frontend:**
```bash
make frontend-dev
# or: cd frontend && npm run dev
```

---

## API Reference

The POLLO Go backend serves RESTful JSON and streaming export endpoints at `http://localhost:8080/api/v1`:

| Endpoint | Method | Parameters | Description |
|---|:---:|---|---|
| `/health` | `GET` | — | System operational status, uptime, region and dataset counts |
| `/regions` | `GET` | — | Available regional catchments and bounding boxes |
| `/datasets` | `GET` | — | NASA dataset catalog and metadata |
| `/timeseries` | `GET` | `region`, `variable`, `deseasonalize` | 25-year time series with computed TREND-X statistics |
| `/trendx/analyze` | `GET` | `region`, `variable`, `start`, `end` | Mann-Kendall statistics, Sen's slope, and anomaly series |
| `/divergence/analyze` | `GET` | `regionA`, `regionB`, `variable` | Cross-regional trend comparison, contrast $\Delta$, and dipole classification |
| `/gibs/layers` | `GET` | — | Available NASA GIBS satellite imagery layers |
| `/gibs/tiles/{layer}/{date}/{z}/{x}/{y}` | `GET` | Path params | Proxied and cached NASA GIBS WMTS map tile |
| `/export/timeseries` | `GET` | `region`, `variable`, `format` (`csv`\|`json`) | Download time series with scientific provenance headers |
| `/export/geometries` | `GET` | `region` | RFC 7946 GeoJSON catchment polygon boundaries |

### Example cURL Queries

**1. Inspect Regional Trends (Lake Victoria Basin, IMERG Precipitation):**
```bash
curl -s "http://localhost:8080/api/v1/trendx/analyze?region=lake_victoria_basin&variable=GPM_PRECIP&deseasonalize=true" | jq .
```

**2. Detect Climate Dipole Divergence (Lake Victoria Basin vs Horn of Africa):**
```bash
curl -s "http://localhost:8080/api/v1/divergence/analyze?regionA=lake_victoria_basin&regionB=horn_of_africa&variable=GPM_PRECIP" | jq .
```

**3. Download Publication CSV Data:**
```bash
curl -OJ "http://localhost:8080/api/v1/export/timeseries?region=lake_victoria_basin&variable=GPM_PRECIP&format=csv"
```

*For complete schema definitions and integration snippets, consult [docs/EXPORT_API_INTEGRATION.md](docs/EXPORT_API_INTEGRATION.md).*

---

## Testing & Quality Assurance

### Run Go Unit & Integration Tests
```bash
make test
# or: cd backend && go test -v ./...
```

### Run Scientific Validation Suite
Executes standard hydrological and mathematical benchmarks (Gilbert 1987, Hirsch et al. 1982):
```bash
cd backend && go test -v -run TestScientificValidation ./tests/...
```

### Run Python Ground-Truth Cross-Verification
Compares Go output directly against Python `scipy.stats` and benchmark implementations:
```bash
python3 scripts/verify_scientific_validation.py
```

### Frontend Build & Typecheck
```bash
make frontend-build
# or: cd frontend && npm run build
```

### Format Code
```bash
make fmt
```

---

## Documentation Index

- **[docs/SCIENTIFIC_METHODOLOGY.md](docs/SCIENTIFIC_METHODOLOGY.md)**: Mathematical foundations of TREND-X, Mann-Kendall tie formulations, Sen's slope computation, and divergence detection logic.
- **[docs/DATASET_CATALOG.md](docs/DATASET_CATALOG.md)**: Specifications for ingested NASA products (MERRA-2, GPM IMERG, MODIS LST, SMAP L4) and benchmark region definitions.
- **[docs/EXPORT_API_INTEGRATION.md](docs/EXPORT_API_INTEGRATION.md)**: API specifications, payload schemas, and frontend integration examples for the export engine.

---

## License

This project is licensed under the Apache 2.0 License. Satellite data ingested via NASA EOSDIS and GIBS are provided in accordance with the NASA Open-Source and Open-Data policies.
