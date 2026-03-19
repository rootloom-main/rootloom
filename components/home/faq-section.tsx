'use client';

import * as React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import Script from 'next/script';

const FAQS = [
    {
        question: "What makes Root & Loom streetwear 'sustainable'?",
        answer: "We use ethical manufacturing processes and premium, long-lasting materials to reduce fashion waste. Our pieces are loomed to last, moving away from fast-fashion cycles towards a more conscious urban wardrobe."
    },
    {
        question: "How long does shipping take for the latest drops?",
        answer: "Most orders are processed within 24-48 hours. Shipping across India typically takes 3-5 business days. You'll receive a WhatsApp and email update with tracking details as soon as your drip is on the way."
    },
    {
        question: "Do you offer returns or exchanges?",
        answer: "Yes! We offer a 7-day easy return and exchange policy. If the fit isn't right or you've changed your mind, you can initiate a return through your account dashboard or contact our support."
    },
    {
        question: "How do I find my perfect fit?",
        answer: "Our streetwear typically features a modern, slightly oversized Gen Z fit. Check the 'Size Guide' on each product page for exact measurements. If you're between sizes, we recommend sizing up for that signature aesthetic look."
    },
    {
        question: "Is Root & Loom an Indian brand?",
        answer: "Yes, we are a digital-first conscious fashion brand based in Ahmedabad, India. We take pride in weaving traditional Indian craftsmanship with global streetwear trends."
    }
];

export default function FAQSection() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": FAQS.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <section className="py-20 bg-stone-50">
            <Script
                id="faq-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-deep-forest mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-slate-bark/70 font-medium">
                        Everything you need to know about your next favorite drip.
                    </p>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-4">
                    {FAQS.map((faq, index) => (
                        <AccordionItem 
                            key={index} 
                            value={`item-${index}`}
                            className="bg-white border border-stone-200 rounded-xl px-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                        >
                            <AccordionTrigger className="text-left font-black uppercase tracking-tight text-deep-forest hover:no-underline py-6">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-slate-bark leading-relaxed pb-6">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
