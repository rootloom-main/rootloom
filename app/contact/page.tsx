'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget);
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.get('name'),
                    email: formData.get('email'),
                    subject: formData.get('subject'),
                    message: formData.get('message'),
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Message sent successfully! We will get back to you soon.');
                (e.target as HTMLFormElement).reset();
            } else {
                toast.error(data.message || 'Failed to send message. Please try again.');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-heirloom-white min-h-screen py-12">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-deep-forest font-serif mb-4">Get in Touch</h1>
                    <p className="text-slate-bark max-w-xl mx-auto">
                        Have a question about your order, sizing, or our sustainability practices? We're here to help.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <div className="bg-stone-paper p-8 rounded-lg space-y-6">
                            <h2 className="text-2xl font-bold text-deep-forest mb-6">Contact Information</h2>

                            <div className="flex items-start gap-4">
                                <div className="bg-deep-forest/10 p-3 rounded-full text-deep-forest">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-deep-forest">Email Us</h3>
                                    <p className="text-slate-bark">support@rootandloom.com</p>
                                    <p className="text-sm text-slate-bark/80 mt-1">Response time: Within 24 hours</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-deep-forest/10 p-3 rounded-full text-deep-forest">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-deep-forest">Call Us</h3>
                                    <p className="text-slate-bark">+91 98765 43210</p>
                                    <p className="text-sm text-slate-bark/80 mt-1">Mon-Fri, 9am - 6pm IST</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-deep-forest/10 p-3 rounded-full text-deep-forest">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-deep-forest">Studio Address</h3>
                                    <p className="text-slate-bark">
                                        Root & Loom Design Studio<br />
                                        12, Heritage Lane, Hauz Khas Village<br />
                                        New Delhi, 110016
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white p-8 rounded-lg shadow-sm border border-stone-paper">
                        <h2 className="text-2xl font-bold text-deep-forest mb-6">Send a Message</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-deep-forest">Name</label>
                                    <Input id="name" placeholder="John Doe" required />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-deep-forest">Email</label>
                                    <Input id="email" type="email" placeholder="john@example.com" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="subject" className="text-sm font-medium text-deep-forest">Subject</label>
                                <Input id="subject" placeholder="Order inquiry, partnership, etc." required />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium text-deep-forest">Message</label>
                                <Textarea id="message" placeholder="How can we assist you?" className="min-h-[150px]" required />
                            </div>

                            <Button type="submit" className="w-full bg-deep-forest text-heirloom-white hover:bg-deep-forest/90" disabled={isSubmitting}>
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
