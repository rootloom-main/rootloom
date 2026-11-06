const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { getRetryDelayMs } = require(path.join(__dirname, '../../lib/utils/retry-backoff.ts'));

test('job retry delay backs off exponentially and caps at 30 minutes', () => {
  assert.equal(getRetryDelayMs(1), 2 * 60_000);
  assert.equal(getRetryDelayMs(2), 4 * 60_000);
  assert.equal(getRetryDelayMs(3), 8 * 60_000);
  assert.equal(getRetryDelayMs(10), 30 * 60_000);
});

test('invalid retry attempt values use the safe first retry delay', () => {
  assert.equal(getRetryDelayMs(0), 2 * 60_000);
  assert.equal(getRetryDelayMs(Number.NaN), 2 * 60_000);
});
