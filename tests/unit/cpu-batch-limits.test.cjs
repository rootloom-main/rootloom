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

const limits = require(path.join(__dirname, '../../lib/utils/cpu-batch-limits.ts'));

test('cron work is bounded to small, explicit batches', () => {
  assert.equal(limits.ABANDONED_CART_BATCH_SIZE, 50);
  assert.equal(limits.COUPON_NUDGE_BATCH_SIZE, 50);
  assert.equal(limits.PAYMENT_RESERVATION_BATCH_SIZE, 100);
});
