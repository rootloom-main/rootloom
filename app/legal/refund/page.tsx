import { Metadata } from 'next';
import { REFUND_SETTLEMENT_WINDOW, RETURN_WINDOW_DAYS } from '@/lib/returns/policy';

export const metadata: Metadata = {
    title: 'Refund & Cancellation Policy | Root & Loom',
    description: 'Our policy regarding refunds, returns, exchanges, and order cancellations.',
};

export default function RefundPage() {
    return (
        <div className="container mx-auto max-w-3xl px-4 py-16">
            <h1 className="mb-8 text-4xl font-serif font-bold text-stone-900">Refund & Cancellation Policy</h1>
            <div className="prose prose-stone max-w-none space-y-6 text-stone-600">
                <p>Last updated: April 8, 2026</p>

                <h2 className="mb-4 mt-8 text-2xl font-bold text-stone-900">1. Cancellations</h2>
                <p>
                    Orders can be cancelled any time before they are shipped. If an online payment has already been captured,
                    we mark the cancellation for refund review immediately and begin the refund workflow without requiring a separate request.
                </p>

                <h2 className="mb-4 mt-8 text-2xl font-bold text-stone-900">2. Returns & Exchanges</h2>
                <p>
                    Eligible items can be returned or exchanged within {RETURN_WINDOW_DAYS} days of delivery. Items must be unused,
                    in original packaging, and submitted with photo evidence through your account order page.
                </p>
                <p>
                    We accept requests for damaged, defective, incorrect, or size-related issues during that {RETURN_WINDOW_DAYS}-day window.
                    Final-sale and clearly marked non-returnable items remain ineligible.
                </p>

                <h2 className="mb-4 mt-8 text-2xl font-bold text-stone-900">3. Refund Process</h2>
                <p>
                    Approved refunds are returned to the original payment source where possible. If the original source cannot be credited,
                    we may complete the refund by bank transfer or UPI. Refunds typically settle within {REFUND_SETTLEMENT_WINDOW} after approval.
                </p>

                <h2 className="mb-4 mt-8 text-2xl font-bold text-stone-900">4. Contact Us</h2>
                <p>
                    If you have any questions about this policy, please contact us at{' '}
                    <a href="mailto:root@rootloom.in" className="text-deep-forest underline">
                        root@rootloom.in
                    </a>.
                </p>
            </div>
        </div>
    );
}
