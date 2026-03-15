'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils/format';
import { getProductPrice } from '@/lib/utils/pricing';
import { toast } from 'sonner';
import { Loader2, Check, Plus, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { addAddress, updateAddress, getAddresses, deleteAddress, setDefaultAddress } from '@/lib/actions/address';
import { usePostHog } from 'posthog-js/react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PaymentMethodCard } from '@/components/checkout/payment-method-card';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Address {
  id?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

type CheckoutStep = 'address' | 'summary' | 'payment';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, cartCount, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const posthog = usePostHog();
  const rzpInstance = useRef<any>(null);

  const [loading, setLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('address');
  const [completedSteps, setCompletedSteps] = useState({
    address: false,
    summary: false,
  });

  const paymentHasFailed = useRef(false);

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  const [address, setAddress] = useState<Address>({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; id: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Totals
  const subtotal = useMemo(() => cart.reduce((total, item) => {
    const price = getProductPrice(item.product, item.variant);
    return total + price * item.quantity;
  }, 0), [cart]);

  const shipping = subtotal > 999 ? 0 : 50;
  const total = Math.round(Math.max(0, subtotal + shipping - discount));

  // Protect Route
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?next=/checkout');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    // Handle retry deep-linking
    const isRetry = searchParams?.get('retry') === 'true';
    if (isRetry && !authLoading && user && cartCount > 0) {
      setCompletedSteps({ address: true, summary: true });
      setCheckoutStep('payment');
    }

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (rzpInstance.current) {
        try {
          rzpInstance.current.close();
        } catch (e) {}
      }
    };
  }, [searchParams, authLoading, user, cartCount]);

  // Load saved address
  useEffect(() => {
    const fetchAddresses = async () => {
      if (user) {
        const data = await getAddresses();
        if (data && data.length > 0) {
          setSavedAddresses(data);
          const defaultAddr = data.find((a: any) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
          setAddress(defaultAddr);
        } else {
          setIsAddingNewAddress(true);
        }
      }
    }
    if (!authLoading && user) {
      fetchAddresses();
    }
  }, [user, authLoading]);

  const handleSelectSavedAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setAddress(addr);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const required = ['full_name', 'phone', 'address_line1', 'city', 'state', 'postal_code'];
    for (const field of required) {
      if (!address[field as keyof Address]) {
        toast.error(`Please fill in ${field.replace('_', ' ')}`);
        return false;
      }
    }
    if (address.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }
    return true;
  };

  const saveOrUpdateAddress = async () => {
    if (address.id && !isAddingNewAddress) {
      return address; // Already saved
    }

    if (address.id && isAddingNewAddress) {
      // Editing an existing address
      const res = await updateAddress(address.id, address);
      if (res.success && res.data) {
        setSavedAddresses(savedAddresses.map(a => a.id === address.id ? res.data : a));
        setIsAddingNewAddress(false);
        setSelectedAddressId(res.data.id);
        return res.data;
      }
      if (res.message) toast.error(res.message);
      return null;
    }

    // Adding a brand new address
    const res = await addAddress(address);
    if (res.success && res.data) {
      setSavedAddresses([...savedAddresses, res.data]);
      setIsAddingNewAddress(false);
      setSelectedAddressId(res.data.id);
      return res.data;
    }
    if (res.message) toast.error(res.message);
    return null;
  };

  const handleEditAddress = (addr: Address) => {
    setAddress(addr);
    setIsAddingNewAddress(true);
  };

  const handleDeleteAddress = async (id: string) => {
    setLoading(true);
    const res = await deleteAddress(id);
    setLoading(false);
    if (res.success) {
      const updated = savedAddresses.filter(a => a.id !== id);
      setSavedAddresses(updated);
      toast.success('Address deleted successfully');
      if (selectedAddressId === id) {
        setSelectedAddressId(updated.length > 0 ? updated[0].id : null);
        if (updated.length === 0) setIsAddingNewAddress(true);
      }
    } else {
      toast.error('Failed to delete address');
    }
  };

  const handleMakeDefault = async (id: string) => {
    setLoading(true);
    const res = await setDefaultAddress(id);
    setLoading(false);
    if (res.success) {
      setSavedAddresses(savedAddresses.map(a => ({ ...a, is_default: a.id === id })));
      toast.success('Default address updated');
    } else {
      toast.error('Failed to set default address');
    }
  };

  const handleDeliverHere = async () => {
    if (isAddingNewAddress && !validateForm()) return;

    setLoading(true);
    const savedAddr = await saveOrUpdateAddress();
    setLoading(false);

    if (savedAddr) {
      setAddress(savedAddr);
      setCompletedSteps(prev => ({ ...prev, address: true }));
      setCheckoutStep('summary');
      toast.success("Delivery address saved");
    } else {
      toast.error("Failed to save address details");
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { validateCoupon } = await import('./actions');
      const result = await validateCoupon(couponCode, subtotal);
      if (result.success && result.discountAmount !== undefined) {
        setDiscount(result.discountAmount);
        setAppliedCoupon({ code: result.couponCode!, id: result.couponId! });
        toast.success(result.message);
      } else {
        setDiscount(0);
        setAppliedCoupon(null);
        toast.error(result.message || 'Invalid coupon');
      }
    } catch (err) {
      toast.error("Failed to apply coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleContinueSummary = () => {
    setCompletedSteps(prev => ({ ...prev, summary: true }));
    setCheckoutStep('payment');
  };

  const processPayment = async () => {
    setLoading(true);
    setIsProcessingPayment(true);
    paymentHasFailed.current = false;
    try {
      if (paymentMethod === 'cod') {
        await handleCOD();
        return;
      }

      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          currency: 'INR',
          couponCode: appliedCoupon?.code,
          addressId: address.id,
        }),
      });

      const orderData = await response.json();
      if (!orderData.success) throw new Error(orderData.message || 'Failed to create order');

      // PHASE 3: Open Razorpay Direct (Integrated in Overlay)
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Root&Loom',
        description: 'Sustainable Luxury Fashion',
        order_id: orderData.order.id,
        handler: async function (response: any) {
          setIsProcessingPayment(true);
          try {
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                address_id: address.id,
                couponCode: appliedCoupon?.code,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              await clearCart();
              router.push(`/checkout/success?orderNumber=${verifyData.orderNumber}`);
            } else {
              toast.error(verifyData.message || 'Verification failed');
              setIsProcessingPayment(false);
              setLoading(false);
            }
          } catch (error) {
            console.error('Verification Error:', error);
            setIsProcessingPayment(false);
            setLoading(false);
            router.push('/checkout/failed?reason=network_error');
          }
        },
        modal: {
          ondismiss: () => {
             setIsProcessingPayment(false);
             setLoading(false);
             router.push('/checkout/failed?reason=cancelled');
          },
          escape: false,
          backdropclose: false
        },
        prefill: {
          name: address.full_name,
          email: user?.email || '',
          contact: address.phone,
        },
        theme: { color: '#1F2F26' },
        retry: { enabled: false }
      };

      const rzp = new window.Razorpay(options);
      rzpInstance.current = rzp;
      
      rzp.on('payment.failed', function (response: any) {
          setIsProcessingPayment(false);
          setLoading(false);
          router.replace(`/checkout/failed?reason=${response.error.code}`);
      });

      rzp.open();

    } catch (error: any) {
      console.error('Payment Error:', error);
      toast.error(error.message || 'Payment error');
      setIsProcessingPayment(false);
      setLoading(false);
    }
  };

  const handleCOD = async () => {
    setIsProcessingPayment(true);
    setLoading(true);
    try {
      const response = await fetch('/api/checkout/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            price: getProductPrice(item.product, item.variant),
          })),
          address_id: address.id,
          subtotal, shipping_cost: shipping, total,
          couponCode: appliedCoupon?.code,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await clearCart();
        router.push(`/checkout/success?orderNumber=${data.orderNumber}`);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message);
      setIsProcessingPayment(false);
      setLoading(false);
    }
  };

  if (authLoading || cartCount === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
      </div>
    )
  }

  return (
    <div className="bg-stone-100 min-h-screen pb-20 pt-8">
      <div className="container max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Main Accordion Flow */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* STEP 1: LOGIN */}
          <div className="bg-white p-4 flex justify-between items-center shadow-sm rounded-sm">
            <div className="flex items-center gap-4">
              <span className="bg-stone-200 text-stone-500 px-2 py-0.5 rounded text-sm font-bold">1</span>
              <h2 className="text-gray-500 font-bold font-serif uppercase tracking-widest text-sm flex items-center">
                LOGIN <Check className="ml-2 h-4 w-4 text-green-600" />
              </h2>
            </div>
            <div className="text-sm flex flex-col items-end">
              <span className="font-semibold text-stone-900">{user?.user_metadata?.full_name || 'Customer'}</span>
              <span className="text-stone-500 font-medium">{user?.email || user?.phone}</span>
            </div>
          </div>

          {/* STEP 2: DELIVERY ADDRESS */}
          <div className="bg-white shadow-sm rounded-sm overflow-hidden">
            <div className={cn("px-4 py-3 flex items-center justify-between", checkoutStep === 'address' ? 'bg-deep-forest text-white' : 'bg-white')}>
              <div className="flex items-center gap-4">
                <span className={cn("px-2 py-0.5 rounded text-sm font-bold shadow-sm transition-colors", checkoutStep === 'address' ? 'bg-white text-deep-forest' : completedSteps.address ? 'bg-stone-200 text-stone-500' : 'bg-stone-200 text-stone-500')}>2</span>
                <h2 className={cn("font-bold font-serif uppercase tracking-widest text-sm flex items-center transition-colors", checkoutStep === 'address' ? 'text-white' : completedSteps.address ? 'text-gray-500' : 'text-gray-500')}>
                  DELIVERY ADDRESS {completedSteps.address && <Check className="ml-2 h-4 w-4 text-green-600 font-bold" />}
                </h2>
              </div>
              {completedSteps.address && checkoutStep !== 'address' && (
                <Button variant="ghost" size="sm" onClick={() => setCheckoutStep('address')} className="text-deep-forest font-bold uppercase text-xs tracking-wider border border-deep-forest/20 hover:bg-deep-forest/5">CHANGE</Button>
              )}
            </div>

            {checkoutStep === 'address' && (
              <div className="p-6 bg-white border-t border-stone-100">
                {!isAddingNewAddress && savedAddresses.length > 0 ? (
                  <div className="space-y-4">
                    {savedAddresses.map(addr => (
                      <label key={addr.id} className={cn("flex gap-4 p-4 border rounded-md cursor-pointer transition-all", selectedAddressId === addr.id ? "bg-stone-50 border-deep-forest/40" : "border-stone-200 hover:bg-stone-50/50")}>
                        <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => handleSelectSavedAddress(addr)} className="mt-1 flex-shrink-0 text-deep-forest focus:ring-deep-forest" />
                        <div className="text-sm flex-1">
                          <p className="font-bold flex items-center gap-2 text-stone-900">
                            {addr.full_name}
                            <span className="px-1.5 py-0.5 bg-stone-100 rounded text-[10px] text-stone-500 uppercase font-bold tracking-wider">HOME</span>
                          </p>
                          <p className="mt-1 text-stone-600 leading-relaxed font-medium">{addr.address_line1}, {addr.address_line2 && `${addr.address_line2}, `}{addr.city}</p>
                          <p className="text-stone-600 leading-relaxed font-medium">{addr.state} - <span className="font-bold">{addr.postal_code}</span></p>
                          <p className="mt-2 text-stone-600 font-medium">Mobile: <span className="font-bold text-stone-900">{addr.phone}</span></p>

                          {selectedAddressId === addr.id && (
                            <div className="mt-5">
                              <Button
                                disabled={loading}
                                onClick={handleDeliverHere}
                                className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-sm px-8 font-bold text-sm tracking-wide h-12 shadow-md w-full sm:w-auto mb-4"
                              >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                DELIVER HERE
                              </Button>

                              <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-stone-500">
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }} className="hover:text-deep-forest transition-colors">EDIT</button>
                                <span className="text-stone-300">|</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.id); }} className="hover:text-red-600 transition-colors">DELETE</button>
                                {!addr.is_default && (
                                  <>
                                    <span className="text-stone-300">|</span>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleMakeDefault(addr.id); }} className="hover:text-deep-forest transition-colors">SET AS DEFAULT</button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                    {savedAddresses.length < 3 && (
                      <Button variant="outline" onClick={() => {
                        setAddress({
                          full_name: '', phone: '', address_line1: '', address_line2: '',
                          city: '', state: '', postal_code: '', country: 'India', is_default: false
                        });
                        setIsAddingNewAddress(true);
                      }} className="w-full h-12 border-dashed border-stone-300 text-deep-forest font-bold uppercase tracking-wider text-xs">
                        <Plus className="mr-2 h-4 w-4" /> Add a new address
                      </Button>
                    )}
                    {savedAddresses.length >= 3 && (
                      <p className="text-xs text-stone-500 font-medium text-center italic mt-2">
                        You have reached the maximum limit of 3 saved addresses. Please delete an old address to add a new one.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-stone-50/50 p-6 rounded border border-stone-100">
                    <h3 className="font-bold text-stone-900 mb-4 uppercase text-xs tracking-wider text-deep-forest">Add a new address</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold tracking-wider text-stone-500">Full Name</Label>
                        <Input name="full_name" value={address.full_name} onChange={handleInputChange} className="h-12 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold tracking-wider text-stone-500">10-digit mobile number</Label>
                        <Input name="phone" value={address.phone} onChange={handleInputChange} maxLength={10} className="h-12 bg-white" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs uppercase font-bold tracking-wider text-stone-500">Address (Area and Street)</Label>
                        <Input name="address_line1" value={address.address_line1} onChange={handleInputChange} className="h-12 bg-white" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs uppercase font-bold tracking-wider text-stone-500">Landmark (Optional)</Label>
                        <Input name="address_line2" value={address.address_line2} onChange={handleInputChange} className="h-12 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold tracking-wider text-stone-500">City/District/Town</Label>
                        <Input name="city" value={address.city} onChange={handleInputChange} className="h-12 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold tracking-wider text-stone-500">State</Label>
                        <Input name="state" value={address.state} onChange={handleInputChange} className="h-12 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold tracking-wider text-stone-500">Pincode</Label>
                        <Input name="postal_code" value={address.postal_code} onChange={handleInputChange} maxLength={6} className="h-12 bg-white" />
                      </div>
                    </div>
                    <div className="mt-6 flex gap-4">
                      <Button
                        disabled={loading}
                        onClick={handleDeliverHere}
                        className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-sm px-8 font-bold text-sm tracking-wide h-12 shadow-md w-full sm:w-auto"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        SAVE AND DELIVER HERE
                      </Button>
                      {savedAddresses.length > 0 && (
                        <Button variant="ghost" className="h-12 font-bold uppercase tracking-wider text-xs" onClick={() => {
                          setIsAddingNewAddress(false);
                          const addr = savedAddresses.find(a => a.id === selectedAddressId) || savedAddresses[0];
                          setAddress(addr);
                        }}>CANCEL</Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: ORDER SUMMARY */}
          <div className="bg-white shadow-sm rounded-sm overflow-hidden">
            <div className={cn("px-4 py-3 flex items-center justify-between", checkoutStep === 'summary' ? 'bg-deep-forest text-white' : 'bg-white')}>
              <div className="flex items-center gap-4">
                <span className={cn("px-2 py-0.5 rounded text-sm font-bold shadow-sm transition-colors", checkoutStep === 'summary' ? 'bg-white text-deep-forest' : completedSteps.summary ? 'bg-stone-200 text-stone-500' : 'bg-stone-200 text-stone-500')}>3</span>
                <h2 className={cn("font-bold font-serif uppercase tracking-widest text-sm flex items-center transition-colors", checkoutStep === 'summary' ? 'text-white' : completedSteps.summary ? 'text-gray-500' : 'text-gray-500')}>
                  ORDER SUMMARY {completedSteps.summary && <Check className="ml-2 h-4 w-4 text-green-600 font-bold" />}
                </h2>
              </div>
              {completedSteps.summary && checkoutStep !== 'summary' && (
                <Button variant="ghost" size="sm" onClick={() => setCheckoutStep('summary')} className="text-deep-forest font-bold uppercase text-xs tracking-wider border border-deep-forest/20 hover:bg-deep-forest/5">CHANGE</Button>
              )}
            </div>

            {checkoutStep === 'summary' && (
              <div className="bg-white border-t border-stone-100">
                <div className="divide-y divide-stone-100">
                  {cart.map(item => (
                    <div key={item.id} className="p-6 flex gap-6">
                      <div className="h-[120px] w-[90px] relative flex-shrink-0 bg-stone-50 border border-stone-100 rounded p-2">
                        {item.product.product_images?.[0] ? (
                          <Image src={item.product.product_images[0].image_url} alt="" fill className="object-contain mix-blend-multiply" />
                        ) : (
                          <ShoppingBag className="mx-auto my-auto text-stone-300 h-8 w-8 mt-10" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-stone-900 leading-tight mb-2 text-base max-w-[80%]">{item.product.name}</h4>
                        <div className="flex items-center gap-4 text-sm font-medium text-stone-500">
                          <span>Size: <span className="font-bold text-stone-900">{item.variant.size}</span></span>
                          <span className="h-1 w-1 rounded-full bg-stone-300" />
                          <span>Color: <span className="font-bold text-stone-900">{item.variant.color}</span></span>
                          <span className="h-1 w-1 rounded-full bg-stone-300" />
                          <span>Qty: <span className="font-bold text-stone-900 border px-2 py-0.5 rounded bg-stone-50">{item.quantity}</span></span>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <span className="font-bold text-xl text-stone-900">{formatPrice((item.product.base_price + (item.variant.price_adjustment || 0)) * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline Coupon Code */}
                <div className="p-6 bg-stone-50/50 border-t border-stone-100">
                  {!appliedCoupon ? (
                    <div className="flex gap-3 max-w-sm">
                      <Input
                        placeholder="ENTER COUPON CODE"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="h-12 bg-white uppercase font-bold tracking-wider placeholder:tracking-normal font-mono"
                      />
                      <Button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode} variant="outline" className="h-12 font-bold tracking-widest text-xs">
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'APPLY'}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-green-50 text-green-800 p-4 flex justify-between items-center rounded border border-green-200">
                      <div>
                        <p className="font-bold tracking-wider uppercase text-xs mb-1">Coupon Applied</p>
                        <p className="text-sm font-semibold">Saved {formatPrice(discount)} via {appliedCoupon.code}</p>
                      </div>
                      <Button onClick={() => { setAppliedCoupon(null); setDiscount(0); setCouponCode(''); }} variant="ghost" size="sm" className="text-green-700 hover:bg-green-100">REMOVE</Button>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-inner">
                  <p className="text-sm font-medium text-stone-600">Order confirmation email will be sent to <span className="font-bold text-deep-forest">{user?.email}</span></p>
                  <Button onClick={handleContinueSummary} className="w-full sm:w-auto bg-deep-forest hover:bg-deep-forest/90 text-white rounded-sm px-10 font-bold text-sm tracking-wide h-12 shadow-md">
                    CONTINUE
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: PAYMENT OPTIONS */}
          <div className="bg-white shadow-sm rounded-sm overflow-hidden mb-10">
            <div className={cn("px-4 py-3 flex items-center justify-between", checkoutStep === 'payment' ? 'bg-deep-forest text-white' : 'bg-white')}>
              <div className="flex items-center gap-4">
                <span className={cn("px-2 py-0.5 rounded text-sm font-bold shadow-sm transition-colors", checkoutStep === 'payment' ? 'bg-white text-deep-forest' : 'bg-stone-200 text-stone-500')}>4</span>
                <h2 className={cn("font-bold font-serif uppercase tracking-widest text-sm flex items-center transition-colors", checkoutStep === 'payment' ? 'text-white' : 'text-gray-500')}>
                  PAYMENT OPTIONS
                </h2>
              </div>
            </div>

            {checkoutStep === 'payment' && (
              <div className="p-6 bg-white border-t border-stone-100">
                <div className="grid gap-4 max-w-xl">
                  <PaymentMethodCard
                    id="razorpay"
                    title="UPI, Cards & Netbanking"
                    description="Secure online payment via Razorpay. Supported: PhonePe, GPay, Visa, Mastercard, AMEX."
                    icon="razorpay"
                    selected={paymentMethod === 'razorpay'}
                    onSelect={() => setPaymentMethod('razorpay')}
                  />
                  <PaymentMethodCard
                    id="cod"
                    title="Cash on Delivery"
                    description="Pay in cash or via UPI to the delivery executive when the order reaches your door."
                    icon="cod"
                    selected={paymentMethod === 'cod'}
                    onSelect={() => setPaymentMethod('cod')}
                  />
                </div>

                <div className="mt-8 border-t border-stone-100 pt-6">
                  <Button
                    onClick={processPayment}
                    disabled={loading || (paymentMethod === 'razorpay' && !scriptLoaded)}
                    className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-sm px-12 font-bold text-lg tracking-wide h-14 shadow-lg flex items-center w-full sm:w-auto justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      `PLACE ORDER & PAY ${formatPrice(total)}`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* PRICE DETAILS (Sticky Sidebar) */}
        <div className="lg:col-span-4 hidden lg:block sticky top-24">
          <div className="bg-white rounded-sm shadow-sm border border-stone-200">
            <div className="p-4 border-b border-stone-100">
              <h2 className="text-stone-500 font-bold uppercase text-xs tracking-widest">Price Details</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between text-stone-900 font-medium">
                <span>Price ({cartCount} items)</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-900 font-medium border-b border-dashed border-stone-200 pb-5">
                <span>Delivery Charges</span>
                <span className="text-green-600 font-bold">{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-stone-900 pt-1">
                <span>Total Payable</span>
                <span>{formatPrice(total)}</span>
              </div>
              {discount > 0 && (
                <div className="text-green-700 font-bold tracking-wide text-xs pt-3 mt-1 text-center bg-green-50 p-2 rounded">
                  Your Total Savings on this order {formatPrice(discount)}
                </div>
              )}
            </div>
            <div className="bg-stone-50 border-t border-stone-100 p-4 text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2 justify-center">
              <ShieldCheck className="h-5 w-5 text-deep-forest" /> Safe and Secure Payments
            </div>
          </div>
        </div>

      </div>

      {isProcessingPayment && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-white p-6">
          <div className="absolute top-0 left-0 w-full h-1 bg-stone-100">
            <div className="h-full bg-deep-forest animate-shimmer w-1/3" />
          </div>
          
          <div className="flex flex-col items-center max-w-sm w-full">
            <div className="mb-12">
              <h1 className="text-3xl font-serif tracking-[0.2em] text-deep-forest font-bold">ROOT<span className="text-stone-300">&</span>LOOM</h1>
            </div>

            <div className="relative mb-10">
              <Loader2 className="h-16 w-16 text-deep-forest animate-spin stroke-[1.5px]" />
              <ShieldCheck className="absolute inset-0 m-auto h-6 w-6 text-deep-forest" />
            </div>

            <div className="text-center space-y-4">
              <h2 className="text-xl font-serif font-bold text-stone-900">Processing Payment</h2>
              <p className="text-stone-500 text-sm leading-relaxed font-medium">
                Please do not refresh this page. We are connecting you to our secure payment gateway.
              </p>
            </div>
          </div>

          <style jsx>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
            .animate-shimmer {
              animation: shimmer 2s infinite linear;
            }
          `}</style>
        </div>
      )}

    </div>
  );
}
