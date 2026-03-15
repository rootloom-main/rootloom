'use client';

import { useState } from 'react';
import { Mail, MapPin, Phone, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        orderId: '',
        message: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                toast.success('Message sent! Our concierge will be in touch.');
                setFormData({ name: '', email: '', orderId: '', message: '' });
            } else {
                toast.error(data.message || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            toast.error('Failed to connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#fafafa] min-h-screen">
            <div className="container mx-auto px-4 py-20 max-w-5xl">
                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-5xl md:text-7xl font-serif font-black text-deep-forest uppercase tracking-tighter">
                        Contact Concierge
                    </h1>
                    <p className="text-xl text-stone-500 font-medium uppercase tracking-widest italic">
                        We&apos;re here to help
                    </p>
                    <div className="w-24 h-1.5 bg-raw-clay mx-auto mt-6" />
                </div>

                <div className="grid lg:grid-cols-5 gap-16 items-start">
                    {/* Info Side */}
                    <div className="lg:col-span-2 space-y-12">
                        <section className="space-y-4">
                            <p className="text-lg text-stone-700 leading-relaxed font-medium">
                                Whether you need assistance with an ongoing order, have a question about our heirloom pieces, or wish to inquire about bespoke items, our dedicated concierge team is available to assist you.
                            </p>
                        </section>

                        <div className="space-y-10">
                            <div className="flex items-start gap-6 group">
                                <div className="p-4 bg-deep-forest text-white rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-300">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-deep-forest uppercase tracking-widest mb-1">Email</h3>
                                    <p className="text-lg font-bold text-stone-800">root@rootloom.in</p>
                                    <p className="text-xs text-stone-400 mt-1 uppercase font-bold tracking-wider">Expect a response within 24 hours.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-6 group">
                                <div className="p-4 bg-deep-forest text-white rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-300">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-deep-forest uppercase tracking-widest mb-1">Phone & WhatsApp</h3>
                                    <p className="text-lg font-bold text-stone-800">+91 99135 55532</p>
                                    <p className="text-xs text-stone-400 mt-1 uppercase font-bold tracking-wider">Available Mon-Sat | 10am - 7pm IST.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-6 group">
                                <div className="p-4 bg-deep-forest text-white rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-300">
                                    <MapPin className="w-6 h-6 flex-shrink-0" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-deep-forest uppercase tracking-widest mb-1">Concierge Address</h3>
                                    <div className="text-stone-800 font-bold space-y-0.5">
                                        <p>Shri Ram Folding Works</p>
                                        <p>Shri Ram Industries park-3</p>
                                        <p className="text-stone-600 font-medium text-sm">Shed 19, Near Vaishalinagar</p>
                                        <p className="text-stone-600 font-medium text-sm">OPP Cozy Hotel Shahwadi</p>
                                        <p className="text-deep-forest mt-2">Narol, Ahmedabad 382405</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Side */}
                    <div className="lg:col-span-3">
                        {success ? (
                            <div className="bg-white p-12 rounded-[2.5rem] border-2 border-deep-forest shadow-2xl text-center space-y-6">
                                <div className="flex justify-center">
                                    <CheckCircle2 className="w-20 h-20 text-green-600 animate-bounce" />
                                </div>
                                <h3 className="text-3xl font-serif font-black text-deep-forest uppercase tracking-tighter">Message Received</h3>
                                <p className="text-stone-600 text-lg font-medium">
                                    Your inquiry has been logged in our system. A concierge member will review and get back to you shortly.
                                </p>
                                <Button 
                                    onClick={() => setSuccess(false)}
                                    className="bg-deep-forest hover:bg-slate-900 text-white font-black px-10 py-6 rounded-xl uppercase tracking-widest text-sm"
                                >
                                    Send Another Message
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-stone-100 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-raw-clay/5 rounded-bl-full" />
                                
                                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-stone-500 ml-1">Name</Label>
                                            <Input 
                                                id="name"
                                                required
                                                className="h-14 bg-stone-50 border-stone-200 rounded-xl focus:ring-deep-forest focus:border-deep-forest"
                                                placeholder="Your full name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-stone-500 ml-1">Email</Label>
                                            <Input 
                                                id="email"
                                                type="email"
                                                required
                                                className="h-14 bg-stone-50 border-stone-200 rounded-xl focus:ring-deep-forest focus:border-deep-forest"
                                                placeholder="your@email.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="orderId" className="text-xs font-black uppercase tracking-widest text-stone-500 ml-1">Order ID (Optional)</Label>
                                        <Input 
                                            id="orderId"
                                            className="h-14 bg-stone-50 border-stone-200 rounded-xl focus:ring-deep-forest focus:border-deep-forest"
                                            placeholder="e.g. ORD-123456"
                                            value={formData.orderId}
                                            onChange={(e) => setFormData({...formData, orderId: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="message" className="text-xs font-black uppercase tracking-widest text-stone-500 ml-1">Message</Label>
                                        <Textarea 
                                            id="message"
                                            required
                                            rows={5}
                                            className="bg-stone-50 border-stone-200 rounded-2xl focus:ring-deep-forest focus:border-deep-forest p-4 leading-relaxed"
                                            placeholder="How can we help you?"
                                            value={formData.message}
                                            onChange={(e) => setFormData({...formData, message: e.target.value})}
                                        />
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={loading}
                                        className="w-full bg-deep-forest hover:bg-slate-900 text-white font-black py-8 rounded-2xl shadow-lg shadow-deep-forest/20 transition-all text-lg uppercase tracking-[0.2em] group"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                Send Message
                                                <Send className="ml-3 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
