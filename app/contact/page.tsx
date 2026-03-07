import { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Contact Us | Root & Loom',
    description: 'Get in touch with the Root & Loom concierge team.',
};

export default function ContactPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <h1 className="text-4xl font-serif font-bold text-deep-forest text-center mb-12">Contact Concierge</h1>

            <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-stone-900 mb-4">We're here to help</h2>
                        <p className="text-stone-600 leading-relaxed">
                            Whether you need assistance with an ongoing order, have a question about our heirloom pieces, or wish to inquire about bespoke items, our dedicated concierge team is available to assist you.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-stone-100 rounded-full text-deep-forest">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-900">Email</h3>
                                <p className="text-stone-600">support@rootloom.com</p>
                                <p className="text-sm text-stone-400">Expect a response within 24 hours.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-stone-100 rounded-full text-deep-forest">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-900">Phone</h3>
                                <p className="text-stone-600">+91 98765 43210</p>
                                <p className="text-sm text-stone-400">Mon-Fri from 9am to 6pm IST.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-stone-100 rounded-full text-deep-forest">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-900">Studio (No Storefront)</h3>
                                <p className="text-stone-600">123 Artisan Lane, Craft District</p>
                                <p className="text-stone-600">New Delhi, DL 110001</p>
                                <p className="text-stone-600">India</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100">
                    <form className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Name</label>
                            <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-deep-forest transition-all" placeholder="Your full name" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Email</label>
                            <input type="email" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-deep-forest transition-all" placeholder="your@email.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Order ID (Optional)</label>
                            <input type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-deep-forest transition-all" placeholder="e.g. ORD-123456" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Message</label>
                            <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-deep-forest transition-all" placeholder="How can we help you?" />
                        </div>
                        <button type="button" className="w-full bg-deep-forest text-white font-bold py-4 rounded-xl hover:bg-deep-forest/90 transition-all">
                            Send Message
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
