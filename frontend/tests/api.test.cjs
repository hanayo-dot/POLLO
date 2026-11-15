const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function service(fetch) {
  const source = readFileSync(join(__dirname, '../src/services/api.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, fetch, URLSearchParams, process: { env: {} } });
  return exports;
}

test('forwards date range and cancellation while preserving backend statistics', async () => {
  const response = { series: [{ date: '2010-01', value: 12 }], trend: { annual_rate: -0.123, p_value: 0.021 } };
  const controller = new AbortController();
  const api = service(async (url, options) => {
    const params = new URL(url, "http://localhost").searchParams;
    assert.equal(params.get('region'), 'lake_victoria_basin');
    assert.equal(params.get('variable'), 'GPM_PRECIP');
    assert.equal(params.get('deseasonalize'), 'false');
    assert.equal(params.get('start'), '2010-01');
    assert.equal(params.get('end'), '2014-12');
    assert.equal(options.signal, controller.signal);
    return { ok: true, json: async () => response };
  });
  const result = await api.fetchTimeSeries('lake_victoria_basin', 'GPM_PRECIP', false, { start: '2010-01', end: '2014-12', signal: controller.signal });
  assert.equal(result, response);
});

test('retains compatibility with callers without a date range', async () => {
  const api = service(async url => {
    const params = new URL(url, "http://localhost").searchParams;
    assert.equal(params.get('deseasonalize'), 'true');
    assert.equal(params.has('start'), false);
    assert.equal(params.has('end'), false);
    return { ok: true, json: async () => ({ series: [] }) };
  });
  await api.fetchTimeSeries('region', 'variable', true);
});

test('surfaces backend empty-range errors', async () => {
  const api = service(async () => ({ ok: false, json: async () => ({ error: 'No data available for the specified range' }) }));
  await assert.rejects(api.fetchTimeSeries('region', 'variable'), /No data available/);
});

test('handles non-JSON error responses', async () => {
  const api = service(async () => ({ ok: false, json: async () => { throw new Error('Invalid JSON'); } }));
  await assert.rejects(api.fetchTimeSeries('region', 'variable'), /Failed to fetch time series/);
});
