import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Refund & Cancellation Policy | Root & Loom',
    description: 'Our policy regarding refunds, returns, and order cancellations.',
};

export default function RefundPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-4xl font-serif font-bold text-stone-900 mb-8">Refund & Cancellation Policy</h1>
            <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
                <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">1. Cancellations</h2>
                <p>Orders can only be cancelled within 24 hours of placement, provided they have not yet been dispatched. To request a cancellation, please email our support team with your Order ID. Once an order is shipped, we cannot process a cancellation.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">2. Returns & Replacements</h2>
                <p>We accept returns for items that arrive damaged, defective, or incorrect. You must notify us within 3 days of delivery by emailing photos of the issue to our support team. We do not accept returns for "change of mind" due to the artisanal nature of our products.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">3. Refund Process</h2>
                <p>If your return is approved, or if you successfully cancelled your order within the 24-hour window, we will initiate a refund to your original method of payment. You will receive the credit within 5-7 business days, depending on your card issuer's policies.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">4. Non-Refundable Items</h2>
                <p>Custom-made, bespoke items, or items purchased during a final clearance sale are strictly non-refundable and non-returnable.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">5. Contact Us</h2>
                <p>If you have any questions about our refund policy, please contact us at <a href="mailto:root@rootloom.in" className="text-deep-forest underline">root@rootloom.in</a>.</p>
            </div>
        </div>
    );
}
