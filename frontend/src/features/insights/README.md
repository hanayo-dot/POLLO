# Insights & Findings

Open **Insights** in the Trend Analysis navigation after an analysis completes.
The URL carries the completed result's region, variable, start month and end
month. Editing the date controls without running another analysis does not
change the selection associated with the previous result. Back navigation
restores all four controls. Both Vite and Next.js expose `/insights`.

The page is implemented in **TypeScript and React**, with **Tailwind CSS**
utilities controlling layout, responsive breakpoints, typography, colours,
focus states and interactions. The approved palette lives in
`tailwind.config.ts` under `discovery`. Small shared component styles use
Tailwind `@apply`; custom CSS is reserved for decorative artwork, glows and
card waves. The page no longer imports Trend Analysis's stylesheet.

**GSAP** controls scoped, staggered section reveals and the explanation-text
transition. Animation contexts are cleaned up on rerender/unmount, and
`prefers-reduced-motion` is respected. The existing animated variable
illustration also uses GSAP. ECharts remains in Trend Analysis, where the
interactive climate chart belongs; MapLibre GL, Three.js and React Three Fiber
remain available for map and 3D views when those are needed.

The page uses `fetchTimeSeries` from the existing API service and the existing
`TrendResult`, variable, region and source types. It requests raw monthly
observational data, not seasonally adjusted values. Missing or nonfinite
statistics produce an empty state; missing observational provenance or a
benchmark source produces an error rather than apparently measured findings.

There is no AI explanation endpoint in the backend. The card is explicitly
labelled **Data-based Insight**. Explain Simply switches between grounded
technical and plain-language descriptions. The backend interpretation is
available in the methodology disclosure. Impacts are conditional and separate
from the measured trend, with extra qualification for nonsignificant results.
Units retain the backend's meaning: for rainfall, `mm/month/year` describes
annual change in monthly rainfall totals, not annual accumulated rainfall.

## Report and backend coordination

The merged backend provides `/export/timeseries` (CSV/JSON), but its handler
calls `GenerateBenchmarkTimeSeries` and does not use the observational source
that powers Trend Analysis. There is no observational report-generation
endpoint or AI endpoint. Do not connect this page's report button to the
benchmark export handler without updating that handler first.

Download Report creates a real self-contained HTML report from the exact
response displayed on the page. It includes every trend statistic, backend
interpretation, possible implications, source details, limitations, an SVG
chart with elapsed calendar months, and the complete measurement table. Open
the downloaded report in a browser to read it or print it to PDF. It requires
no additional requests and cannot silently substitute benchmark values.
All backend text is escaped before insertion into the report.

## Validation

From `frontend`:

```sh
npm run build
node --test tests/api.test.cjs tests/insights.test.cjs
```

The browser smoke test uses an installed `playwright` package and Microsoft
Edge. Start the frontend on port 3000 and backend on port 8080, then run
`node tests/insights.browser.cjs`. If Playwright is installed elsewhere, set
`PLAYWRIGHT_MODULE` to its absolute package directory. It uses a live ERA5
backend result for statistics, explanation, keyboard operation, report
contents and return navigation; intercepted responses explicitly test error,
retry, loading, empty and benchmark-rejection states. Screenshots are written
to the ignored `frontend/dist` directory at 1670, 1024, 768 and 390px widths.

## Decorative artwork

`frontend/public/textures/insights-rainfall.png` was generated using the
built-in image generation tool. The existing Earth horizon asset and native
variable SVG illustration are reused. Imagery is decorative and does not
represent measured conditions.

Final generation prompt:

> Use case: stylized-concept. Asset type: decorative landscape background for a scientific dark navy climate dashboard card. Create a polished cinematic digital illustration, landscape 3:2 composition. Deep midnight navy blue storm sky with luminous soft blue rainclouds in upper right, delicate diagonal falling rain on the right, distant lush rolling green East African hills, rich moss and grass bottom edge, one vivid lime green seedling with five translucent luminous leaves in lower right foreground. Left half mostly very dark navy negative space for white text overlay. Atmospheric teal blue glow, high quality realistic painterly rendering like an environmental science game. No text, no typography, no UI, no border, no watermark. The scene is decorative and must not depict specific measured findings.
