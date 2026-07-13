const assert = require('assert');

class Mutex {
  constructor() {
    this.queue = Promise.resolve();
  }

  async run(fn) {
    const previous = this.queue;
    let release;
    this.queue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

function createState() {
  return {
    variant: { stock: 1, reserved: 1 },
    payment: {
      status: 'pending',
      metadata: {
        reservation_status: 'active',
        reservation_expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
      cart_snapshot: [{ variant_id: 'last-item', quantity: 1 }],
    },
    orders: new Set(),
    lock: new Mutex(),
  };
}

async function recoverReservation(state) {
  return state.lock.run(async () => {
    const reservationStatus = state.payment.metadata.reservation_status;
    if (state.payment.status === 'success' || reservationStatus === 'committed') {
      return 'already_committed';
    }

    if (reservationStatus === 'active' || reservationStatus === 'recovered') {
      state.payment.status = 'pending';
      state.payment.metadata.reservation_status = 'active';
      state.payment.metadata.reservation_expires_at = new Date(Date.now() + 15 * 60_000).toISOString();
      return 'extended';
    }

    if (state.variant.stock - state.variant.reserved < 1) {
      throw new Error('not enough stock');
    }

    state.variant.reserved += 1;
    state.payment.status = 'pending';
    state.payment.metadata.reservation_status = 'recovered';
    return 'recovered';
  });
}

async function releaseReservation(state) {
  return state.lock.run(async () => {
    const reservationStatus = state.payment.metadata.reservation_status;
    if (state.payment.status === 'success' || reservationStatus === 'committed') {
      return false;
    }

    if (reservationStatus !== 'active' && reservationStatus !== 'recovered') {
      return false;
    }

    state.variant.reserved = Math.max(0, state.variant.reserved - 1);
    state.payment.status = 'failed';
    state.payment.metadata.reservation_status = 'released';
    return true;
  });
}

async function finalizePayment(state, paymentId) {
  await recoverReservation(state);

  return state.lock.run(async () => {
    if (state.orders.has(paymentId)) {
      return 'duplicate';
    }

    if (state.variant.stock < 1 || state.variant.reserved < 1) {
      throw new Error('reserved stock unavailable');
    }

    state.variant.stock -= 1;
    state.variant.reserved -= 1;
    state.payment.status = 'success';
    state.payment.metadata.reservation_status = 'committed';
    state.orders.add(paymentId);
    return 'created';
  });
}

async function runScenario(name, fn) {
  await fn();
  console.log(`ok - ${name}`);
}

(async () => {
  await runScenario('10 concurrent late webhook retries create one order and no phantom reservation', async () => {
    const state = createState();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => finalizePayment(state, 'pay_late'))
    );
    assert.strictEqual(results.filter((result) => result === 'created').length, 1);
    assert.strictEqual(results.filter((result) => result === 'duplicate').length, 9);
    assert.strictEqual(state.variant.stock, 0);
    assert.strictEqual(state.variant.reserved, 0);
  });

  await runScenario('TTL expiry race extends existing reservation without double reserve', async () => {
    const state = createState();
    await Promise.all([recoverReservation(state), recoverReservation(state)]);
    assert.strictEqual(state.variant.stock, 1);
    assert.strictEqual(state.variant.reserved, 1);
    assert.strictEqual(state.payment.metadata.reservation_status, 'active');
  });

  await runScenario('cron and verify in the same second serialize safely', async () => {
    const state = createState();
    await Promise.allSettled([
      releaseReservation(state),
      finalizePayment(state, 'pay_race'),
    ]);
    assert.strictEqual(state.orders.size, 1);
    assert.strictEqual(state.variant.stock, 0);
    assert.strictEqual(state.variant.reserved, 0);
    assert.strictEqual(state.payment.metadata.reservation_status, 'committed');
  });

  await runScenario('last-item delayed payment success can recover after cron release', async () => {
    const state = createState();
    await releaseReservation(state);
    assert.strictEqual(state.variant.reserved, 0);
    await finalizePayment(state, 'pay_last_item');
    assert.strictEqual(state.variant.stock, 0);
    assert.strictEqual(state.variant.reserved, 0);
    assert.strictEqual(state.orders.size, 1);
  });

  await runScenario('100 concurrent checkout + delayed webhook simulation', async () => {
    const state = createState();
    state.variant.stock = 100;
    state.variant.reserved = 100;
    state.payment.cart_snapshot = [{ variant_id: 'drop-item', quantity: 1 }];

    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) => finalizePayment(state, `pay_${index}`))
    );

    assert.strictEqual(results.filter((result) => result === 'created').length, 100);
    assert.strictEqual(state.variant.stock, 0);
    assert.strictEqual(state.variant.reserved, 0);
  });

  await runScenario('20 concurrent last-item race only commits one order', async () => {
    const state = createState();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => finalizePayment(state, 'pay_last_item_race'))
    );

    assert.strictEqual(results.filter((result) => result === 'created').length, 1);
    assert.strictEqual(results.filter((result) => result === 'duplicate').length, 19);
    assert.strictEqual(state.variant.stock, 0);
    assert.strictEqual(state.variant.reserved, 0);
  });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
