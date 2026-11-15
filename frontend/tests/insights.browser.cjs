// Run with PLAYWRIGHT_MODULE pointing to an installed playwright package.
// Start the frontend and backend first. No fixtures are used for the live check.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  console.log('Browser started');
  try {
    const page = await browser.newPage({ viewport: { width: 1670, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
    const origin = process.env.INSIGHTS_ORIGIN || 'http://127.0.0.1:3000';
    await page.goto(`${origin}/insights`);
    await page.getByRole('heading', { name: 'Your discoveries start with an analysis' }).waitFor();
    console.log('Empty state passed');
    assert.equal(await page.getByRole('button', { name: 'Download Report', exact: true }).count(), 0);

    const query = 'region=lake_victoria_basin&variable=ERA5_RAIN&start=2020-01&end=2023-12';
    const responsePromise = page.waitForResponse(response => response.url().includes('/timeseries?'));
    await page.goto(`${origin}/insights?${query}`);
    const response = await responsePromise;
    assert.equal(response.ok(), true);
    const result = await response.json();
    assert.equal(result.source.kind, 'reanalysis');
    await page.getByRole('heading', { name: 'Data-based Insight' }).waitFor({ timeout: 60000 });
    console.log('Live backend page loaded');
    assert.equal(await page.locator('.insights-page').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(5, 11, 25)');
    const rate = `${result.trend.annual_rate.toLocaleString('en', { maximumSignificantDigits: 4 })} ${result.trend.units}/year`;
    await page.getByText(rate, { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Explain Simply', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Show Technical Detail' }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: 'Show Technical Detail' }).click();
    await page.getByRole('button', { name: 'Explain Simply', exact: true }).focus();
    await page.keyboard.press('Space');
    assert.equal(await page.getByRole('button', { name: 'Show Technical Detail' }).getAttribute('aria-pressed'), 'true');
    await page.keyboard.press('Space');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Report', exact: true }).click();
    const download = await downloadPromise;
    const report = readFileSync(await download.path(), 'utf8');
    assert.ok(report.includes(String(result.trend.annual_rate)));
    assert.ok(report.includes(result.trend.interpretation));
    assert.ok(report.includes('<polyline'));
    assert.equal((report.match(/<tr><td>/g) || []).length, result.series.length);

    await page.screenshot({ path: 'dist/insights-desktop.png', fullPage: true });
    for (const width of [1024, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Overflow at ${width}px`);
      await page.screenshot({ path: `dist/insights-${width}.png`, fullPage: true });
    }
    await page.getByRole('link', { name: 'Back to Trend Analysis', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('select[aria-label="Climate variable"]')?.value === 'ERA5_RAIN');
    assert.equal(await page.getByRole('combobox', { name: 'Climate variable', exact: true }).inputValue(), 'ERA5_RAIN');
    assert.equal(await page.getByLabel('Start month', { exact: true }).inputValue(), '2020-01');
    assert.equal(await page.getByLabel('End month', { exact: true }).inputValue(), '2023-12');
    await page.waitForFunction(() => !document.querySelector('.trend-run')?.disabled);
    await page.locator('.trend-date-picker summary').click();
    await page.getByLabel('Start month', { exact: true }).fill('2021-01');
    await page.getByRole('link', { name: 'Insights', exact: true }).click();
    // Unsubmitted controls must not relabel the completed analysis.
    assert.equal(new URL(page.url()).searchParams.get('start'), '2020-01');
    await page.getByRole('heading', { name: 'Data-based Insight' }).waitFor();

    // Fault injection checks loading, recoverable errors and missing statistics.
    await page.route('**/api/v1/timeseries?**', async route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Test service unavailable' }) }));
    await page.goto(`${origin}/insights?${query}`);
    await page.getByRole('heading', { name: 'We couldn’t load your findings' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Download Report', exact: true }).count(), 0);
    await page.unroute('**/api/v1/timeseries?**');
    await page.route('**/api/v1/timeseries?**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...result, trend: undefined, series: [] }) }));
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByRole('heading', { name: 'Not enough data for findings' }).waitFor();
    await page.unroute('**/api/v1/timeseries?**');
    await page.route('**/api/v1/timeseries?**', async route => { await new Promise(resolve => setTimeout(resolve, 800)); await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) }); });
    await page.goto(`${origin}/insights?${query}`);
    await page.getByRole('heading', { name: 'Reading your climate findings…' }).waitFor();
    await page.getByRole('heading', { name: 'Data-based Insight' }).waitFor();
    await page.unroute('**/api/v1/timeseries?**');
    await page.route('**/api/v1/timeseries?**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...result, source: { ...result.source, kind: 'benchmark' } }) }));
    await page.goto(`${origin}/insights?${query}`);
    await page.getByText('This analysis has no observational source.', { exact: false }).waitFor();
    await page.unroute('**/api/v1/timeseries?**');
    await page.route('**/api/v1/timeseries?**', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) }));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${origin}/insights?${query}`);
    await page.getByRole('heading', { name: 'Data-based Insight' }).waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.insights-reveal')).every(element => getComputedStyle(element).opacity === '1' && element.style.transform === ''));
    await page.getByRole('button', { name: 'Explain Simply', exact: true }).click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#insight-explanation')).opacity === '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#insight-explanation').evaluate(element => getComputedStyle(element).opacity), '1');
    assert.deepEqual(errors, []);
    console.log('PASS: live backend statistics, keyboard/explanation toggle, downloaded report, back navigation, Tailwind palette, desktop/tablet/mobile, error/retry/empty/loading states, GSAP animations and reduced motion; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
