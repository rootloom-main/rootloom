"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage() {
    return (
        <div className="container mx-auto p-10 text-center">
            <h1 className="text-2xl font-bold mb-4">Sentry Error Test</h1>
            <Button
                onClick={() => {
                    throw new Error("Sentry Test Error");
                }}
            >
                Trigger Client-Side Error
            </Button>
        </div>
    );
}
