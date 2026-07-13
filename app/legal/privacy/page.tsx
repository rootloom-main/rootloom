import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | Root & Loom',
    description: 'How Root & Loom collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-4xl font-serif font-bold text-stone-900 mb-8">Privacy Policy</h1>
            <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
                <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">1. Information We Collect</h2>
                <p>We collect information you provide directly to us when making a purchase, creating an account, or subscribing to our newsletter. This includes your name, email address, postal address, phone number, and payment information (processed securely through our payment partner).</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">2. How We Use Your Information</h2>
                <p>We use the information we collect to fulfill your orders, process payments, communicate with you about your orders, and notify you about new products or offers if you have opted in to our marketing communications.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">3. Data Sharing and Security</h2>
                <p>We do not sell your personal data. We share your information only with essential third-party service providers (like shipping carriers and payment processors) strictly necessary to fulfill our services to you. We implement industry-standard security measures to protect your personal information.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">4. Cookies</h2>
                <p>We use cookies and similar tracking technologies to track activity on our Site and hold certain information to improve your shopping experience (such as maintaining your cart contents).</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">5. Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:root@rootloom.in" className="text-deep-forest underline">root@rootloom.in</a>.</p>
            </div>
        </div>
    );
}
