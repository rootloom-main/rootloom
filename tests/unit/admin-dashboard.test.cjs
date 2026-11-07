const test = require('node:test');
const assert = require('node:assert/strict');

// Mock data structures and logic mirroring the admin dashboard analytics calculation
function calculateDashboardAnalytics(allOrders, orderItems, totalCustomers, cartItems, categoryOrderItems, { sevenDaysAgo, fourteenDaysAgo, thirtyDaysAgo }) {
    const validOrders = (allOrders || []).filter((o) => o.status !== 'cancelled');
    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalOrders = validOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const currentWeekOrders = validOrders.filter((o) => new Date(o.created_at) >= sevenDaysAgo);
    const previousWeekOrders = validOrders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= fourteenDaysAgo && d < sevenDaysAgo;
    });

    const currentRevenue = currentWeekOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const previousRevenue = previousWeekOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const currentVolume = currentWeekOrders.length;
    const previousVolume = previousWeekOrders.length;

    const revGrowth = previousRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    const volGrowth = previousVolume === 0 ? (currentVolume > 0 ? 100 : 0) : ((currentVolume - previousVolume) / previousVolume) * 100;

    const statusCounts = {
        pending: (allOrders || []).filter((o) => o.status === 'pending' || o.status === 'processing').length,
        shipped: (allOrders || []).filter((o) => o.status === 'shipped').length,
        delivered: (allOrders || []).filter((o) => o.status === 'delivered').length,
        cancelled: (allOrders || []).filter((o) => o.status === 'cancelled').length,
        refunded: (allOrders || []).filter((o) => o.status === 'refunded').length,
    };

    // Group top products by revenue
    const productSales = {};
    (orderItems || []).forEach((item) => {
        const name = item.product?.name || 'Unknown Product';
        if (!productSales[name]) {
            productSales[name] = { name, quantity: 0, revenue: 0 };
        }
        productSales[name].quantity += Number(item.quantity) || 0;
        productSales[name].revenue += (Number(item.quantity) || 0) * (Number(item.price) || 0);
    });
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // Group category mix
    const categorySalesMap = {};
    (categoryOrderItems || []).forEach((item) => {
        const catName = item.product?.categories?.name || 'Uncategorized';
        categorySalesMap[catName] = (categorySalesMap[catName] || 0) + ((Number(item.quantity) || 0) * (Number(item.price) || 0));
    });
    const categorySales = Object.entries(categorySalesMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // Group 30-day timeline
    const dailySales = {};
    (allOrders || [])
        .filter((o) => o.status !== 'cancelled' && new Date(o.created_at) >= thirtyDaysAgo)
        .forEach((order) => {
            const d = new Date(order.created_at);
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dailySales[dateKey] = (dailySales[dateKey] || 0) + (Number(order.total) || 0);
        });

    const uniqueAbandonedUsers = new Set((cartItems || []).map((item) => item.user_id)).size;

    return {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        currentRevenue,
        previousRevenue,
        revGrowth,
        currentVolume,
        previousVolume,
        volGrowth,
        statusCounts,
        topProducts,
        categorySales,
        dailySales,
        totalCustomers: Number(totalCustomers || 0),
        abandonedCartCount: uniqueAbandonedUsers,
    };
}

// Role authorization checker logic mirroring layout.tsx & page.tsx
function checkAdminAccess(user, profileRole) {
    if (!user) {
        return { allowed: false, redirect: '/auth/login' };
    }
    if (profileRole !== 'admin' && profileRole !== 'superadmin') {
        return { allowed: false, redirect: '/' };
    }
    return { allowed: true, redirect: null };
}

test('Customer role access control redirects regular customers to store home', () => {
    const customerUser = { id: 'cust_123', email: 'customer@example.com' };
    const access = checkAdminAccess(customerUser, 'customer');
    assert.equal(access.allowed, false);
    assert.equal(access.redirect, '/');
});

