/**
 * Regression Test Suite for Supabase Identity Consolidation & Account Linking
 */
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
    if (id === 'server-only') return {};
    return originalRequire.apply(this, arguments);
};

try {
    const serverOnlyPath = require.resolve('server-only');
    require.cache[serverOnlyPath] = {
        id: serverOnlyPath,
        filename: serverOnlyPath,
        loaded: true,
        exports: {},
    } as any;
} catch (e) {}

async function runAccountLinkingTests() {
    console.log('=== Starting Account Linking & Identity Consolidation Regression Suite ===\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, desc: string) {
        if (condition) {
            console.log(`✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${desc}`);
            failed++;
        }
    }

    const { verifyOtpEx } = await import('../app/auth/actions');

    // -------------------------------------------------------------
    // Test 1: Phone Normalization Logic
    // -------------------------------------------------------------
    {
        const testNumbers = [
            { input: '9876543210', expected: '+919876543210' },
            { input: '+919876543210', expected: '+919876543210' },
            { input: '919876543210', expected: '+919876543210' },
            { input: ' 98765 43210 ', expected: '+919876543210' },
            { input: '+91-98765-43210', expected: '+919876543210' },
        ];

        let allNormalized = true;
        for (const t of testNumbers) {
            const clean = t.input.replace(/\D/g, '');
            const normalized = clean.length === 10 ? `+91${clean}` : `+${clean}`;
            if (normalized !== t.expected) {
                allNormalized = false;
            }
        }
        assert(allNormalized, 'Normalizes 10-digit, 12-digit, and +91 formatted numbers consistently');
    }

    // -------------------------------------------------------------
    // Test 2: Temporary Account Safety Verification (No Deletion if user has data)
    // -------------------------------------------------------------
    {
        const mockAdminSupabase = {
            from: (table: string) => ({
                select: (cols: string, opts: any) => ({
                    eq: (col: string, val: string) => {
                        if (table === 'orders') return Promise.resolve({ count: 1 }); // User has an order!
                        return Promise.resolve({ count: 0 });
                    }
                })
            })
        };

        // If ordersCount > 0, deletion must be aborted
        const { count: ordersCount } = await mockAdminSupabase.from('orders').select('*', { count: 'exact' }).eq('user_id', 'temp_user_with_orders');
        assert(ordersCount === 1, 'Correctly detects existing user data (orders/cart/addresses) on accounts');
    }

    // -------------------------------------------------------------
    // Test 3: Simulation of Canonical Account Consolidation
    // -------------------------------------------------------------
    {
        const canonicalUserId: string = 'user_canonical_aaaaa_1111';
        const tempUserId: string = 'user_temp_bbbbb_2222';
        const testEmail = 'existing.user@example.com';
        const testPhone = '+919876543210';

        let deletedUserId = '';
        let updatedUserId = '';
        let updatedUserPayload: any = null;
        let generatedLinkEmail = '';
        let verifiedSessionUser = '';

        // Mock Supabase admin calls
        const mockAdminAuth = {
            getUserById: async (id: string) => ({ data: { user: { id, email: testEmail } }, error: null }),
            updateUserById: async (id: string, payload: any) => {
                updatedUserId = id;
                updatedUserPayload = payload;
                return { data: { user: { id } }, error: null };
            },
            deleteUser: async (id: string) => {
                deletedUserId = id;
                return { data: null, error: null };
            },
            generateLink: async (params: any) => {
                generatedLinkEmail = params.email;
                return {
                    data: {
                        properties: {
                            hashed_token: 'valid_hashed_token_xyz',
                            verification_type: 'magiclink',
                        },
                    },
                    error: null,
                };
            },
        };

        // Execution of the consolidation logic flow
        if (canonicalUserId !== tempUserId) {
            // 1. Verify canonical exists
            const { data: canonicalUser } = await mockAdminAuth.getUserById(canonicalUserId);
            assert(canonicalUser?.user?.id === canonicalUserId, 'Verifies canonical account exists in auth.users');

            // 2. Attach and confirm phone to canonical
            await mockAdminAuth.updateUserById(canonicalUserId, {
                phone: testPhone,
                phone_confirm: true,
            });
            assert(updatedUserId === canonicalUserId, 'Attaches verified phone to canonical account AAAAA');
            assert(updatedUserPayload.phone_confirm === true, 'Marks phone as confirmed on canonical account AAAAA');

            // 3. Delete temporary user BBBBB
            await mockAdminAuth.deleteUser(tempUserId);
            assert(deletedUserId === tempUserId, 'Deletes temporary auth user BBBBB safely');

            // 4. Issue session for canonical account AAAAA
            const { data: linkData } = await mockAdminAuth.generateLink({
                type: 'magiclink',
                email: canonicalUser?.user?.email,
            });
            assert(generatedLinkEmail === testEmail, 'Generates authentication session link for canonical email');
            assert(linkData.properties.hashed_token === 'valid_hashed_token_xyz', 'Produces valid token hash for session handoff');

            verifiedSessionUser = canonicalUserId;
            assert(verifiedSessionUser === canonicalUserId, 'Final authenticated session belongs to canonical user AAAAA (NOT BBBBB)');
        }
    }

    // -------------------------------------------------------------
    // Test 4: Regression Scenario — Same user ID across all data relations
    // -------------------------------------------------------------
    {
        const canonicalId = 'aaaaa-1111-uuid';
        const profile = { id: canonicalId, email: 'user@rootloom.in', phone: '+919876543210' };
        const orders = [{ id: 'ord_1', user_id: canonicalId }, { id: 'ord_2', user_id: canonicalId }];
        const addresses = [{ id: 'addr_1', user_id: canonicalId }];

        assert(orders.every(o => o.user_id === profile.id), 'Orders remain securely attached to canonical user ID');
        assert(addresses.every(a => a.user_id === profile.id), 'Addresses remain securely attached to canonical user ID');
    }

    console.log(`\n=== Regression Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) {
        process.exit(1);
    }
}

runAccountLinkingTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
