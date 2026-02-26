'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mic, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Add type definition for Window interface to include webkitSpeechRecognition
declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export function SearchBar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams?.get('search') || '');
    const [isListening, setIsListening] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const startSearch = (q: string) => {
            if (q.trim()) {
                router.push(`/shop?search=${encodeURIComponent(q.trim())}`);
            } else {
                router.push('/shop');
            }
        }
        startSearch(query);
    };

    const startListening = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    toast.error("Microphone access denied. Please execute permission.");
                } else {
                    toast.error("Speech recognition failed. Please try again.");
                }
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setQuery(transcript);
                // Optional: Auto-search after speech
                setTimeout(() => {
                    router.push(`/shop?search=${encodeURIComponent(transcript.trim())}`);
                }, 500);
            };

            recognition.start();
        } else {
            toast.error("Speech recognition is not supported in this browser.");
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <Input
                type="search"
                placeholder="Search products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-20 placeholder:text-base md:placeholder:text-lg h-11"
            />
            <div className="absolute right-0 top-0 h-full flex items-center">
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={`h-full px-3 hover:bg-transparent ${isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}
                    onClick={startListening}
                    disabled={isListening}
                >
                    {isListening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                    <span className="sr-only">Voice Search</span>
                </Button>
                <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="h-full px-3 hover:bg-transparent"
                >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Search</span>
                </Button>
            </div>
        </form>
    );
}
