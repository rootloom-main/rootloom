const { chromium } = require('@playwright/test');
const { createServerClient } = require('@supabase/ssr');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const baseUrl = 'http://localhost:3000';

async function getAuthCookies(email) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
    });
    if (linkErr) throw linkErr;

    const { data: authData, error: verifyErr } = await supabaseAnon.auth.verifyOtp({
        email,
        token: linkData.properties.email_otp,
        type: 'magiclink',
    });
    if (verifyErr) throw verifyErr;

    let storedCookies = {};
    const ssrClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return Object.entries(storedCookies).map(([name, value]) => ({ name, value }));
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        storedCookies[name] = value;
                    });
                },
            },
        }
    );

    await ssrClient.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
    });

    return Object.entries(storedCookies).map(([name, value]) => ({
        name,
        value,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
    }));
}

async function runBrowserTests() {
    console.log('🚀 Starting Browser Test Suite for Root & Loom Dashboard...\n');
    const browser = await chromium.launch({ headless: true });

    let testsPassed = 0;
    let testsFailed = 0;

    function assertPass(name, condition, extra = '') {
        if (condition) {
            console.log(`  ✅ [PASS] ${name} ${extra}`);
            testsPassed++;
        } else {
            console.error(`  ❌ [FAIL] ${name} ${extra}`);
            testsFailed++;
        }
    }

    try {
        // =========================================================================
        // TEST SUITE 1: CUSTOMER & UNAUTHENTICATED VISITOR ACCESS (SECURITY CHECKS)
        // =========================================================================
        console.log('📋 Suite 1: Customer / Unauthenticated Access Control:');
        const unauthContext = await browser.newContext();
        const unauthPage = await unauthContext.newPage();

        // 1.1: Unauthenticated visit to /admin
        await unauthPage.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
        const unauthUrl = unauthPage.url();
        assertPass(
            'Unauthenticated visit to /admin redirects to login',
            unauthUrl.includes('/auth/login'),
            `Current URL: ${unauthUrl}`
        );

        // 1.2: Check no admin content leaked to visitor
        const pageContent = await unauthPage.content();
        assertPass(
            'Admin analytics content not leaked to unauthorized visitor',
            !pageContent.includes('Welcome back, Samir Pandey') && !pageContent.includes('Operational Pipeline')
        );

        // 1.3: Unauthenticated visit to /admin/marketing/banners
        await unauthPage.goto(`${baseUrl}/admin/marketing/banners`, { waitUntil: 'domcontentloaded' });
        assertPass(
            'Unauthenticated visit to /admin/marketing/banners redirects to login',
            unauthPage.url().includes('/auth/login')
        );

        // 1.4: Regular Customer Account Access (role: customer)
        console.log('\n  Testing regular customer role bounce...');
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { data: customerProfile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('role', 'customer')
            .not('email', 'is', null)
            .limit(1)
            .single();

        if (customerProfile?.email) {
            const customerCookies = await getAuthCookies(customerProfile.email);
            const customerContext = await browser.newContext();
            await customerContext.addCookies(customerCookies);
            const customerPage = await customerContext.newPage();

            await customerPage.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
            const customerBouncedUrl = customerPage.url();
            assertPass(
                'Customer account visiting /admin is bounced away (to store home /)',
                customerBouncedUrl === `${baseUrl}/` || customerBouncedUrl === `${baseUrl}`,
                `Landed on: ${customerBouncedUrl}`
            );
            await customerContext.close();
        } else {
            console.log('  ℹ️ No customer test profile found, skipping customer role bounce test');
        }

        await unauthContext.close();

        // =========================================================================
        // TEST SUITE 2: ADMIN ACCESS & DASHBOARD RENDERING (SAMIR PANDEY)
        // =========================================================================
        console.log('\n📋 Suite 2: Admin Dashboard & Analytics (Admin Session):');
        const adminEmail = 'samirjee187@gmail.com';
        console.log(`  Generating admin auth session for: ${adminEmail}...`);
        const adminCookies = await getAuthCookies(adminEmail);

        const adminContext = await browser.newContext();
        await adminContext.addCookies(adminCookies);
        const adminPage = await adminContext.newPage();

        // Track console errors
        const pageErrors = [];
        adminPage.on('pageerror', (err) => pageErrors.push(err.message));

        console.log('  Navigating to http://localhost:3000/admin...');
        const response = await adminPage.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle', timeout: 30000 });

        assertPass('HTTP Response is successful', response && response.status() === 200, `Status: ${response?.status()}`);

        // 2.1: Check that the error overlay in user screenshot is GONE
        const nextJsErrorOverlay = await adminPage.$('nextjs-portal');
        const serverErrorText = await adminPage.locator('text=Runtime Error').count();
        const pgrstErrorText = await adminPage.locator('text=PGRST202').count();
        const codeDetailsText = await adminPage.locator('text={code:').count();

        assertPass(
            'No Next.js Runtime Error Server overlay displayed',
            serverErrorText === 0 && pgrstErrorText === 0 && codeDetailsText === 0,
            `(Runtime error count: ${serverErrorText}, PGRST count: ${pgrstErrorText})`
        );

        // 2.2: Verify Admin Welcome Heading
        const heading = await adminPage.locator('h1').textContent();
        assertPass(
            'Admin Welcome Header rendered',
            heading && heading.includes('Welcome back, Samir Pandey'),
            `Found: "${heading?.trim()}"`
        );

        // 2.3: Verify Primary Metrics Cards
        const growthRevenueCard = await adminPage.locator('text=Growth Revenue').count();
        const totalVolumeCard = await adminPage.locator('text=Total Volume').count();
        const avgTicketCard = await adminPage.locator('text=Avg Ticket').count();
        const totalCustomersCard = await adminPage.locator('text=Total Customers').count();

        assertPass(
            'Primary Metrics Cards present (Growth Revenue, Total Volume, Avg Ticket, Total Customers)',
            growthRevenueCard > 0 && totalVolumeCard > 0 && avgTicketCard > 0 && totalCustomersCard > 0
        );

        // 2.4: Verify Operational Pipeline Statuses
        const pendingStatus = await adminPage.locator('text=Pending').first().isVisible();
        const shippedStatus = await adminPage.locator('text=Shipped').first().isVisible();
        const deliveredStatus = await adminPage.locator('text=Delivered').first().isVisible();
        assertPass(
            'Operational Pipeline statuses rendered (Pending, Shipped, Delivered)',
            pendingStatus && shippedStatus && deliveredStatus
        );

        // 2.5: Verify Marketing & Conversion Section
        const abandonedBags = await adminPage.locator('text=Abandoned Bags').isVisible();
        const activeCampaigns = await adminPage.locator('text=Active Campaigns').isVisible();
        assertPass(
            'Marketing & Conversion section rendered (Abandoned Bags, Active Campaigns)',
            abandonedBags && activeCampaigns
        );

        // 2.6: Verify Launch Console Metrics
        const launchConsole = await adminPage.locator('text=Launch Console').isVisible();
        const paymentSuccess = await adminPage.locator('text=Payment Success').isVisible();
        assertPass(
            'Launch Console telemetry metrics rendered (Launch Console, Payment Success)',
            launchConsole && paymentSuccess
        );

        // 2.7: Verify Charts & Visualizations
        const marketPerformance = await adminPage.locator('text=Market Performance').isVisible();
        const categoryMix = await adminPage.locator('text=Category Mix').isVisible();
        assertPass(
            'Analytics Visualizations rendered (Market Performance, Category Mix)',
            marketPerformance && categoryMix
        );

        // 2.8: Verify Recent Transactions Table
        const recentTransactions = await adminPage.locator('text=Recent Transactions').isVisible();
        const orderTable = await adminPage.locator('table').isVisible();
        assertPass(
            'Recent Transactions table rendered and visible',
            recentTransactions && orderTable
        );

        // =========================================================================
        // TEST SUITE 3: SUB-SECTIONS EXPLORATION BIT BY BIT
        // =========================================================================
        console.log('\n📋 Suite 3: Dashboard Sub-sections Bit by Bit:');

        // 3.1: Banners List
        console.log('  Checking /admin/marketing/banners...');
        const bannersResp = await adminPage.goto(`${baseUrl}/admin/marketing/banners`, { waitUntil: 'networkidle', timeout: 20000 });
        const bannersTitle = await adminPage.locator('h1').textContent();
        assertPass(
            'Banners list page loads without errors',
            bannersResp.status() === 200 && bannersTitle.includes('Banners'),
            `Title: "${bannersTitle.trim()}"`
        );

        // 3.2: New Banner Page
        console.log('  Checking /admin/marketing/banners/new...');
        const newBannerResp = await adminPage.goto(`${baseUrl}/admin/marketing/banners/new`, { waitUntil: 'networkidle', timeout: 20000 });
        const newBannerTitle = await adminPage.locator('h1').textContent();
        const mediaLibraryButton = await adminPage.locator('text=Choose from Library').isVisible();
        assertPass(
            'Add New Banner form loads with Media Library button',
            newBannerResp.status() === 200 && newBannerTitle.includes('Add New Banner') && mediaLibraryButton
        );

        // 3.3: Orders Management
        console.log('  Checking /admin/orders...');
        const ordersResp = await adminPage.goto(`${baseUrl}/admin/orders`, { waitUntil: 'networkidle', timeout: 20000 });
        const ordersContent = await adminPage.content();
        assertPass(
            'Orders page loads with status 200',
            ordersResp.status() === 200 && (ordersContent.includes('Orders') || ordersContent.includes('Order'))
        );

        // 3.4: Products Management
        console.log('  Checking /admin/products...');
        const productsResp = await adminPage.goto(`${baseUrl}/admin/products`, { waitUntil: 'networkidle', timeout: 20000 });
        assertPass(
            'Products management page loads with status 200',
            productsResp.status() === 200
        );

        // 3.5: Inventory Management
        console.log('  Checking /admin/inventory...');
        const inventoryResp = await adminPage.goto(`${baseUrl}/admin/inventory`, { waitUntil: 'networkidle', timeout: 20000 });
        assertPass(
            'Inventory management page loads with status 200',
            inventoryResp.status() === 200
        );

        // 3.6: Customers List
        console.log('  Checking /admin/customers...');
        const customersResp = await adminPage.goto(`${baseUrl}/admin/customers`, { waitUntil: 'networkidle', timeout: 20000 });
        assertPass(
            'Customers list page loads with status 200',
            customersResp.status() === 200
        );

        await adminContext.close();
    } finally {
        await browser.close();
    }

    console.log('\n======================================================');
    console.log(`📊 FINAL RESULT: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log('======================================================\n');

    if (testsFailed > 0) {
        process.exit(1);
    }
}

runBrowserTests().catch((err) => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
});
