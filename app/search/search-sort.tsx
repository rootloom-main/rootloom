'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchSort({ currentSort }: { currentSort: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('sort', value);
        router.push(`?${params.toString()}`);
    };

    return (
        <Select defaultValue={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full md:w-[180px] bg-white border-stone-200">
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest Arrivals</SelectItem>
            </SelectContent>
        </Select>
    );
}
