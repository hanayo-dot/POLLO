// Start frontend + backend; set PLAYWRIGHT_MODULE if Playwright is installed elsewhere.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');

(async () => {
  mkdirSync('dist', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1670, height: 1000 }, reducedMotion: 'reduce' });
    page = await context.newPage();
    page.setDefaultTimeout(25000);
    page.setDefaultNavigationTimeout(120000);
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.stack || error.message); });
    const origin = process.env.INSIGHTS_ORIGIN || 'http://127.0.0.1:3000';
    const query = 'region=lake_victoria_basin&variable=ERA5_RAIN&start=2020-01&end=2023-12';
    const url = `${origin}/data-sources?${query}`;
    const [catalogResponse, seriesResponse] = await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/api/v1/datasets'), { timeout: 120000 }),
      page.waitForResponse(response => response.url().includes('/api/v1/timeseries?'), { timeout: 120000 }),
      page.goto(url),
    ]);
    assert.equal(catalogResponse.ok(), true);
    assert.equal(seriesResponse.ok(), true);
    const catalog = await catalogResponse.json();
    const result = await seriesResponse.json();
    const dataset = catalog.find(item => item.id === 'ERA5_RAIN');
    await page.getByTestId('used-dataset').waitFor({ timeout: 60000 });
    assert.equal(await page.getByRole('navigation', { name: 'Main navigation' }).count(), 1);
    assert.equal(await page.getByTestId('used-dataset').count(), 1);
    const usedText = await page.getByTestId('used-dataset').innerText();
    for (const value of [dataset.name, dataset.spatial_resolution, dataset.units, result.source.name]) assert.ok(usedText.includes(value));
    assert.ok(!usedText.includes('IMERG') && !usedText.includes('MCD12Q1'));
    console.log('Live catalog, observational provenance and single-dataset usage passed');
    await page.screenshot({ path: 'dist/data-sources-desktop.png', fullPage: true });

    // Verify external-link behavior without depending on a third-party site's uptime.
    await context.route('https://www.earthdata.nasa.gov/**', route => route.fulfill({ contentType: 'text/html', body: '<title>External navigation test</title>' }));
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: /^Explore NASA Data/ }).click();
    const popup = await popupPromise;
    await popup.waitForURL('https://www.earthdata.nasa.gov/**');
    await popup.close();
    assert.equal(await page.getByRole('link', { name: /^Open data provider/ }).getAttribute('href'), result.source.url);
    for (const link of await page.locator('a[target="_blank"]').all()) assert.match(await link.getAttribute('rel'), /noopener/);
    assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);

    const viewDetails = page.getByRole('button', { name: 'View Details', exact: true });
    await viewDetails.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    await page.getByRole('tab', { name: 'Methodology', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Data Limitations', exact: true }).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab', { name: 'Citations', exact: true }).getAttribute('aria-selected'), 'true');
    const citations = await page.getByRole('tabpanel').innerText();
    assert.ok(citations.includes('Hersbach') && citations.includes(dataset.id));
    assert.ok(citations.includes('Background reading only'));
    // Native modal must keep keyboard focus inside the dialog.
    for (let i = 0; i < 15; i++) { await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true); }
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await viewDetails.evaluate(element => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    for (const tab of ['Methodology', 'Data Limitations', 'Citations']) {
      await page.getByRole('button', { name: new RegExp(`^${tab}`) }).click();
      assert.equal(await page.getByRole('tab', { name: tab, exact: true }).getAttribute('aria-selected'), 'true');
      await page.getByRole('button', { name: 'Close details', exact: true }).click();
    }
    console.log('External links, keyboard dialog, focus restoration and documentation passed');

    await page.screenshot({ path: 'dist/data-sources-desktop.png', fullPage: true });
    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Horizontal page overflow at ${width}px`);
      await viewDetails.click();
      assert.equal(await page.getByRole('dialog').evaluate(element => element.getBoundingClientRect().width <= innerWidth), true);
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
      await page.screenshot({ path: `dist/data-sources-${width}.png`, fullPage: true });
    }

    // Real navigation must preserve the same investigation in both directions.
    await page.getByRole('link', { name: 'Insights', exact: true }).click({ timeout: 120000 });
    await page.getByRole('heading', { name: 'Data-based Insight' }).waitFor({ timeout: 60000 });
    assert.equal(new URL(page.url()).searchParams.get('variable'), 'ERA5_RAIN');
    await page.getByRole('link', { name: 'Data Sources', exact: true }).click({ timeout: 120000 });
    await page.getByTestId('used-dataset').waitFor();
    await page.getByRole('link', { name: 'Back to Trend Analysis', exact: true }).click({ timeout: 120000 });
    await page.waitForFunction(() => document.querySelector('select[aria-label="Climate variable"]')?.value === 'ERA5_RAIN' && !document.querySelector('.trend-run')?.disabled);
    assert.equal(await page.getByLabel('Start month', { exact: true }).inputValue(), '2020-01');
    assert.equal(await page.getByLabel('End month', { exact: true }).inputValue(), '2023-12');
    await page.getByRole('link', { name: 'Data Sources', exact: true }).click({ timeout: 120000 });
    await page.getByTestId('used-dataset').waitFor();
    console.log('Desktop/tablet/mobile layouts and Trend Analysis ↔ Insights ↔ Data Sources passed');

    // Fault injection uses copies of the live response, only inside this test.
    await page.route('**/api/v1/datasets', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await page.goto(url);
    await page.getByRole('heading', { name: 'We couldn’t verify the data sources' }).waitFor();
    assert.equal(await page.getByTestId('used-dataset').count(), 0);
    await page.unroute('**/api/v1/datasets');
    await page.getByRole('button', { name: 'Retry sources', exact: true }).click();
    await page.getByTestId('used-dataset').waitFor();
    await page.route('**/api/v1/datasets', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
    await page.goto(url);
    await page.getByRole('heading', { name: 'No datasets available' }).waitFor();
    await page.unroute('**/api/v1/datasets');
    await page.goto(`${origin}/data-sources`);
    await page.getByRole('heading', { name: 'No investigation selected' }).waitFor();
    assert.equal(await page.getByTestId('used-dataset').count(), 0);

    async function renderResponse(response, delay = 0) {
      await page.unroute('**/api/v1/timeseries?**');
      await page.route('**/api/v1/timeseries?**', async route => { if (delay) await new Promise(resolve => setTimeout(resolve, delay)); await route.fulfill({ contentType: 'application/json', body: JSON.stringify(response) }); });
      await page.goto(url);
    }
    await renderResponse({ ...result, series: [] });
    await page.getByRole('heading', { name: 'No data sources used for this period' }).waitFor();
    for (const source of [undefined, { ...result.source, kind: 'benchmark' }]) {
      await renderResponse({ ...result, source });
      await page.getByRole('heading', { name: 'We couldn’t verify the data sources' }).waitFor();
      assert.equal(await page.getByTestId('used-dataset').count(), 0);
    }
    await renderResponse({ ...result, region: { ...result.region, id: 'different-region' } });
    await page.getByText(/The returned source does not match/).waitFor();
    await renderResponse(result, 1000);
    await page.getByText('Verifying investigation sources…', { exact: true }).waitFor();
    await page.getByTestId('used-dataset').waitFor();
    await renderResponse({ ...result, source: { ...result.source, retrieved_at: undefined, missing_months: undefined } });
    await page.getByTestId('used-dataset').waitFor();
    await page.getByText(/Source retrieved: Not supplied.*Missing months: Not supplied/).waitFor();

    // Check alternate dataset presentations with explicit UI fixtures, not actual observations.
    for (const id of ['ERA5_TEMP', 'ERA5_SOIL', 'MODIS_NDVI']) {
      const variable = catalog.find(item => item.id === id);
      assert.ok(variable);
      await page.unroute('**/api/v1/timeseries?**');
      await page.route('**/api/v1/timeseries?**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...result, variable, source: { ...result.source, kind: id === 'MODIS_NDVI' ? 'satellite' : 'reanalysis', name: 'UI fixture provider' } }) }));
      await page.goto(`${origin}/data-sources?${query.replace('ERA5_RAIN', id)}`);
      await page.getByTestId('used-dataset').waitFor();
      assert.ok((await page.getByTestId('used-dataset').innerText()).includes(variable.name));
      await page.getByRole('button', { name: /^Source & citation details/ }).click();
      assert.equal(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth), true, `Citation dialog overflow for ${id}`);
      await page.keyboard.press('Escape');
    }
    await page.unroute('**/api/v1/timeseries?**');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(url);
    await page.getByTestId('used-dataset').waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.sources-reveal')).every(element => getComputedStyle(element).opacity === '1' && element.style.transform === ''));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.deepEqual(errors, []);
    console.log('PASS: live provenance; external links; dialog/tabs/keyboard; 1670/1024/768/390/320px; cross-page navigation; loading/error/retry/empty/benchmark states; alternate-variable UI; GSAP/reduced motion.');
  } catch (error) {
    if (page) { await page.screenshot({ path: 'dist/data-sources-failure.png', fullPage: true }).catch(() => {}); }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