test('Unauthenticated visitor access control redirects to login', () => {
    const access = checkAdminAccess(null, null);
    assert.equal(access.allowed, false);
    assert.equal(access.redirect, '/auth/login');
});

test('Admin and superadmin roles are granted full access to dashboard', () => {
    const adminUser = { id: 'admin_1', email: 'admin@rootloom.in' };
    const adminAccess = checkAdminAccess(adminUser, 'admin');
    assert.equal(adminAccess.allowed, true);
    assert.equal(adminAccess.redirect, null);

    const superAccess = checkAdminAccess(adminUser, 'superadmin');
    assert.equal(superAccess.allowed, true);
    assert.equal(superAccess.redirect, null);
});

test('Dashboard accurately calculates revenue, orders, and averages ignoring cancelled orders', () => {
    const now = new Date();
    const mockOrders = [
        { id: '1', total: 1500, status: 'delivered', created_at: now.toISOString() },
        { id: '2', total: 2500, status: 'shipped', created_at: now.toISOString() },
        { id: '3', total: 5000, status: 'cancelled', created_at: now.toISOString() }, // Should be excluded from revenue
        { id: '4', total: 1000, status: 'pending', created_at: now.toISOString() },
    ];

    const result = calculateDashboardAnalytics(
        mockOrders,
        [],
        100,
        [],
        [],
        {
            sevenDaysAgo: new Date(Date.now() - 7 * 86400000),
            fourteenDaysAgo: new Date(Date.now() - 14 * 86400000),
            thirtyDaysAgo: new Date(Date.now() - 30 * 86400000),
        }
    );

    assert.equal(result.totalRevenue, 5000); // 1500 + 2500 + 1000
    assert.equal(result.totalOrders, 3);
    assert.equal(result.averageOrderValue, 5000 / 3);
    assert.equal(result.statusCounts.cancelled, 1);
    assert.equal(result.statusCounts.pending, 1);
    assert.equal(result.statusCounts.shipped, 1);
    assert.equal(result.statusCounts.delivered, 1);
});

test('Dashboard ranks top products and category mixes correctly', () => {
    const mockItems = [
        { quantity: 2, price: 1000, product: { name: 'Pure Linen Shirt', categories: { name: 'Shirts' } } },
        { quantity: 5, price: 2000, product: { name: 'Heritage Kurta', categories: { name: 'Kurtas' } } },
        { quantity: 1, price: 500, product: { name: 'Cotton Scarf', categories: { name: 'Accessories' } } },
    ];

    const result = calculateDashboardAnalytics(
        [],
        mockItems,
        50,
        [],
        mockItems,
        {
            sevenDaysAgo: new Date(Date.now() - 7 * 86400000),
            fourteenDaysAgo: new Date(Date.now() - 14 * 86400000),
            thirtyDaysAgo: new Date(Date.now() - 30 * 86400000),
        }
    );

    assert.equal(result.topProducts.length, 3);
    assert.equal(result.topProducts[0].name, 'Heritage Kurta');
    assert.equal(result.topProducts[0].revenue, 10000);
    assert.equal(result.categorySales[0].name, 'Kurtas');
    assert.equal(result.categorySales[0].value, 10000);
});

test('Dashboard handles zero orders gracefully without NaN or Infinity', () => {
    const result = calculateDashboardAnalytics(
        [],
        [],
        0,
        [],
        [],
        {
            sevenDaysAgo: new Date(Date.now() - 7 * 86400000),
            fourteenDaysAgo: new Date(Date.now() - 14 * 86400000),
            thirtyDaysAgo: new Date(Date.now() - 30 * 86400000),
        }
    );

    assert.equal(result.totalRevenue, 0);
    assert.equal(result.totalOrders, 0);
    assert.equal(result.averageOrderValue, 0);
    assert.equal(Number.isNaN(result.averageOrderValue), false);
    assert.equal(Number.isFinite(result.averageOrderValue), true);
    assert.equal(result.revGrowth, 0);
    assert.equal(result.volGrowth, 0);
});
