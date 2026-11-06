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

const { hasSupabaseAuthCookie } = require(path.join(__dirname, '../../lib/utils/supabase-auth-cookie.ts'));

test('detects standard and chunked Supabase auth cookies', () => {
  assert.equal(hasSupabaseAuthCookie([{ name: 'sb-abc-auth-token' }]), true);
  assert.equal(hasSupabaseAuthCookie([{ name: 'sb-abc-auth-token.0' }]), true);
  assert.equal(hasSupabaseAuthCookie([{ name: 'sb-access-token' }]), true);
});

test('does not classify unrelated cookies as Supabase sessions', () => {
  assert.equal(hasSupabaseAuthCookie([{ name: 'rootloom_attribution' }]), false);
  assert.equal(hasSupabaseAuthCookie([{ name: 'sb-abc-auth-tokenized' }]), false);
  assert.equal(hasSupabaseAuthCookie([]), false);
});
