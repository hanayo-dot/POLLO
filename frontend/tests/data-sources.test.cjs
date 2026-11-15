const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const compiled = ts.transpileModule(readFileSync(join(__dirname, '../src/features/data-sources/provenance.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exportsObject = {};
runInNewContext(compiled, { exports: exportsObject, URL });
const { usedDatasets, safeSourceURL, documentation, NASA_REFERENCES } = exportsObject;
const selection = { region: 'test-region', variable: 'ERA5_RAIN', start: '2020-01', end: '2020-04' };
const dataset = { id: 'ERA5_RAIN', name: 'Rainfall', supported_regions: ['test-region'] };
const analysis = () => ({ region: { id: 'test-region' }, variable: dataset, source: { kind: 'reanalysis' }, series: [{ date: '2020-01', value: 0 }, { date: '2020-04', value: 42 }] });

test('only the observed dataset is marked used, irrespective of catalog availability', () => {
  const catalog = [dataset, { id: 'GPM_PRECIP' }, { id: 'MODIS_LST' }, { id: 'MCD12Q1' }];
  const used = usedDatasets(catalog, analysis(), selection);
  assert.equal(used.length, 1);
  assert.equal(used[0], dataset);
});

test('zero-valued measurements count as data; empty and nonfinite records do not', () => {
  for (const series of [[], [{ date: '2020-01', value: null }], [{ date: '2020-01', value: NaN }], [{ date: '2020-01', value: Infinity }]]) assert.equal(usedDatasets([dataset], { ...analysis(), series }, selection).length, 0);
  assert.equal(usedDatasets([dataset], { ...analysis(), series: [{ date: '2020-01', value: 0 }] }, selection).length, 1);
});

test('benchmark and missing provenance cannot be passed off as observed evidence', () => {
  for (const source of [undefined, { kind: 'benchmark' }, { kind: 'unknown' }]) assert.throws(() => usedDatasets([dataset], { ...analysis(), source }, selection), /verified observational source/);
});

test('mismatched region, variable, catalog and source type are rejected', () => {
  assert.throws(() => usedDatasets([dataset], { ...analysis(), region: { id: 'other' } }, selection), /does not match/);
  assert.throws(() => usedDatasets([dataset], { ...analysis(), variable: { id: 'MODIS_LST' } }, selection), /does not match/);
  assert.throws(() => usedDatasets([], analysis(), selection), /missing from/);
  assert.throws(() => usedDatasets([{ ...dataset, supported_regions: [] }], analysis(), selection), /does not support/);
  assert.throws(() => usedDatasets([dataset], { ...analysis(), source: { kind: 'satellite' } }, selection), /source type/);
});

test('measurements from another period or with malformed dates cannot establish usage', () => {
  for (const date of ['2019-12', '2020-05', '2020-13', '', null]) assert.throws(() => usedDatasets([dataset], { ...analysis(), series: [{ date, value: 1 }] }, selection), /requested period/);
  assert.throws(() => usedDatasets([dataset], { ...analysis(), series: null }, selection), /measurements are invalid/);
});

test('satellite NDVI is accepted without being labelled land cover classification', () => {
  const ndvi = { ...dataset, id: 'MODIS_NDVI' };
  assert.equal(usedDatasets([ndvi], { ...analysis(), variable: ndvi, source: { kind: 'satellite' } }, { ...selection, variable: ndvi.id }).length, 1);
  assert.match(documentation.MODIS_NDVI.description, /does not classify land cover/);
  assert.match(documentation.ERA5_TEMP.description, /not satellite land surface temperature/);
  assert.match(documentation.ERA5_SOIL.description, /0–7 cm/);
  assert.equal(documentation.MCD12Q1, undefined);
  assert.equal(documentation.GPM_PRECIP, undefined);
});

test('provider links reject executable or non-web protocols; references use official sources', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,hi', 'file:///secret', '/relative', 'bad url', undefined]) assert.equal(safeSourceURL(value), undefined);
  assert.equal(safeSourceURL('https://example.com/data'), 'https://example.com/data');
  for (const ref of NASA_REFERENCES) assert.ok(new URL(ref.url).hostname.endsWith('.nasa.gov'));
  assert.match(documentation.MODIS_NDVI.limitations, /confirm the granule version/);
});
