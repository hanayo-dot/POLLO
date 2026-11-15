const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(readFileSync(join(__dirname, '../src/features/trend-analysis/variables.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exported = {};
runInNewContext(compiled, { exports: exported });
const { variableOptions } = exported;
const dataset = (id, name, category, regions = ['basin']) => ({ id, name, category, supported_regions: regions });
const catalog = [
  dataset('MODIS_LST', 'Land Surface Temperature', 'land'),
  dataset('MERRA2_T2M', 'Air Temperature', 'atmosphere'),
  dataset('MERRA2_QV2M', 'Specific Humidity', 'atmosphere'),
  dataset('GPM_PRECIP', 'Rainfall', 'precipitation'),
  dataset('SMAP_SOIL', 'Root-Zone Soil Moisture', 'land'),
];

test('presents four climate choices and excludes humidity and duplicate temperatures', () => {
  const options = variableOptions(catalog, 'basin');
  assert.deepEqual(Array.from(options, v => v.label), ['Temperature', 'Rainfall', 'Vegetation', 'Soil moisture']);
  assert.equal(options[0].dataset.id, 'MERRA2_T2M');
  assert.equal(options[1].dataset.id, 'GPM_PRECIP');
  assert.equal(options[3].dataset.id, 'SMAP_SOIL');
});

test('missing vegetation remains explicitly unavailable without substituting a dataset', () => {
  const vegetation = variableOptions(catalog, 'basin').find(v => v.kind === 'vegetation');
  assert.equal(vegetation.dataset, undefined);
  assert.equal(vegetation.id, 'vegetation');
});

test('automatically uses an available vegetation dataset from the backend catalog', () => {
  const ndvi = dataset('NDVI_MONTHLY', 'Vegetation Index', 'vegetation');
  const vegetation = variableOptions([...catalog, ndvi], 'basin').find(v => v.kind === 'vegetation');
  assert.equal(vegetation.dataset, ndvi);
  assert.equal(vegetation.id, 'NDVI_MONTHLY');
});

test('does not reuse datasets unsupported by the selected region', () => {
  assert.equal(variableOptions(catalog, 'other-region').filter(v => v.dataset).length, 0);
});

test('uses surface temperature when air temperature is unavailable in a region', () => {
  const options = variableOptions(catalog.filter(v => v.id !== 'MERRA2_T2M'), 'basin');
  assert.equal(options[0].dataset.id, 'MODIS_LST');
});
