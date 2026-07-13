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
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { ProductActions } from '@/app/admin/products/product-actions';
import { formatPrice } from '@/lib/utils/format';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface AdminProductsTableProps {
    products: any[];
    collections: any[];
}

export function AdminProductsTable({ products = [], collections = [] }: AdminProductsTableProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCollection, setSelectedCollection] = useState('all');

    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch = !searchQuery || 
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.slug && product.slug.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesCollection = selectedCollection === 'all' || 
                product.collection_products?.some((cp: any) => cp.collection_id === selectedCollection);
            
            return matchesSearch && matchesCollection;
        });
    }, [products, searchQuery, selectedCollection]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Active</span>;
            case 'draft': return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">Draft</span>;
            case 'archived': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">Archived</span>;
            default: return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">{status}</span>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white border-stone-200"
                    />
                </div>
                
                <div className="w-full sm:w-64">
                    <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Filter by Collection" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Collections</SelectItem>
                            {collections.map((col) => (
                                <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="border rounded-lg overflow-x-auto bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-stone-50/50">
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Featured</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                                    <div className="flex flex-col items-center justify-center space-y-2 text-stone-400">
                                        <Search className="h-8 w-8 opacity-50" />
                                        <p>No products found matching &quot;{searchQuery}&quot;.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id} className="hover:bg-stone-50/50">
                                    <TableCell className="font-medium text-deep-forest">
                                        <div className="flex flex-col">
                                            <span>{product.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-stone-600">{Array.isArray(product.categories) ? product.categories[0]?.name : product.categories?.name || 'Uncategorized'}</TableCell>
                                    <TableCell className="font-medium text-stone-900">{formatPrice(product.base_price)}</TableCell>
                                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                                    <TableCell>
                                        <span className={product.featured ? "text-amber-600 font-medium" : "text-stone-400"}>
                                            {product.featured ? 'Featured' : '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <ProductActions productId={product.id} />
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
