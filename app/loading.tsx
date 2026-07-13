import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone-50/70 backdrop-blur-md">
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-serif tracking-[0.2em] text-deep-forest font-bold">
                        ROOT<span className="text-stone-300">&</span>LOOM
                    </h1>
                    <p className="text-[9px] tracking-[0.4em] text-stone-400 font-black uppercase mt-1">
                        Loading Experience
                    </p>
                </div>
                <div className="relative flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-deep-forest animate-spin stroke-[1.5px]" />
                </div>
            </div>
        </div>
    );
}
