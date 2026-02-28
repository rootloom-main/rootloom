'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, ShieldCheck, MapPin, CreditCard, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { addAddress, updateAddress, getAddresses } from '@/lib/actions/address';
import { usePostHog } from 'posthog-js/react';
import { motion, AnimatePresence } from 'framer-motion';
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

type CheckoutStep = 'address' | 'payment';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartCount, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const posthog = usePostHog();

  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('address');
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');

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
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; id: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Totals
  const subtotal = useMemo(() => cart.reduce((total, item) => {
    const price = item.product.base_price + (item.variant.price_adjustment || 0);
    return total + price * item.quantity;
  }, 0), [cart]);

  const shipping = subtotal > 999 ? 0 : 50;
  const total = Math.max(0, subtotal + shipping - discount);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    if (posthog && cartCount > 0) {
      posthog.capture('checkout_started', {
        cart_count: cartCount,
        value: subtotal
      });
    }

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [cartCount, posthog, subtotal]);

  // Load saved address
  useEffect(() => {
    const savedSessionAddress = sessionStorage.getItem('checkoutAddress');
    if (savedSessionAddress) {
      try {
        setAddress(JSON.parse(savedSessionAddress));
      } catch (e) {
        console.error('Failed to parse saved address', e);
      }
    }

    const fetchAddresses = async () => {
      if (user) {
        const data = await getAddresses();
        if (data && data.length > 0) {
          setSavedAddresses(data);
          if (!savedSessionAddress) {
            const defaultAddr = data.find((a: any) => a.is_default) || data[0];
            setAddress({
              id: defaultAddr.id,
              full_name: defaultAddr.full_name,
              phone: defaultAddr.phone,
              address_line1: defaultAddr.address_line1,
              address_line2: defaultAddr.address_line2 || '',
              city: defaultAddr.city,
              state: defaultAddr.state,
              postal_code: defaultAddr.postal_code,
              country: defaultAddr.country || 'India',
              is_default: defaultAddr.is_default || false,
            });
          }
        }
      }
    }

    if (!authLoading) {
      fetchAddresses();
    }
  }, [user, authLoading]);

  // Persist address
  useEffect(() => {
    if (Object.values(address).some((val) => val !== '' && val !== 'India' && typeof val === 'string')) {
      sessionStorage.setItem('checkoutAddress', JSON.stringify(address));
    }
  }, [address]);

  const handleSelectAddress = (selected: any) => {
    setAddress({
      id: selected.id,
      full_name: selected.full_name,
      phone: selected.phone,
      address_line1: selected.address_line1,
      address_line2: selected.address_line2 || '',
      city: selected.city,
      state: selected.state,
      postal_code: selected.postal_code,
      country: selected.country || 'India',
      is_default: selected.is_default || false,
    });
    setShowAddressModal(false);
    toast.success("Address applied");
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
    if (address.id) {
      const res = await updateAddress(address.id, address);
      if (res.success && res.data) return res.data;
    }
    const res = await addAddress(address);
    return res.success ? res.data : null;
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

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setAppliedCoupon(null);
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      if (!user) {
        sessionStorage.setItem('checkoutAddress', JSON.stringify(address));
        router.push('/auth/login?next=/checkout');
        return;
      }

      const savedAddress = await saveOrUpdateAddress();
      if (!savedAddress) throw new Error('Failed to save address details');

      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          currency: 'INR',
          couponCode: appliedCoupon?.code,
          addressId: savedAddress.id,
        }),
      });

      const orderData = await response.json();
      if (!orderData.success) throw new Error(orderData.message || 'Failed to create order');

      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!rzpKey) throw new Error('Payment gateway error');

      const options = {
        key: rzpKey,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Root&Loom',
        description: 'Sustainable Luxury Fashion',
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                cartItems: cart.map((item) => ({
                  product_id: item.product_id,
                  variant_id: item.variant_id,
                  quantity: item.quantity,
                  price: item.product.base_price + (item.variant.price_adjustment || 0),
                })),
                address_id: savedAddress.id,
                subtotal, shipping_cost: shipping, total,
                couponCode: appliedCoupon?.code,
                discountAmount: discount
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.success) {
              await clearCart();
              router.push(`/checkout/success?orderNumber=${verifyData.orderNumber}`);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            router.push('/checkout/failed');
          }
        },
        prefill: {
          name: address.full_name,
          email: user?.email || '',
          contact: address.phone,
        },
        theme: {
          color: '#1F2F26',
          backdrop_color: '#00000080',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      razorpay.on('payment.failed', () => {
        setLoading(false);
        router.push('/checkout/failed');
      });
    } catch (error: any) {
      toast.error(error.message || 'Payment error');
      setLoading(false);
    }
  };

  const handleCOD = async () => {
    setLoading(true);
    try {
      const savedAddress = await saveOrUpdateAddress();
      if (!savedAddress) throw new Error('Failed to save address');

      const response = await fetch('/api/checkout/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            price: item.product.base_price + (item.variant.price_adjustment || 0),
          })),
          address_id: savedAddress.id,
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
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (checkoutStep === 'address') {
      if (validateForm()) setCheckoutStep('payment');
    }
  };

  if (cartCount === 0 && !loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <ShoppingBag className="h-16 w-16 text-stone-200 mb-4" />
        <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Your cart is empty</h2>
        <p className="text-stone-500 mb-8">Add pieces to your wardrobe to get started.</p>
        <Button onClick={() => router.push('/shop')} className="bg-deep-forest px-8 py-6 h-auto text-base tracking-widest font-bold">
          START SHOPPING
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/50 pb-20">
      {/* Stepper Header */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => checkoutStep === 'payment' ? setCheckoutStep('address') : router.push('/cart')} className="rounded-full hover:bg-stone-50">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {checkoutStep === 'payment' ? 'Back' : 'Cart'}
            </Button>
            <h1 className="text-xl font-serif font-bold text-stone-900 md:block hidden">Checkout</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-8">
            <div className={cn("flex items-center gap-2 transition-all duration-500", checkoutStep === 'address' ? "opacity-100 scale-110" : "opacity-40 scale-100")}>
              <span className="h-6 w-6 rounded-full bg-deep-forest text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span className="text-sm font-bold whitespace-nowrap">Shipping</span>
            </div>
            <div className="h-[1px] w-8 bg-stone-200 hidden md:block" />
            <div className={cn("flex items-center gap-2 transition-all duration-500", checkoutStep === 'payment' ? "opacity-100 scale-110" : "opacity-40 scale-100")}>
              <span className={cn("h-6 w-6 rounded-full text-[10px] flex items-center justify-center font-bold transition-colors", checkoutStep === 'payment' ? "bg-deep-forest text-white" : "bg-stone-200 text-stone-500")}>2</span>
              <span className="text-sm font-bold whitespace-nowrap">Payment</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-deep-forest bg-deep-forest/5 px-4 py-2 rounded-full hidden md:flex border border-deep-forest/10">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Checkout</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 lg:mt-12">
        <div className="grid lg:grid-cols-12 gap-12 items-start">

          {/* Main Form Area */}
          <div className="lg:col-span-7 space-y-8">
            <AnimatePresence mode="wait">
              {checkoutStep === 'address' ? (
                <motion.div
                  key="address-step"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                >
                  <Card className="border-none shadow-sm overflow-hidden bg-white rounded-2xl">
                    <div className="p-8 border-b flex justify-between items-center">
                      <div className="flex items-center gap-3 text-stone-900">
                        <MapPin className="h-5 w-5 text-deep-forest" />
                        <h2 className="text-2xl font-serif font-bold">Shipping Details</h2>
                      </div>
                      {savedAddresses.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddressModal(true)}
                          className="border-stone-200 hover:bg-stone-50 rounded-full text-[10px] font-bold h-8 tracking-widest uppercase px-4"
                        >
                          Select Saved
                        </Button>
                      )}
                    </div>
                    <CardContent className="p-8 space-y-8">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label htmlFor="full_name" className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-none mb-1 block">Full Name</Label>
                          <Input id="full_name" name="full_name" value={address.full_name} onChange={handleInputChange} className="rounded-none border-0 border-b-2 border-stone-100 focus:border-deep-forest focus:ring-0 px-0 h-10 bg-transparent text-base transition-all placeholder:text-stone-300" placeholder="e.g. Samir Pandey" />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="phone" className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-none mb-1 block">Phone Number</Label>
                          <Input id="phone" name="phone" value={address.phone} onChange={handleInputChange} className="rounded-none border-0 border-b-2 border-stone-100 focus:border-deep-forest focus:ring-0 px-0 h-10 bg-transparent text-base transition-all placeholder:text-stone-300" placeholder="10-digit mobile" maxLength={10} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="address_line1" className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-none mb-1 block">Street Address</Label>
                        <Input id="address_line1" name="address_line1" value={address.address_line1} onChange={handleInputChange} className="rounded-none border-0 border-b-2 border-stone-100 focus:border-deep-forest focus:ring-0 px-0 h-10 bg-transparent text-base transition-all placeholder:text-stone-300" placeholder="House no., Building, Street" />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="address_line2" className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-none mb-1 block">Landmark (Optional)</Label>
                        <Input id="address_line2" name="address_line2" value={address.address_line2} onChange={handleInputChange} className="rounded-none border-0 border-b-2 border-stone-100 focus:border-deep-forest focus:ring-0 px-0 h-10 bg-transparent text-base transition-all placeholder:text-stone-300" placeholder="Near Indiranagar Metro" />
                      </div>

                      <div className="grid md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <Label htmlFor="city" className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-none mb-1 block">City</Label>
                          <Input id="city" name="city" value={address.city} onChange={handleInputChange} className="rounded-none border-0 border-b-2 border-stone-100 focus:border-deep-forest focus:ring-0 px-0 h-10 bg-transparent text-base transition-all placeholder:text-stone-300" placeholder="Bangalore" />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="state" className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-none mb-1 block">State</Label>
                          <Input id="state" name="state" value={address.state} onChange={handleInputChange} className="rounded-none border-0 border-b-2 border-stone-100 focus:border-deep-forest focus:ring-0 px-0 h-10 bg-transparent text-base transition-all placeholder:text-stone-300" placeholder="Karnataka" />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor="postal_code" className="text-stone-500 font-bold uppercase text-[10px] tracking-[0.2em] leading-none mb-1 block">PIN Code</Label>
                          <Input id="postal_code" name="postal_code" value={address.postal_code} onChange={handleInputChange} className="rounded-none border-0 border-b-2 border-stone-100 focus:border-deep-forest focus:ring-0 px-0 h-10 bg-transparent text-base transition-all placeholder:text-stone-300" placeholder="560038" maxLength={6} />
                        </div>
                      </div>

                      <Button
                        className="w-full bg-deep-forest hover:bg-deep-forest/90 h-16 text-sm font-bold tracking-[0.2em] rounded-xl transition-all hover:shadow-2xl active:scale-[0.98] mt-6"
                        onClick={nextStep}
                      >
                        CONTINUE TO PAYMENT
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="payment-step"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                  className="space-y-8"
                >
                  <div className="flex items-center gap-3 text-stone-900 mb-2">
                    <CreditCard className="h-6 w-6 text-deep-forest" />
                    <h2 className="text-2xl font-serif font-bold">Choose Payment</h2>
                  </div>

                  <div className="grid gap-5">
                    <PaymentMethodCard
                      id="razorpay"
                      title="Instant & Secure"
                      description="UPI, All Cards, Netbanking. Fast & Secure."
                      icon="razorpay"
                      selected={paymentMethod === 'razorpay'}
                      onSelect={() => setPaymentMethod('razorpay')}
                    />
                    <PaymentMethodCard
                      id="cod"
                      title="Cash on Delivery"
                      description="Pay when your order reaches your doorstep."
                      icon="cod"
                      selected={paymentMethod === 'cod'}
                      onSelect={() => setPaymentMethod('cod')}
                    />
                  </div>

                  <div className="bg-white/50 rounded-2xl p-6 border border-stone-100 flex items-start gap-4 shadow-sm">
                    <div className="bg-deep-forest/10 p-2.5 rounded-xl">
                      <ShieldCheck className="h-6 w-6 text-deep-forest" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900 tracking-tight">Enterprise-grade Security</p>
                      <p className="text-xs text-stone-500 mt-1 leading-relaxed">Your data is fully encrypted. We follow strict PCI DSS compliance standards to protect your information.</p>
                    </div>
                  </div>

                  <Button
                    className={cn(
                      "w-full h-16 text-sm font-bold tracking-[0.2em] rounded-xl transition-all hover:shadow-2xl active:scale-[0.98]",
                      paymentMethod === 'razorpay' ? "bg-deep-forest hover:bg-deep-forest/90" : "bg-stone-900 hover:bg-black"
                    )}
                    onClick={paymentMethod === 'razorpay' ? handlePayment : handleCOD}
                    disabled={loading || (paymentMethod === 'razorpay' && !scriptLoaded)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      paymentMethod === 'razorpay' ? 'INITIALIZE SECURE PAYMENT' : 'PLACE CASH ORDER'
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar / Order Summary */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 space-y-8">
              <Card className="border-none shadow-xl overflow-hidden bg-white rounded-3xl">
                <CardContent className="p-0">
                  <div className="p-8 border-b bg-stone-50/70">
                    <h2 className="font-serif font-bold text-xl text-stone-900 flex items-center justify-between">
                      Order Details
                      <span className="text-[10px] font-bold tracking-widest bg-stone-200 text-stone-600 px-3 py-1.5 rounded-full uppercase">{cartCount} items</span>
                    </h2>
                  </div>

                  <div className="p-8 space-y-6 max-h-[380px] overflow-y-auto custom-scrollbar">
                    {cart.map((item) => {
                      const price = item.product.base_price + (item.variant.price_adjustment || 0);
                      return (
                        <div key={item.id} className="flex gap-5 group">
                          <div className="h-24 w-20 bg-stone-50 rounded-2xl overflow-hidden relative flex-shrink-0 border border-stone-100 transition-transform group-hover:scale-105 duration-500 shadow-sm">
                            {item.product.product_images && item.product.product_images[0] ? (
                              <Image src={item.product.product_images[0].image_url} alt={item.product.name} fill className="object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-stone-200">
                                <ShoppingBag className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-center">
                            <h4 className="font-bold text-sm text-stone-900 leading-tight mb-1.5 line-clamp-2">{item.product.name}</h4>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-50 px-2 py-0.5 rounded border border-stone-100">{item.variant.size}</span>
                              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Qty: {item.quantity}</span>
                            </div>
                            <p className="font-bold text-base text-stone-900">{formatPrice(price * item.quantity)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Coupon Area */}
                  <div className="p-8 bg-stone-50/50 border-t border-b border-dashed border-stone-200">
                    {!appliedCoupon ? (
                      <div className="flex gap-3">
                        <Input
                          placeholder="OFFER CODE"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="uppercase font-bold text-[10px] tracking-[0.2em] h-12 rounded-xl bg-white border-stone-200 focus:border-deep-forest focus:ring-0 px-4"
                        />
                        <Button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode}
                          variant="secondary"
                          size="sm"
                          className="bg-stone-900 text-white hover:bg-black font-bold text-[10px] h-12 px-6 rounded-xl tracking-widest"
                        >
                          {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'APPLY'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center bg-green-50/80 p-4 rounded-xl border border-green-100 shadow-inner">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                          <div>
                            <p className="text-[10px] font-bold text-green-800 tracking-[0.1em] uppercase">Discount Applied</p>
                            <p className="text-sm font-bold text-green-700">-{formatPrice(discount)} ({appliedCoupon.code})</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="h-9 w-9 p-0 text-green-700 hover:bg-green-100 rounded-full">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-8 space-y-5">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold uppercase text-[10px] tracking-[0.15em]">Subtotal</span>
                      <span className="font-bold text-stone-900">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400 font-bold uppercase text-[10px] tracking-[0.15em]">Delivery</span>
                      <span className={cn("font-bold transition-colors", shipping === 0 ? "text-green-600" : "text-stone-900")}>
                        {shipping === 0 ? 'COMPLIMENTARY' : formatPrice(shipping)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-bold uppercase text-[10px] tracking-[0.15em]">Coupon Savings</span>
                        <span className="font-bold text-green-600">- {formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="border-t-2 border-stone-50 pt-6 flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-stone-400 font-bold uppercase text-[11px] tracking-[0.2em] mb-1">Total Amount</span>
                        <span className="text-3xl font-serif font-bold text-stone-900">{formatPrice(total)}</span>
                      </div>
                      <div className="text-[10px] text-stone-300 font-bold uppercase text-right leading-tight max-w-[80px]">
                        Inclusive of<br />all taxes
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secure Trust Badges */}
              <div className="flex flex-col items-center gap-6 px-4">
                <div className="flex items-center gap-3 text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] bg-stone-100 px-4 py-2 rounded-full">
                  <ShieldCheck className="h-4 w-4 text-stone-300" />
                  Verified Luxury Store
                </div>
                <div className="flex gap-8 opacity-20 hover:opacity-40 transition-opacity">
                  <CreditCard className="h-8 w-8" />
                  <ShoppingBag className="h-8 w-8" />
                  <ShieldCheck className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address Selection Modal */}
      <AnimatePresence>
        {showAddressModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto relative no-scrollbar"
            >
              <Button variant="ghost" size="icon" onClick={() => setShowAddressModal(false)} className="absolute top-6 right-6 rounded-full hover:bg-stone-50 h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
              <div className="mb-8">
                <h3 className="text-3xl font-serif font-bold text-stone-900">Saved Addresses</h3>
                <p className="text-stone-400 text-sm mt-1 uppercase tracking-widest font-bold">Pick a shipping destination</p>
              </div>

              <div className="grid gap-5">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={cn(
                      "group border-2 p-6 rounded-3xl cursor-pointer transition-all duration-500",
                      address.id === addr.id ? "border-deep-forest bg-deep-forest/5 shadow-inner" : "border-stone-50 hover:border-stone-200 bg-stone-50/30"
                    )}
                    onClick={() => handleSelectAddress(addr)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-lg font-bold text-stone-900">{addr.full_name}</p>
                      {addr.is_default && <span className="text-[10px] font-bold uppercase tracking-widest bg-deep-forest text-white px-3 py-1 rounded-full shadow-lg shadow-deep-forest/20">Default</span>}
                    </div>
                    <p className="text-base text-stone-500 leading-relaxed font-medium">{addr.address_line1}, {addr.city}</p>
                    <p className="text-sm text-stone-400 leading-relaxed">{addr.state} - {addr.postal_code}</p>

                    <div className={cn(
                      "mt-5 flex items-center gap-2 text-deep-forest text-xs font-bold transition-all duration-500",
                      address.id === addr.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
                    )}>
                      {address.id === addr.id ? 'Currently Selected' : 'Use this address'}
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setShowAddressModal(false)}
                className="w-full mt-8 bg-stone-100 text-stone-500 hover:bg-stone-200 font-bold text-xs tracking-widest h-14 rounded-2xl"
              >
                CLOSE
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
