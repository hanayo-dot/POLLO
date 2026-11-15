# Data Sources

This page uses TypeScript, React, Tailwind CSS and GSAP. Both Vite and Next.js
have a `/data-sources` route. Trend Analysis and Insights pass the selected
region, variable and requested period in the URL.

`fetchDatasets({ strict: true, signal })` reads the actual `/datasets` catalog
without silently substituting the legacy fallback catalog. The default API
function behavior is preserved for existing callers. A time-series response
then verifies dataset usage, provenance and returned measurement coverage.
An available catalog entry alone is never labelled as used. Benchmark data,
missing provenance and mismatched investigation identifiers are rejected.

The current Trend Analysis flow selects one variable at a time, so the page
shows one verified dataset rather than the screenshot's three example sources.
The used-source card displays dynamic catalog metadata, actual returned record,
provider identity and a source link. The NASA feature is a reference resource,
not a claim that NASA supplied an ERA5 investigation.

View Details opens an accessible native modal with Methodology, Data Limitations
and Citations tabs, keyboard arrow navigation and Escape-to-close behavior.
NASA IMERG, MODIS LST and MCD12Q1 links are background reading in the reference
library, explicitly separate from citations for the actual investigation.
MODIS NDVI is not labelled as land cover classification. A version-specific
NDVI DOI is not assigned because the backend does not report collection version.

## Validation

The primary application runs on Next.js. The shared shell preserves the
standalone full-width layout of Data Sources, Insights and Trend Analysis.
The supplemental Vite entry loads its Next-specific dashboard shell lazily,
so standalone analysis pages do not evaluate Next navigation code on startup.

Validation covers:

- Strict catalog fetching, cancellation, HTTP/network/schema errors and the
  existing default fallback behavior for other API callers.
- Only the actually observed dataset being labelled used; identity, region,
  source type and measurement-period mismatches are rejected.
- Benchmark and missing provenance rejection; empty and nonfinite measurements;
  unsafe source URLs; explicit scientific distinctions between NDVI, land cover,
  air temperature, land surface temperature and surface soil moisture.
- Live ERA5 catalog and observational response integration, plus test-only UI
  fixtures for the temperature, soil-moisture and MODIS NDVI presentations.
- External-link opening, all documentation tabs, keyboard navigation, focus
  wrapping, Escape, focus restoration and body-scroll restoration.
- Layouts at 1670, 1024, 768, 390 and 320px; desktop/tablet/mobile screenshots;
  citation-dialog overflow; GSAP cleanup and reduced motion.
- Error/retry, loading, empty catalog, missing investigation, missing metadata,
  no measurements and invalid-source states.
- Trend Analysis ↔ Insights ↔ Data Sources selection preservation, and the
  existing Insights interactions and downloaded report as a regression check.

From `frontend`, run:

```sh
npm ci
npm run build
node --test tests/api.test.cjs tests/insights.test.cjs tests/data-sources.test.cjs
```

Start the frontend on port 3000 and backend on port 8080. With an installed
Playwright package and Microsoft Edge, run:

```sh
node tests/data-sources.browser.cjs
node tests/insights.browser.cjs
```

If Playwright is installed outside this project, set `PLAYWRIGHT_MODULE` to its
absolute package directory. `INSIGHTS_ORIGIN` can override the frontend origin.
Screenshots are written to the ignored `frontend/dist` directory. External-link
navigation is intercepted only in the browser test to avoid depending on NASA
site uptime; the initial dataset and observational response use the live backend.
The additional Vite build is available as `npm run vite:build`.

## References checked during implementation

- NASA IMERG: https://gpm.nasa.gov/data/imerg
- NASA MODIS vegetation indices: https://modis.gsfc.nasa.gov/data/dataprod/mod13.php
- NASA MODIS land surface temperature: https://modis.gsfc.nasa.gov/data/dataprod/mod11.php
- Open-Meteo source documentation: https://open-meteo.com/en/docs/historical-weather-api
- ERA5 primary reference: https://doi.org/10.1002/qj.3803
- ERA5-Land primary reference: https://doi.org/10.5194/essd-13-4349-2021

## Artwork

Official NASA insignia was downloaded unchanged from:
https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo.svg
and saved as `frontend/public/textures/nasa-logo.svg`.

Decorative satellite artwork was generated with the built-in imagegen tool
and saved as `frontend/public/textures/data-sources-satellite.png`.
It illustrates a generic spacecraft, not a specific source mission.

Final generation prompt:

> Use case: stylized-concept. Asset type: decorative satellite illustration for the left half of a dark navy scientific data sources dashboard feature card. Wide 3:2 landscape image, cinematic detailed orbital Earth-observation satellite with gold foil insulated central instrument body and two long cobalt blue rectangular solar panel wings, diagonally spanning upper left to lower right across frame, hovering above curved luminous blue Earth horizon at bottom. Background almost black deep space #050B19, subtle teal atmosphere light and a few small stars. Main satellite sits on left two thirds, right third fades to clean empty deep navy negative space for text overlay. Polished realistic 3D illustration consistent with a premium NASA education dashboard. No words, no logos, no typography, no interface, no watermark. Generic illustrative spacecraft, do not imply a specific satellite mission or measured observation.
