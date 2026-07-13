import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cookie Policy | Root & Loom',
    description: 'Learn about how Root & Loom uses cookies to improve your shopping experience.',
};

export default function CookiePolicyPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-4xl font-serif font-bold text-stone-900 mb-8 uppercase tracking-tight">Cookie Policy</h1>
            <div className="prose prose-stone max-w-none text-stone-600 space-y-6">
                <p>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

                <p className="text-lg">
                    At Root & Loom, we believe in being clear and open about how we collect and use data related to you. In the spirit of transparency, this policy provides detailed information about how and when we use cookies on our Website.
                </p>

                <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4 uppercase tracking-tighter">1. What is a Cookie?</h2>
                <p>
                    A cookie is a small file placed onto your device that enables Root & Loom features and functionality. For example, cookies enable us to identify your device, secure your access to our site, and even help us know if someone attempts to access your account from a different device.
                </p>

                <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4 uppercase tracking-tighter">2. Why do we use Cookies?</h2>
                <p>
                    Cookies can be used to recognize you when you visit Root & Loom, remember your preferences, and give you a personalized experience that is in line with your settings. Cookies also make your interactions with Root & Loom faster and more secure. 
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Authentication:</strong> If you&apos;re signed in to Root & Loom, cookies help us show you the right information and personalize your experience.</li>
                    <li><strong>Security:</strong> We use cookies to enable and support our security features, and to help us detect malicious activity.</li>
                    <li><strong>Preferences:</strong> Cookies can tell us which language you prefer and what your communications preferences are.</li>
                    <li><strong>Performance:</strong> We use cookies to help us learn how well our site performs in different locations and for analyzing how users interact with our features.</li>
                </ul>

                <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4 uppercase tracking-tighter">3. Controlling Cookies</h2>
                <p>
                    Most browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, since it will no longer be personalized to you. It may also stop you from saving customized settings like login information.
                </p>

                <h2 className="text-2xl font-bold text-stone-900 mt-10 mb-4 uppercase tracking-tighter">4. Further Information</h2>
                <p>
                    If you have any questions about our use of cookies, please contact us at <a href="mailto:root@rootloom.in" className="text-deep-forest font-bold underline">root@rootloom.in</a>.
                </p>
            </div>
        </div>
    );
}
