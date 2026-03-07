import http from 'k6/http';
import { check, sleep } from 'k6';

// Read URL from env or default to production/staging
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
    scenarios: {
        // 1. Browsing Users: Gradually ramps up to simulate a steady stream of traffic checking the homepage
        browsing_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 50 }, // Ramp up to 50 users
                { duration: '1m', target: 100 }, // Ramp up to 100 users
                { duration: '30s', target: 0 },  // Ramp down
            ],
            gracefulRampDown: '10s',
        },
        // 2. Searching Users: Constant traffic hitting the search API endpoint directly
        searching_users: {
            executor: 'constant-vus',
            vus: 20,
            duration: '2m',
        },
    },
    thresholds: {
        // 95% of requests must complete within 500ms
        http_req_duration: ['p(95)<500'],
        // Less than 1% of requests can fail
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    // Scenario 1: Homepage Load
    const res = http.get(BASE_URL);
    check(res, {
        'homepage loaded successfully': (r) => r.status === 200,
        'body contains Next.js content': (r) => r.body.includes('<html'),
    });

    // Small sleep to simulate read time
    sleep(1);

    // Scenario 2: Search Query
    const searchTerms = ['Silk', 'Dress', 'Bag', 'Linen'];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchUrl = `${BASE_URL}/shop?q=${randomTerm}`;

    const searchRes = http.get(searchUrl);
    check(searchRes, {
        'search page loaded successfully': (r) => r.status === 200,
    });

    // Sleep again
    sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}
