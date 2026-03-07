'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { addAddress, updateAddress, AddressFormData } from '@/lib/actions/address';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const addressSchema = z.object({
    full_name: z.string().min(1, 'Full name is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    address_line1: z.string().min(1, 'Address Line 1 is required'),
    address_line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().default('India'),
    is_default: z.boolean().default(false),
});

interface AddressFormProps {
    initialData?: AddressFormData & { id?: string };
}

export function AddressForm({ initialData }: AddressFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const form = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: initialData || {
            full_name: '',
            phone: '',
            address_line1: '',
            address_line2: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'India',
            is_default: false,
        },
    });

    const [isFetchingPincode, setIsFetchingPincode] = useState(false);

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numbers
        const value = e.target.value.replace(/\D/g, '');
        form.setValue('postal_code', value);

        if (value.length === 6) {
            setIsFetchingPincode(true);
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${value}`);
                const data = await response.json();

                if (data && data[0] && data[0].Status === 'Success') {
                    const postOffice = data[0].PostOffice[0];
                    if (postOffice) {
                        form.setValue('city', postOffice.District || postOffice.Block);
                        form.setValue('state', postOffice.State);
                    }
                } else {
                    toast.error('Invalid Pincode or details not found.');
                }
            } catch (error) {
                console.error("Error fetching pincode details:", error);
            } finally {
                setIsFetchingPincode(false);
            }
        }
    };

    const onSubmit = (data: AddressFormData) => {
        startTransition(async () => {
            let result;
            if (initialData?.id) {
                result = await updateAddress(initialData.id, data);
            } else {
                result = await addAddress(data);
            }

            if (result.success) {
                toast.success(result.message);
                router.push('/account/addresses');
                router.refresh();
            } else {
                toast.error(result.message);
                if (result.errors) {
                    console.error(result.errors);
                }
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl bg-white p-6 md:p-8 rounded-xl border border-stone-200 shadow-sm">
                <div className="grid md:grid-cols-2 gap-5">
                    <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-stone-700 font-semibold">Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Samir Pandey" className="focus-visible:ring-moss-olive h-11" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-stone-700 font-semibold">Phone Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="+91 1234567890" className="focus-visible:ring-moss-olive h-11" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid md:grid-cols-3 gap-5 border-t border-stone-100 pt-5">
                    <FormField
                        control={form.control}
                        name="postal_code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-stone-700 font-semibold flex items-center justify-between">
                                    Postal Code
                                    {isFetchingPincode && <span className="text-xs text-moss-olive font-normal animate-pulse">Fetching...</span>}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="110001"
                                        className="focus-visible:ring-moss-olive h-11 font-mono tracking-wide"
                                        {...field}
                                        onChange={handlePincodeChange}
                                        maxLength={6}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-stone-700 font-semibold">City</FormLabel>
                                <FormControl>
                                    <Input placeholder="Mumbai" className="focus-visible:ring-moss-olive h-11 bg-stone-50" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-stone-700 font-semibold">State</FormLabel>
                                <FormControl>
                                    <Input placeholder="Maharashtra" className="focus-visible:ring-moss-olive h-11 bg-stone-50" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="address_line1"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-stone-700 font-semibold">Address Line 1</FormLabel>
                            <FormControl>
                                <Input placeholder="Flat No, Building, Street" className="focus-visible:ring-moss-olive h-11" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="address_line2"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-stone-700 font-semibold">Address Line 2 (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="Landmark, Area" className="focus-visible:ring-moss-olive h-11" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="is_default"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border border-stone-200 bg-stone-50 p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="data-[state=checked]:bg-deep-forest data-[state=checked]:border-deep-forest"
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="font-semibold text-deep-forest cursor-pointer">
                                    Set as Default Address
                                </FormLabel>
                                <p className="text-xs text-stone-500">This address will be pre-selected during checkout.</p>
                            </div>
                        </FormItem>
                    )}
                />

                <div className="flex gap-4 pt-4 border-t border-stone-100">
                    <Button type="submit" disabled={isPending} className="bg-deep-forest hover:bg-deep-forest/90 text-white h-11 px-8">
                        {isPending ? 'Saving...' : initialData?.id ? 'Update Address' : 'Save Address'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.back()} className="h-11">
                        Cancel
                    </Button>
                </div>
            </form>
        </Form>
    );
}
