const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Load the TypeScript helper directly so these tests exercise production code
// without adding a second test framework to the project.
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

const {
  PAYMENT_RESERVATION_TTL_MINUTES,
  buildReservationMetadata,
  doesPaymentMatchReservationItems,
  hasActiveReservation,
} = require(path.join(__dirname, '../../lib/payments/reservations.ts'));

test('reservation metadata expires after the configured TTL', () => {
  const before = Date.now();
  const metadata = buildReservationMetadata({ checkout: 'web' });
  const after = Date.now();
  const expiresAt = Date.parse(metadata.reservation_expires_at);

  assert.equal(metadata.checkout, 'web');
  assert.equal(metadata.reservation_status, 'active');
  assert.ok(expiresAt >= before + PAYMENT_RESERVATION_TTL_MINUTES * 60_000);
  assert.ok(expiresAt <= after + PAYMENT_RESERVATION_TTL_MINUTES * 60_000);
  assert.ok(Date.parse(metadata.reserved_at) >= before);
});

test('reservation items match independent of order or optional cart item ids', () => {
  assert.equal(
    doesPaymentMatchReservationItems(
      { cart_snapshot: [{ id: 'cart-a', variant_id: 'v1', quantity: 2 }, { variant_id: 'v2', quantity: 1 }] },
      [{ variant_id: 'v2', quantity: 1 }, { id: 'cart-b', variant_id: 'v1', quantity: 2 }],
    ),
    true,
  );
});

test('reservation items do not match when a variant or quantity differs', () => {
  const snapshot = { cart_snapshot: [{ variant_id: 'v1', quantity: 2 }] };

  assert.equal(doesPaymentMatchReservationItems(snapshot, [{ variant_id: 'v1', quantity: 1 }]), false);
  assert.equal(doesPaymentMatchReservationItems(snapshot, [{ variant_id: 'v2', quantity: 2 }]), false);
});

test('only unexpired active or recovered reservations count as active', () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();

  assert.equal(hasActiveReservation({ metadata: { reservation_status: 'active', reservation_expires_at: future } }), true);
  assert.equal(hasActiveReservation({ metadata: { reservation_status: 'recovered', reservation_expires_at: future } }), true);
  assert.equal(hasActiveReservation({ metadata: { reservation_status: 'active', reservation_expires_at: past } }), false);
  assert.equal(hasActiveReservation({ metadata: { reservation_status: 'released', reservation_expires_at: future } }), false);
  assert.equal(hasActiveReservation({ metadata: { reservation_status: 'active', reservation_expires_at: 'invalid' } }), false);
});
