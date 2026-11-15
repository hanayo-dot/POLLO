# POLLO Trend Analysis

The Vite/React app opens Trend Analysis at `/` and `/trend-analysis`; the previous dashboard is at `/dashboard`. POLLO branding, the smaller heading, space theme, Earth horizon and variable-specific illustrations are retained.

## Run and verify

Backend: `go run .` (port 8080), `go test ./...`.
Frontend: `npm ci`, `npm run build`, `npm run preview` (port 3000).
Development: `npm run dev`. Vite proxies `/api` to port 8080; the server-only `POLLO_BACKEND_URL` environment variable supports an alternate local backend. Docker uses nginx's same-origin proxy to the backend container.
Frontend tests: `node --test tests/api.test.cjs tests/variables.test.cjs`.

## Location and data scope

Only the four regions returned by `/regions` are offered. There is no worldwide search. These are explicitly documented on-land reference points:

- Lake Victoria Basin: -0.1022, 34.7617
- Horn of Africa: 5.35, 45.15
- Congo Basin: 0.52, 25.2
- Sahel belt: 13.5, 2.1

Measurements describe a reference grid cell, **not a whole-region spatial average**. The source panel includes the coordinates. Only these provider datasets are selected by the page:

- Temperature: ERA5-Land daily 2-metre temperature, averaged by complete month.
- Rainfall: ERA5 daily liquid rain, summed by complete month (not snow).
- Soil moisture: ERA5-Land 0-7 cm daily moisture, averaged by complete month.
- Vegetation: MOD13Q1 250 m NDVI from ORNL DAAC, scaled by 0.0001. Only pixel reliability 0 and valid raw NDVI are retained. Valid 16-day composites are averaged by month. ORNL's ten-date limit is respected; missing months are omitted.

Open-Meteo supplies **reanalysis**, not direct station observations. MODIS is a satellite product. Coverage and provider availability vary. Invalid periods, upstream errors and missing data never fall back to generated results. Requests can be cancelled. Successful ranges are cached in memory for 24 hours; errors are not cached. Vegetation may take several minutes; an unavailable provider returns a retryable error. These public endpoints do not use NASA credentials. Legacy benchmark datasets remain for the old dashboard but are excluded from this page.

Sources: https://open-meteo.com/en/docs/historical-weather-api and https://modis.ornl.gov/data/modis_webservice.html

## Statistics and artwork

The backend returns Mann-Kendall inference and Sen's slope. Slopes use elapsed calendar months, including gaps, and are multiplied by 12 for the annual rate. These are raw monthly tests, not corrected for seasonality or serial correlation; Methodology states this limitation. The chart uses the returned slope and a median-residual intercept. Earlier/later comparisons are descriptive, not additional significance tests.

GSAP animates rain, heat, vegetation sway and soil-water infiltration. Artwork changes immediately with the selected variable; old results are cleared. Reduced-motion preferences stop animations. `public/textures/trend-earth-horizon.png` is generated decorative artwork, not a scientific map. ECharts is loaded lazily with only the required chart components.
