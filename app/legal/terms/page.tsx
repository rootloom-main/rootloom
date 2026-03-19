import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service | Root & Loom',
    description: 'Read the terms of service and conditions for using Root & Loom.',
};

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-4xl font-serif font-bold text-stone-900 mb-8">Terms of Service</h1>
            <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
                <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">1. Acceptance of Terms</h2>
                <p>By accessing and using this website (Root & Loom), you accept and agree to be bound by the terms and provision of this agreement. Any participation in this service will constitute acceptance of this agreement.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">2. E-Commerce Purchases</h2>
                <p>All purchases made through our website are subject to product availability. We may, in our sole discretion, limit or cancel the quantities offered on our website or restrict the sales of our products to any person, household, geographic region, or jurisdiction.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">3. Pricing and Payments</h2>
                <p>Prices for our products are subject to change without notice. We process secure payments via Razorpay. We reserve the right to refuse any order you place with us.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">4. Intellectual Property</h2>
                <p>The Site and its original content, features, and functionality are owned by Root & Loom and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">5. limitation of Liability</h2>
                <p>In no event shall Root & Loom, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of our service.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">6. Contact Us</h2>
                <p>If you have any questions about these Terms, please contact us at <a href="mailto:root@rootloom.in" className="text-deep-forest underline">root@rootloom.in</a>.</p>
            </div>
        </div>
    );
}
