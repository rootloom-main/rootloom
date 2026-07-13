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
import { AlertTriangle, CheckCircle, Search, Plus, Trash } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { restockVariant } from '@/lib/actions/product';

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
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredVariants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-stone-500">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Search className="h-8 w-8 text-stone-300" />
                                        <p>No inventory items found matching &quot;{searchQuery}&quot;.</p>
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
                                     <TableCell className="text-right">
                                         <div className="flex justify-end gap-2">
                                             <RestockButton variantId={variant.id} productName={variant.product?.name} />
                                             <DeleteVariantButton variantId={variant.id} sku={variant.sku} />
                                         </div>
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

function RestockButton({ variantId, productName }: { variantId: string; productName: string }) {
    const [open, setOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    const handleRestock = async () => {
        setLoading(true);
        try {
            const result = await restockVariant(variantId, quantity);
            if (result.success) {
                toast.success(result.message);
                setOpen(false);
                setQuantity(1);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('An error occurred while restocking');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 border-stone-200 hover:border-deep-forest hover:text-deep-forest">
                    <Plus className="h-3.5 w-3.5" />
                    Restock
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Restock Product</DialogTitle>
                    <DialogDescription>
                        Add more items to the inventory for <strong>{productName}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity
                        </Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleRestock} disabled={loading || quantity <= 0} className="bg-deep-forest text-white hover:bg-deep-forest/90">
                        {loading ? 'Restocking...' : 'Confirm Restock'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteVariantButton({ variantId, sku }: { variantId: string; sku?: string }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to permanently delete variant ${sku || ''}?`)) {
            setLoading(true);
            try {
                const { deleteVariant } = await import('@/lib/actions/product');
                const result = await deleteVariant(variantId);
                if (result.success) {
                    toast.success(result.message);
                } else {
                    toast.error(result.message);
                }
            } catch (error) {
                toast.error('An error occurred while deleting variant');
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="h-8 gap-1.5 border-stone-200 text-red-600 hover:border-red-600 hover:text-red-600 hover:bg-red-50"
        >
            <Trash className="h-3.5 w-3.5" />
            Delete
        </Button>
    );
}
