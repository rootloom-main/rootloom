'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatPrice } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/supabase-auth-provider';
import { addAddress, updateAddress, getAddresses } from '@/lib/actions/address';
import { usePostHog } from 'posthog-js/react';

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

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartCount, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const posthog = usePostHog();

  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
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

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; id: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    // If cart is empty and not loading, redirect
    // But cart might be loading initially from provider. 
    // We can rely on cartCount === 0 check, but maybe wait for provider loading?
    // Provider `isLoading` is not exposed? It is.
    // But we don't have it here. `useCart` exposes `isLoading`.
    // Let's assume cartCount is accurate enough or handled by provider.
    if (cartCount === 0) {
      // router.push('/cart'); // Commenting out to avoid redirect loop if cart is just fetching
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    if (posthog && cartCount > 0) {
      posthog.capture('checkout_started', {
        cart_count: cartCount,
        value: cart.reduce((acc, item) => acc + (item.product.base_price + (item.variant.price_adjustment || 0)) * item.quantity, 0)
      });
    }

    return () => {
      document.body.removeChild(script);
    };
  }, [cartCount, posthog, cart]);

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Load saved address from session storage on mount
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
          // Pre-fill with default if no session address
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

  // Save address to session storage on change
  useEffect(() => {
    if (Object.values(address).some((val) => val !== '')) {
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

  const subtotal = cart.reduce((total, item) => {
    const price = item.product.base_price + (item.variant.price_adjustment || 0);
    return total + price * item.quantity;
  }, 0);

  const shipping = subtotal > 999 ? 0 : 50;
  const total = Math.max(0, subtotal + shipping - discount);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // If user types, we should probably clear the ID if it was from a saved address?
    // Or just treat it as an update to that address?
    // Let's keep the ID, so it updates the existing address if they selected one.
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const required = [
      'full_name',
      'phone',
      'address_line1',
      'city',
      'state',
      'postal_code',
    ];
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);

    // Import dynamically or use the imported action
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
      console.error("Coupon error", err);
      toast.error("Failed to apply coupon");
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setDiscount(0);
    setAppliedCoupon(null);
  };

  const saveOrUpdateAddress = async () => {
    if (address.id) {
      const res = await updateAddress(address.id, address);
      if (res.success && res.data) {
        return res.data;
      }
      // Fallback: if update fails (e.g. not found), try insert
      const addRes = await addAddress(address);
      if (addRes.success && addRes.data) {
        return addRes.data;
      }
    } else {
      const res = await addAddress(address);
      if (res.success && res.data) {
        return res.data;
      }
    }
    return null;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (!user) {
        sessionStorage.setItem('checkoutAddress', JSON.stringify(address));
        toast('Please login to continue', {
          description: 'We saved your details. You will be redirected back here.',
        });
        router.push('/auth/login?next=/checkout');
        return;
      }

      const savedAddress = await saveOrUpdateAddress();
      if (!savedAddress) {
        throw new Error('Failed to save address details');
      }

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

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Root&Loom',
        description: 'Purchase from Root&Loom',
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
                  price:
                    item.product.base_price + (item.variant.price_adjustment || 0),
                })),
                address_id: savedAddress.id,
                subtotal,
                shipping_cost: shipping,
                total,
                couponCode: appliedCoupon?.code,
                discountAmount: discount
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              if (posthog) {
                posthog.capture('order_completed', {
                  order_id: verifyData.orderId,
                  revenue: total,
                  currency: 'INR',
                  payment_method: 'Razorpay',
                  coupon_code: appliedCoupon?.code
                });
              }
              await clearCart();
              toast.success('Order placed successfully!');
              router.push(`/account/orders/${verifyData.orderId}`);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: address.full_name,
          email: user.email || '',
          contact: address.phone,
        },
        theme: {
          color: '#000000',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function (response: any) {
        toast.error('Payment failed. Please try again.');
        console.error('Payment failed:', response.error);
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCOD = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (!user) {
        sessionStorage.setItem('checkoutAddress', JSON.stringify(address));
        toast('Please login to continue', {
          description: 'We saved your details. You will be redirected back here.',
        });
        router.push('/auth/login?next=/checkout');
        return;
      }

      const savedAddress = await saveOrUpdateAddress();
      if (!savedAddress) {
        throw new Error('Failed to save address details');
      }

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
          subtotal,
          shipping_cost: shipping,
          total, // Client calculated total
          couponCode: appliedCoupon?.code, // Send coupon for server verification
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (posthog) {
          posthog.capture('order_completed', {
            order_id: data.orderId,
            revenue: total,
            currency: 'INR',
            payment_method: 'COD',
            coupon_code: appliedCoupon?.code
          });
        }
        await clearCart();
        toast.success('Order placed successfully!');
        router.push(`/account/orders/${data.orderId}`);
      } else {
        throw new Error(data.message || 'Failed to place order');
      }
    } catch (error: any) {
      console.error('COD Checkout error:', error);
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* ... Address Form ... */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Shipping Address</CardTitle>
                <div className="flex gap-2">
                  {savedAddresses.length > 0 && (
                    <Button variant="outline" size="sm" onClick={() => setShowAddressModal(true)}>
                      Select Saved Address
                    </Button>
                  )}
                  {(address.id || Object.values(address).some(v => v !== '' && v !== 'India')) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddress({
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
                        sessionStorage.removeItem('checkoutAddress');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Address Selection Modal */}
              {showAddressModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
                    <h3 className="text-lg font-bold mb-4">Select Address</h3>
                    <div className="space-y-3">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="border p-3 rounded cursor-pointer hover:bg-gray-50 flex justify-between items-start"
                          onClick={() => handleSelectAddress(addr)}
                        >
                          <div>
                            <p className="font-medium">{addr.full_name}</p>
                            <p className="text-sm text-gray-600">{addr.address_line1}, {addr.city}</p>
                          </div>
                          {addr.is_default && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>}
                        </div>
                      ))}
                    </div>
                    <Button className="mt-4 w-full" variant="outline" onClick={() => setShowAddressModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={address.full_name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={address.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address_line1">Address Line 1 *</Label>
                <Input
                  id="address_line1"
                  name="address_line1"
                  value={address.address_line1}
                  onChange={handleInputChange}
                  placeholder="House no., Building name"
                  autoComplete="address-line1"
                />
              </div>

              <div>
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  name="address_line2"
                  value={address.address_line2}
                  onChange={handleInputChange}
                  placeholder="Road name, Area, Colony"
                  autoComplete="address-line2"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    name="city"
                    value={address.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={address.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    autoComplete="address-level1"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code *</Label>
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={address.postal_code}
                    onChange={handleInputChange}
                    placeholder="PIN Code"
                    maxLength={6}
                    autoComplete="postal-code"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  value={address.country}
                  onChange={handleInputChange}
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cart.map((item) => {
                  const price =
                    item.product.base_price + (item.variant.price_adjustment || 0);
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.product.name} x {item.quantity}
                      </span>
                      <span>{formatPrice(price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>

                {/* Coupon Input */}
                <div className="pt-2 pb-2">
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Coupon Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="uppercase"
                      />
                      <Button onClick={handleApplyCoupon} disabled={couponLoading} variant="outline" size="sm">
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center bg-green-50 p-2 rounded text-sm text-green-700 border border-green-200">
                      <span>Coupon <b>{appliedCoupon.code}</b> applied</span>
                      <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="h-auto p-1 text-green-700 hover:text-green-800 hover:bg-green-100">
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>- {formatPrice(discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between font-semibold text-lg border-t pt-4">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePayment}
                disabled={loading || !scriptLoaded}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay with Razorpay'
                )}
              </Button>
              {/* ... rest of buttons ... */}
              <p className="text-xs text-gray-500 text-center">
                Secure payment powered by Razorpay
              </p>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={handleCOD}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Cash on Delivery'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
