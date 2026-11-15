# Data Sources — implementation checkpoint

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

## Validation status at requested push

The TypeScript/Vite production build passed. Full browser integration,
responsive visual review and dedicated provenance tests are still pending.
This is an implementation checkpoint, not a declaration that all Task 3
acceptance criteria have been verified.

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
