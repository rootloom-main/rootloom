'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateOrderNotes } from '@/app/admin/orders/actions';
import { StickyNote } from 'lucide-react';

interface OrderNotesProps {
    orderId: string;
    initialNotes: string | null;
}

export function OrderNotes({ orderId, initialNotes }: OrderNotesProps) {
    const [notes, setNotes] = useState(initialNotes || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('notes', notes);

        const result = await updateOrderNotes(formData);

        if (result?.error) {
            toast.error(result.error);
        } else {
            toast.success('Notes updated successfully');
        }
        setLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <StickyNote className="h-4 w-4" /> Internal Notes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Textarea
                        placeholder="Add internal notes about this order..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                    />
                    <div className="flex justify-end">
                        <Button size="sm" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Notes'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
