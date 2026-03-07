import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Shipping Policy | Root & Loom',
    description: 'Information regarding domestic and international shipping times and rates.',
};

export default function ShippingPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-4xl font-serif font-bold text-stone-900 mb-8">Shipping Policy</h1>
            <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
                <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">1. Order Processing Times</h2>
                <p>All orders are processed within 2 to 4 business days (excluding weekends and holidays) after receiving your order confirmation email. You will receive another notification when your order has shipped.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">2. Domestic Shipping Rates and Estimates</h2>
                <p>Shipping charges for your order will be calculated and displayed at checkout. Standard shipping typically takes 5-7 business days within India. Expedited shipping options, if available, will be displayed during checkout.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">3. In-Store Pickup</h2>
                <p>Currently, we operate purely online and do not offer an in-store pickup option. All items will be shipped directly to the address provided during checkout.</p>

                <h2 className="text-2xl font-bold text-stone-900 mt-8 mb-4">4. How do I check the status of my order?</h2>
                <p>When your order has shipped, you will receive an email notification from us which will include a tracking number you can use to check its status. Please allow 48 hours for the tracking information to become available.</p>
            </div>
        </div>
    );
}
