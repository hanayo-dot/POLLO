const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function load(relative) {
  const filename = join(__dirname, '../src/features', relative);
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, URLSearchParams, require: () => load('trend-analysis/variables.ts') });
  return exports;
}
const { readSelection, hasTrend, describeFindings, buildReport, formatP } = load('insights/findings.ts');
const selection = { region: 'test-region', variable: 'ERA5_RAIN', start: '2020-01', end: '2020-04' };
function response(overrides = {}) {
  return {
    region: { id: 'test-region', name: 'Test basin' },
    variable: { id: 'ERA5_RAIN', name: 'Rainfall', category: 'precipitation', units: 'mm/month', producing_org: 'Test provider', spatial_resolution: 'Test cell' },
    source: { name: 'Test reanalysis', kind: 'reanalysis', url: 'https://example.com', retrieved_at: '2026-11-15', missing_months: 0 },
    series: [10, 9, 8, 7].map((value, i) => ({ date: `2020-0${i + 1}`, value })),
    trend: { units: 'mm/month', annual_rate: -12, sens_slope: -1, p_value: 0.021, trend_direction: 'decreasing', significance: 'significant', interpretation: 'Backend interpretation', start_date: '2020-01', end_date: '2020-04', data_points: 4, ...overrides },
  };
}

test('selection round trips and invalid or incomplete periods cannot trigger analysis', () => {
  const parsed = readSelection(`?${new URLSearchParams(selection)}`);
  assert.equal(JSON.stringify(parsed), JSON.stringify(selection));
  for (const query of ['', '?region=x', '?region=x&variable=y&start=2020-13&end=2021-01', '?region=x&variable=y&start=2022-01&end=2021-01']) assert.equal(readSelection(query), null);
});

test('findings preserve backend rate and units, and qualify uncertain trends', () => {
  const data = response({ significance: 'none', p_value: 0.32, annual_rate: -0.00231 });
  const findings = describeFindings(data);
  assert.match(findings.rate, /-0.00231 mm\/month\/year/);
  assert.equal(findings.significance, 'Not significant');
  assert.match(findings.simple, /does not give strong enough evidence/);
  assert.match(findings.takeaway, /has not been established/);
  assert.match(findings.implications, /areas to investigate rather than conclusions/);
  assert.doesNotMatch(findings.measured, /18\.6/);
  assert.equal(formatP(0), '< 0.000001');
});

test('missing or nonfinite statistics never become findings', () => {
  for (const data of [{ ...response(), trend: undefined }, { ...response(), series: [] }, response({ annual_rate: NaN }), response({ p_value: 2 }), response({ sens_slope: Infinity })]) {
    assert.equal(hasTrend(data), false);
    assert.throws(() => buildReport(data, selection), /Trend statistics/);
  }
});

test('report includes exact displayed statistics, backend interpretation, chart and all measurements', () => {
  const report = buildReport(response(), selection);
  assert.match(report, /-12 mm\/month\/year/);
  assert.match(report, /Backend interpretation/);
  assert.match(report, /0\.021/);
  assert.match(report, /<polyline/);
  assert.equal((report.match(/<tr><td>/g) || []).length, 4);
  assert.match(report, /Test reanalysis/);
  assert.match(report, /No causal attribution/);
  assert.match(report, /not measured impacts/);
});

test('report escapes backend text so downloaded HTML cannot execute injected markup', () => {
  const data = response({ interpretation: '<script>alert(1)</script>' });
  data.region.name = '<img src=x onerror=alert(1)>';
  const report = buildReport(data, selection);
  assert.doesNotMatch(report, /<script>|<img/);
  assert.match(report, /&lt;script&gt;/);
  assert.match(report, /&lt;img/);
});
