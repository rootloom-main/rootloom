'use client';
import { useState, useMemo } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Search } from 'lucide-react';

interface AdminInventoryTableProps {
    variants: any[];
}

export function AdminInventoryTable({ variants = [] }: AdminInventoryTableProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredVariants = useMemo(() => {
        return variants.filter(variant => {
            if (!searchQuery) return true;
            const searchTerm = searchQuery.toLowerCase();
            const productName = variant.product?.name?.toLowerCase() || '';
            const sku = variant.sku?.toLowerCase() || '';
            const size = variant.size?.toLowerCase() || '';
            const color = variant.color?.toLowerCase() || '';

            return productName.includes(searchTerm) ||
                sku.includes(searchTerm) ||
                size.includes(searchTerm) ||
                color.includes(searchTerm);
        });
    }, [variants, searchQuery]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="Search by product name, SKU, size, or color..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-stone-200"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-stone-50/50">
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Variant Details</TableHead>
                            <TableHead className="text-right">Stock Level</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredVariants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-stone-500">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Search className="h-8 w-8 text-stone-300" />
                                        <p>No inventory items found matching "{searchQuery}".</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredVariants.map((variant: any) => (
                                <TableRow key={variant.id} className="hover:bg-stone-50/50">
                                    <TableCell className="font-medium text-deep-forest">
                                        {variant.product?.name || 'Unknown Product'}
                                    </TableCell>
                                    <TableCell className="text-stone-500 font-mono text-xs">
                                        {variant.sku || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {variant.size && <Badge variant="outline" className="bg-white">{variant.size}</Badge>}
                                            {variant.color && <Badge variant="outline" className="bg-white">{variant.color}</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-medium">
                                        {variant.stock}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {variant.stock < 5 ? (
                                            <div className="flex justify-end items-center text-amber-600 font-medium">
                                                <AlertTriangle className="h-4 w-4 mr-1" /> Low Stock
                                            </div>
                                        ) : (
                                            <div className="flex justify-end items-center text-emerald-600 font-medium">
                                                <CheckCircle className="h-4 w-4 mr-1" /> Healthy
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
