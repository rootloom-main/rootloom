function estimate({ dailyUsers, conversionRate, checkoutRate, influencerMultiplier = 1, couponUsageRate = 0.2 }) {
  const sessions = dailyUsers * influencerMultiplier;
  const checkoutStarts = Math.ceil(sessions * checkoutRate);
  const orders = Math.ceil(sessions * conversionRate);
  const couponAttempts = Math.ceil(checkoutStarts * couponUsageRate);
  const peakHourUsers = Math.ceil(sessions * 0.18);
  const peakCheckoutStartsPerMinute = Math.ceil((checkoutStarts * 0.25) / 60);
  const peakOrdersPerMinute = Math.ceil((orders * 0.3) / 60);

  return {
    sessions,
    checkoutStarts,
    orders,
    couponAttempts,
    peakHourUsers,
    peakCheckoutStartsPerMinute,
    peakOrdersPerMinute,
  };
}

function assertCapacity(label, result) {
  const safeCheckoutStartsPerMinute = 220;
  const safeOrdersPerMinute = 70;

  if (result.peakCheckoutStartsPerMinute > safeCheckoutStartsPerMinute) {
    throw new Error(`${label}: checkout starts/min ${result.peakCheckoutStartsPerMinute} exceeds ${safeCheckoutStartsPerMinute}`);
  }

  if (result.peakOrdersPerMinute > safeOrdersPerMinute) {
    throw new Error(`${label}: orders/min ${result.peakOrdersPerMinute} exceeds ${safeOrdersPerMinute}`);
  }

  console.log(`ok - ${label}`, result);
}

assertCapacity('10k simulated users/day model', estimate({
  dailyUsers: 10000,
  conversionRate: 0.031,
  checkoutRate: 0.11,
  couponUsageRate: 0.34,
}));

assertCapacity('coupon campaign stress test', estimate({
  dailyUsers: 12000,
  conversionRate: 0.028,
  checkoutRate: 0.17,
  couponUsageRate: 0.8,
}));

assertCapacity('black friday style traffic spike', estimate({
  dailyUsers: 15000,
  conversionRate: 0.04,
  checkoutRate: 0.22,
  influencerMultiplier: 5,
  couponUsageRate: 0.62,
}));
