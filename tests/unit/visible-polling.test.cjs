const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const { startVisiblePolling } = require(path.join(__dirname, '../../lib/utils/visible-polling.ts'));

function setupDocument(initialVisibility = 'visible') {
  const listeners = new Set();
  return {
    visibilityState: initialVisibility,
    addEventListener: (_name, listener) => listeners.add(listener),
    removeEventListener: (_name, listener) => listeners.delete(listener),
    changeVisibility(visibility) {
      this.visibilityState = visibility;
      for (const listener of listeners) listener();
    },
    listenerCount: () => listeners.size,
  };
}

function setupScheduler() {
  let nextId = 0;
  const callbacks = new Map();
  return {
    callbacks,
    setInterval(callback, ms) {
      const id = ++nextId;
      callbacks.set(id, { callback, ms });
      return id;
    },
    clearInterval(id) {
      callbacks.delete(id);
    },
  };
}

test('visible polling refreshes immediately and polls only while visible', () => {
  const doc = setupDocument();
  const scheduler = setupScheduler();
  let refreshes = 0;
  const stop = startVisiblePolling(doc, () => refreshes++, 120_000, scheduler);

  assert.equal(refreshes, 1);
  assert.equal(scheduler.callbacks.size, 1);
  assert.equal([...scheduler.callbacks.values()][0].ms, 120_000);

  doc.changeVisibility('hidden');
  assert.equal(scheduler.callbacks.size, 0);
  assert.equal(refreshes, 1);

  doc.changeVisibility('visible');
  assert.equal(scheduler.callbacks.size, 1);
  assert.equal(refreshes, 2);

  stop();
  assert.equal(scheduler.callbacks.size, 0);
  assert.equal(doc.listenerCount(), 0);
});

test('hidden pages do not start a timer until they become visible', () => {
  const doc = setupDocument('hidden');
  const scheduler = setupScheduler();
  let refreshes = 0;
  const stop = startVisiblePolling(doc, () => refreshes++, 120_000, scheduler);

  assert.equal(refreshes, 0);
  assert.equal(scheduler.callbacks.size, 0);
  doc.changeVisibility('visible');
  assert.equal(refreshes, 1);
  assert.equal(scheduler.callbacks.size, 1);
  stop();
});
