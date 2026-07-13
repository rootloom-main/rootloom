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
import { Checkbox } from '@/components/ui/checkbox';
import { addAddress, updateAddress, getAddresses, deleteAddress, setDefaultAddress } from '@/lib/actions/address';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { PaymentMethodCard } from '@/components/checkout/payment-method-card';
import Link from 'next/link';
import { CheckoutProgressIndicator } from '@/components/checkout/checkout-progress-indicator';
import { openRazorpayCheckout } from '@/lib/payments/client';

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
  type?: string | null;
}

type CheckoutStep = 'address' | 'summary' | 'payment';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, cartCount, clearCart, selectedItemIds, refreshCart, isLoading, setCheckoutLocked } = useCart();
  const { user, loading: authLoading, openLoginModal } = useAuth();
  const rzpInstance = useRef<{ open: () => void; on: (event: string, callback: (response: any) => void) => void; close: () => void } | null>(null);

  // ── Checkout source: BUY_NOW vs CART ──────────────────────────────────
  const [checkoutSource, setCheckoutSource] = useState<'BUY_NOW' | 'CART'>('CART');
  const [isCheckoutSourceReady, setIsCheckoutSourceReady] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
    name: string;
    image: string;
    size: string;
    color: string;
  } | null>(null);

  // Filter cart to only selected items (used for CART source only)
  const selectedCart = useMemo(() =>
    cart.filter(item => selectedItemIds.includes(item.id)),
    [cart, selectedItemIds]
  );

  const [retryOrder, setRetryOrder] = useState<any>(null);
  const [retryOrderError, setRetryOrderError] = useState<string | null>(null);
  const retryOrderId = searchParams?.get('order_id');
  const isRetryCheckout = searchParams?.get('retry') === 'true';
  const recoveredVia = searchParams?.get('recovered_via');
  const retryCount = Number(searchParams?.get('retry_count') || '0');

  const displayItems = useMemo(() => {
    if (retryOrder) {
      return retryOrder.order_items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        price: Number(item.price),
        product: {
          name: item.product?.name || 'Product',
          product_images: item.product?.product_images || [],
        },
        variant: {
          size: item.variant?.size,
          color: item.variant?.color,
        }
      }));
    }
    // BUY_NOW: show only the single buy-now item
    if (checkoutSource === 'BUY_NOW' && buyNowItem) {
      return [{
        id: 'buy_now',
        quantity: buyNowItem.quantity,
        price: buyNowItem.price,
        product: {
          name: buyNowItem.name,
          product_images: buyNowItem.image ? [{ image_url: buyNowItem.image }] : [],
        },
        variant: {
          size: buyNowItem.size,
          color: buyNowItem.color,
        }
      }];
    }
    // CART: show selected cart items
    return selectedCart.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      price: getProductPrice(item.product, item.variant),
      product: {
        name: item.product?.name || 'Product',
        product_images: item.product?.product_images || [],
      },
      variant: {
        size: item.variant?.size,
        color: item.variant?.color,
      }
    }));
  }, [retryOrder, checkoutSource, buyNowItem, selectedCart]);

  const [loading, setLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'online_connecting' | 'cod_processing' | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('address');
  const [completedSteps, setCompletedSteps] = useState({
    address: false,
    summary: false,
  });

  const checkoutSnapshotRef = useRef<{
    selectedItemIds: string[];
    addressId: string | undefined;
    couponCode: string | undefined;
    subtotal: number;
    shipping: number;
    total: number;
  } | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(true);

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
  const [hasLoadedAddresses, setHasLoadedAddresses] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; id: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Totals — computed from the active source only
  const subtotal = useMemo(() => {
    if (checkoutSource === 'BUY_NOW' && buyNowItem) {
      return buyNowItem.price * buyNowItem.quantity;
    }
    return selectedCart.reduce((total, item) => {
      const price = getProductPrice(item.product, item.variant);
      return total + price * item.quantity;
    }, 0);
  }, [checkoutSource, buyNowItem, selectedCart]);

  const shipping = subtotal > 999 ? 0 : 50;
  const total = Math.round(Math.max(0, subtotal + shipping - discount));

  const selectedCount = checkoutSource === 'BUY_NOW' && buyNowItem
    ? buyNowItem.quantity
    : selectedCart.reduce((total, item) => total + item.quantity, 0);

  const displaySubtotal = retryOrder ? Number(retryOrder.subtotal) : subtotal;
  const displayShipping = retryOrder ? Number(retryOrder.shipping_cost) : shipping;
  const displayDiscount = retryOrder ? Number(retryOrder.discount_amount) : discount;
  const displayTotal = retryOrder ? Number(retryOrder.total) : total;
  const displayCount = retryOrder
    ? retryOrder.order_items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    : selectedCount;

  useEffect(() => {
    // Read Buy Now item from sessionStorage before locking checkout
    const source = searchParams?.get('source');
    const shouldLockCart = source !== 'BUY_NOW';
    if (source === 'BUY_NOW') {
      try {
        const stored = sessionStorage.getItem('rootloom_buy_now_item');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (
            !parsed?.productId ||
            !parsed?.variantId ||
            !Number.isFinite(Number(parsed?.quantity)) ||
            Number(parsed.quantity) <= 0 ||
            !Number.isFinite(Number(parsed?.price))
          ) {
            throw new Error('Invalid Buy Now item');
          }
          setBuyNowItem(parsed);
          setCheckoutSource('BUY_NOW');
          sessionStorage.removeItem('rootloom_buy_now_item');
        } else {
          // No item in storage — redirect back
          toast.error('Your Buy Now session expired. Please try again.');
          router.push('/cart');
          return;
        }
      } catch (e) {
        console.error('Failed to read Buy Now item', e);
        sessionStorage.removeItem('rootloom_buy_now_item');
        toast.error('Unable to start Buy Now checkout. Please try again.');
        router.push('/cart');
        return;
      }
    } else {
      setCheckoutSource('CART');
    }

    setIsCheckoutSourceReady(true);

    if (shouldLockCart) {
      setCheckoutLocked(true);
    }

    // Preload Razorpay SDK script in background
    import('@/lib/payments/client').then(({ loadRazorpaySdk }) => {
      loadRazorpaySdk().catch((err) => console.error('Failed to preload Razorpay SDK:', err));
    }).catch(() => {});

    return () => {
      if (shouldLockCart) {
        setCheckoutLocked(false);
      }
      if (rzpInstance.current) {
        try {
          rzpInstance.current.close();
        } catch (e) {
          console.error('Failed to close Razorpay instance on unmount:', e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      const currentUrl = window.location.pathname + window.location.search;
      openLoginModal(currentUrl, undefined, 'checkout');
    }
  }, [user, authLoading, openLoginModal]);

  // Guard: CART checkout with no items → redirect to cart
  // Guard: BUY_NOW with no buyNowItem is handled in the sessionStorage useEffect above
  useEffect(() => {
    if (!retryOrderId && isCheckoutSourceReady && !authLoading && !isLoading && user && !isProcessingPayment) {
      if (checkoutSource === 'CART' && selectedCount === 0) {
        router.push('/cart');
        toast.error('Please select items to checkout');
      }
    }
  }, [user, authLoading, isLoading, selectedCount, router, isProcessingPayment, retryOrderId, checkoutSource, isCheckoutSourceReady]);

  // Load saved addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (user && user.id !== loadedUserId) {
        const data = await getAddresses();
        if (data && data.length > 0) {
          setSavedAddresses(data);
          const defaultAddr = data.find((a: any) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
          setAddress(defaultAddr);
        } else {
          setIsAddingNewAddress(true);
          // Prefill from user profile / user metadata
          const profileName = user.user_metadata?.full_name || '';
          const profilePhone = user.phone || user.user_metadata?.phone || '';
          const cleanPhone = profilePhone.replace(/\D/g, '').slice(-10);
          setAddress(prev => ({
            ...prev,
            full_name: prev.full_name || profileName,
            phone: prev.phone || cleanPhone
          }));
        }
        setLoadedUserId(user.id);
        setHasLoadedAddresses(true);
      }
    };
    if (!authLoading && user && user.id !== loadedUserId) {
      fetchAddresses();
    }
  }, [user, authLoading, loadedUserId]);

  // Load retry order if ID is provided
  useEffect(() => {
    if (retryOrderId) {
      setLoading(true);
      (async () => {
        try {
          const { getOrderForRetry } = await import('./actions');
          const result = await getOrderForRetry(retryOrderId);
          if (result.success && result.order) {
            setRetryOrder(result.order);
            if (result.order.shipping_address) {
              setAddress({
                ...result.order.shipping_address,
                address_line2: result.order.shipping_address.address_line2 || ''
              });
              setSelectedAddressId(result.order.shipping_address.id);
            }
            setCompletedSteps({ address: true, summary: true });
            setCheckoutStep('payment');
          } else {
            setRetryOrderError(result.message || 'Failed to load order for retry');
          }
        } catch (e) {
          setRetryOrderError('Failed to load order details');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [retryOrderId]);

  useEffect(() => {
    const isCodRetry = searchParams?.get('cod') === 'true';
    if (!authLoading && user && hasLoadedAddresses && (retryOrderId || cartCount > 0)) {
      if (isCodRetry) {
        setPaymentMethod('cod');
      }
      if ((isRetryCheckout || isCodRetry) && address.id) {
        setCompletedSteps({ address: true, summary: true });
        setCheckoutStep('payment');
      }
    }
  }, [searchParams, authLoading, user, hasLoadedAddresses, cartCount, address.id, retryOrderId, isRetryCheckout]);

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
      return address;
    }
    if (address.id && isAddingNewAddress) {
      const res = await updateAddress(address.id, {
        ...address,
        type: address.type || 'Home',
        address_line2: address.address_line2 || '',
      });
      if (res.success && res.data) {
        setSavedAddresses(savedAddresses.map(a => a.id === address.id ? res.data : a));
        setIsAddingNewAddress(false);
        setSelectedAddressId(res.data.id);
        return res.data;
      }
      if (res.message) toast.error(res.message);
      return null;
    }
    const res = await addAddress({
      ...address,
      type: address.type || 'Home',
      address_line2: address.address_line2 || '',
    });
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
    if (savedAddr) {
      // Auto-save name and phone to user profile if checkbox is checked (only when adding/editing)
      if (isAddingNewAddress && saveToProfile) {
        try {
          const { updateProfile } = await import('@/lib/actions/profile');
          const pData = new FormData();
          pData.append('fullName', savedAddr.full_name);
          pData.append('phone', savedAddr.phone);
          await updateProfile(null, pData);
        } catch (err) {
          console.error('Failed to auto-save profile details:', err);
        }
      }

      setAddress(savedAddr);
      setCompletedSteps(prev => ({ ...prev, address: true }));
      setCheckoutStep('summary');
      toast.success('Delivery address saved');
    } else {
      toast.error('Failed to save address details');
    }
    setLoading(false);
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
      toast.error('Failed to apply coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleContinueSummary = () => {
    setCompletedSteps(prev => ({ ...prev, summary: true }));
    setCheckoutStep('payment');
  };

  const processPayment = async () => {
    if (!address.id) {
      setCheckoutStep('address');
      toast.error('Please choose a delivery address before payment.');
      return;
    }

    const checkoutSnapshot = {
      selectedItemIds: retryOrder
        ? retryOrder.order_items.map((item: any) => item.id)
        : checkoutSource === 'CART'
          ? selectedCart.map(item => item.id)
          : [],
      addressId: address.id,
      couponCode: retryOrder ? retryOrder.coupon_code : appliedCoupon?.code,
      subtotal: displaySubtotal,
      shipping: displayShipping,
      total: displayTotal,
    };
    checkoutSnapshotRef.current = checkoutSnapshot;

    if (paymentMethod === 'cod') {
      await handleCOD();
      return;
    }

    await handleOnlinePayment();
  };

  const handleOnlinePayment = async () => {
    setIsProcessingPayment(true);
    setProcessingStatus('online_connecting');

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItemIds: retryOrder ? undefined : (checkoutSource === 'CART' ? selectedCart.map(item => item.id) : undefined),
          addressId: retryOrder ? undefined : address.id,
          couponCode: retryOrder ? undefined : appliedCoupon?.code,
          orderId: retryOrderId || undefined,
          checkoutSource: checkoutSource,
          buyNowItem: checkoutSource === 'BUY_NOW' ? buyNowItem : undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      const checkout = data?.checkout;
      if (
        !response.ok ||
        !data?.success ||
        !checkout?.publicKey ||
        !checkout?.providerOrderId ||
        !checkout?.orderId ||
        !Number.isFinite(Number(checkout?.amount))
      ) {
        toast.error('Payment could not be started. Please try again.');
        setIsProcessingPayment(false);
        setProcessingStatus(null);
        return;
      }

      rzpInstance.current = await openRazorpayCheckout({
        key: checkout.publicKey,
        amount: Math.round(Number(checkout.amount) * 100),
        currency: checkout.currency,
        name: 'Root & Loom',
        description: `Order ${checkout.orderNumber}`,
        order_id: checkout.providerOrderId,
        prefill: {
          name: checkout.customer?.name,
          email: checkout.customer?.email,
          contact: address.phone || checkout.customer?.contact || undefined,
        },
        notes: {
          order_id: checkout.orderId,
        },
        theme: {
          color: '#1F2F26',
        },
        modal: {
          ondismiss: async () => {
            if (rzpInstance.current) {
              try { rzpInstance.current.close(); } catch (e) {}
            }
            await fetch('/api/payments/failure', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                providerOrderId: checkout.providerOrderId,
                reason: 'cancelled',
              }),
            });
            window.location.href = `/checkout/failed?order_id=${checkout.orderId}&reason=cancelled&message=${encodeURIComponent('Payment was cancelled by the user')}&amount=${checkout.amount}`;
          },
        },
        onPaymentFailed: async (failureResponse) => {
          if (rzpInstance.current) {
            try { rzpInstance.current.close(); } catch (e) {}
          }
          await fetch('/api/payments/failure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              providerOrderId: failureResponse?.error?.metadata?.order_id || checkout.providerOrderId,
              providerPaymentId: failureResponse?.error?.metadata?.payment_id || null,
              reason: failureResponse?.error?.reason || failureResponse?.error?.description || 'payment_failed',
            }),
          });
          const payId = failureResponse?.error?.metadata?.payment_id || '';
          const code = failureResponse?.error?.code || '';
          const msg = failureResponse?.error?.description || 'Payment failed';
          window.location.href = `/checkout/failed?order_id=${checkout.orderId}&payment_id=${payId}&code=${code}&reason=failed&message=${encodeURIComponent(msg)}&amount=${checkout.amount}`;
        },
        handler: async (paymentResponse) => {
          if (rzpInstance.current) {
            try { rzpInstance.current.close(); } catch (e) {}
          }
          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(paymentResponse),
            });
            const verifyData = await verifyResponse.json().catch(() => null);
            if (!verifyResponse.ok || !verifyData?.success || !verifyData?.order?.orderNumber) {
              window.location.href = `/checkout/failed?order_id=${checkout.orderId}&payment_id=${paymentResponse.razorpay_payment_id}&reason=verification_failed&message=${encodeURIComponent('Payment verification failed')}&amount=${checkout.amount}`;
              return;
            }

            // Save last_checkout telemetry metadata
            if (user) {
              const { createClient } = await import('@/lib/supabase/client');
              const supabaseClient = createClient();
              await supabaseClient
                .from('profiles')
                .update({ last_checkout: new Date().toISOString() })
                .eq('id', user.id);
            }

            refreshCart({ broadcast: true }).catch((error) => {
              console.error('Failed to refresh cart after online payment success:', error);
            });
            sessionStorage.removeItem('rootloom_buy_now_item');
            const successUrl = new URL('/checkout/success', window.location.origin);
            successUrl.searchParams.set('orderNumber', verifyData.order.orderNumber);
            window.location.href = successUrl.toString();
          } catch (e: any) {
            window.location.href = `/checkout/failed?order_id=${checkout.orderId}&reason=network_error&message=${encodeURIComponent(e.message || 'Network error during verification')}&amount=${checkout.amount}`;
          }
        },
      });
    } catch (error: any) {
      toast.error('Payment could not be started. Please try again.');
      setIsProcessingPayment(false);
      setProcessingStatus(null);
    }
  };

  const handleCOD = async () => {
    if (isProcessingPayment) {
      return;
    }

    setIsProcessingPayment(true);
    setProcessingStatus('cod_processing');
    try {
      const response = await fetch('/api/checkout/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedItemIds: checkoutSource === 'CART'
            ? (checkoutSnapshotRef.current?.selectedItemIds || selectedCart.map(item => item.id))
            : undefined,
          addressId: checkoutSnapshotRef.current?.addressId || address.id,
          subtotal: checkoutSnapshotRef.current?.subtotal || subtotal,
          shipping_cost: checkoutSnapshotRef.current?.shipping || shipping,
          total: checkoutSnapshotRef.current?.total || total,
          couponCode: checkoutSnapshotRef.current?.couponCode || appliedCoupon?.code,
          isPartialCheckout: true,
          orderId: retryOrderId || null,
          checkoutSource,
          buyNowItem: checkoutSource === 'BUY_NOW' ? buyNowItem : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Save last_checkout telemetry metadata
        if (user) {
          const { createClient } = await import('@/lib/supabase/client');
          const supabaseClient = createClient();
          await supabaseClient
            .from('profiles')
            .update({ last_checkout: new Date().toISOString() })
            .eq('id', user.id);
        }

        refreshCart({ broadcast: true }).catch((error) => {
          console.error('Failed to refresh cart after COD success:', error);
        });
        sessionStorage.removeItem('rootloom_buy_now_item');
        const successUrl = new URL('/checkout/success', window.location.origin);
        successUrl.searchParams.set('orderNumber', data.orderNumber);
        if (recoveredVia) {
          successUrl.searchParams.set('recovered_via', recoveredVia);
        }
        if (retryCount > 0) {
          successUrl.searchParams.set('retry_count', String(retryCount));
        }
        router.replace(`${successUrl.pathname}${successUrl.search}`);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order. Please try again.');
      setIsProcessingPayment(false);
      setProcessingStatus(null);
    }
  };

  if (retryOrderError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center space-y-4">
          <ShieldCheck className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-serif font-bold text-stone-900">Order Error</h1>
          <p className="text-stone-500 font-medium text-sm leading-relaxed">{retryOrderError}</p>
          <Button asChild className="w-full bg-deep-forest hover:bg-deep-forest/90 text-white font-bold rounded-xl h-12">
            <Link href="/account/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (authLoading || !user || loading || !isCheckoutSourceReady || (!retryOrderId && checkoutSource === 'CART' && selectedCount === 0 && !isProcessingPayment)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
        {!user && !authLoading && (
          <div className="text-center space-y-2">
            <p className="text-stone-600 font-medium">Please log in to continue checkout.</p>
            <Button onClick={() => openLoginModal(window.location.pathname + window.location.search, undefined, 'checkout')} className="bg-deep-forest text-white rounded-full">
              Open Login Window
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-stone-100 min-h-screen pb-20 pt-8">
      <div className="container max-w-5xl mx-auto px-4 mb-6">
        <CheckoutProgressIndicator currentStep={checkoutStep === 'payment' ? 'payment' : 'address'} />
      </div>
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
                <span className={cn("px-2 py-0.5 rounded text-sm font-bold shadow-sm transition-colors", checkoutStep === 'address' ? 'bg-white text-deep-forest' : 'bg-stone-200 text-stone-500')}>2</span>
                <h2 className={cn("font-bold font-serif uppercase tracking-widest text-sm flex items-center transition-colors", checkoutStep === 'address' ? 'text-white' : 'text-gray-500')}>
                  DELIVERY ADDRESS {completedSteps.address && <Check className="ml-2 h-4 w-4 text-green-600 font-bold" />}
                </h2>
              </div>
              {completedSteps.address && checkoutStep !== 'address' && (
                <Button disabled={isProcessingPayment} variant="ghost" size="sm" onClick={() => setCheckoutStep('address')} className="text-deep-forest font-bold uppercase text-xs tracking-wider border border-deep-forest/20 hover:bg-deep-forest/5">CHANGE</Button>
              )}
            </div>

            {checkoutStep === 'address' && (
              <div className="p-6 bg-white border-t border-stone-100">
                {!hasLoadedAddresses ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-28 bg-stone-50 border border-stone-100 rounded-xl flex items-center justify-center p-4 shadow-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-stone-400 mr-3" />
                      <span className="text-stone-500 text-sm font-medium">Fetching saved addresses...</span>
                    </div>
                  </div>
                ) : !isAddingNewAddress && savedAddresses.length > 0 ? (
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
                        setAddress({ full_name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '', country: 'India', is_default: false });
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
                      <div className="md:col-span-2 flex items-center space-x-2 mt-2">
                        <Checkbox 
                          id="save-to-profile" 
                          checked={saveToProfile} 
                          onCheckedChange={(checked) => setSaveToProfile(!!checked)}
                          className="h-4 w-4 border-stone-300 data-[state=checked]:bg-deep-forest data-[state=checked]:border-deep-forest"
                        />
                        <label htmlFor="save-to-profile" className="text-xs font-semibold text-stone-600 select-none cursor-pointer">
                          Save this information to my profile for faster future checkout
                        </label>
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
                <span className={cn("px-2 py-0.5 rounded text-sm font-bold shadow-sm transition-colors", checkoutStep === 'summary' ? 'bg-white text-deep-forest' : 'bg-stone-200 text-stone-500')}>3</span>
                <h2 className={cn("font-bold font-serif uppercase tracking-widest text-sm flex items-center transition-colors", checkoutStep === 'summary' ? 'text-white' : 'text-gray-500')}>
                  ORDER SUMMARY {completedSteps.summary && <Check className="ml-2 h-4 w-4 text-green-600 font-bold" />}
                </h2>
              </div>
              {completedSteps.summary && checkoutStep !== 'summary' && (
                <Button disabled={isProcessingPayment} variant="ghost" size="sm" onClick={() => setCheckoutStep('summary')} className="text-deep-forest font-bold uppercase text-xs tracking-wider border border-deep-forest/20 hover:bg-deep-forest/5">CHANGE</Button>
              )}
            </div>

            {checkoutStep === 'summary' && (
              <div className="bg-white border-t border-stone-100">
                <div className="divide-y divide-stone-100">
                  {displayItems.map((item: any) => (
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
                          <span className="font-bold text-xl text-stone-900">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Code */}
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
                    id="online"
                    title="UPI, Cards & Netbanking"
                    description="Pay securely online through our payment partner."
                    icon="online"
                    selected={paymentMethod === 'online'}
                    disabled={isProcessingPayment}
                    onSelect={() => !isProcessingPayment && setPaymentMethod('online')}
                  />

                  <PaymentMethodCard
                    id="cod"
                    title="Cash on Delivery"
                    description="Pay in cash or via UPI to the delivery executive when the order reaches your door."
                    icon="cod"
                    selected={paymentMethod === 'cod'}
                    disabled={isProcessingPayment}
                    onSelect={() => !isProcessingPayment && setPaymentMethod('cod')}
                  />
                </div>

                <div className="mt-8 border-t border-stone-100 pt-6">
                  <Button
                    onClick={processPayment}
                    disabled={isProcessingPayment || loading || !address.id}
                    className="bg-deep-forest hover:bg-deep-forest/90 text-white rounded-sm px-12 font-bold text-lg tracking-wide h-14 shadow-lg flex items-center w-full sm:w-auto justify-center"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      `PLACE ORDER & PAY ${formatPrice(displayTotal)}`
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
                <span>Price ({displayCount} {displayCount === 1 ? 'item' : 'items'})</span>
                <span>{formatPrice(displaySubtotal)}</span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-{formatPrice(displayDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-900 font-medium border-b border-dashed border-stone-200 pb-5">
                <span>Delivery Charges</span>
                <span className="text-green-600 font-bold">{displayShipping === 0 ? 'FREE' : formatPrice(displayShipping)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-stone-900 pt-1">
                <span>Total Payable</span>
                <span>{formatPrice(displayTotal)}</span>
              </div>
              {displayDiscount > 0 && (
                <div className="text-green-700 font-bold tracking-wide text-xs pt-3 mt-1 text-center bg-green-50 p-2 rounded">
                  Your Total Savings on this order {formatPrice(displayDiscount)}
                </div>
              )}
            </div>
            <div className="bg-stone-50 border-t border-stone-100 p-4 text-xs font-bold text-stone-500 uppercase tracking-widest flex items-center gap-2 justify-center">
              <ShieldCheck className="h-5 w-5 text-deep-forest" /> Safe and Secure Payments
            </div>
          </div>
        </div>

      </div>

      {/* Processing overlay — COD only */}
      {isProcessingPayment && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-6">
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
              <h2 className="text-xl font-serif font-bold text-stone-900">
                {processingStatus === 'online_connecting' ? 'Connecting securely...' : 'Placing Your Order...'}
              </h2>
              <p className="text-stone-500 text-sm leading-relaxed font-medium">
                Please wait. Do not refresh this page.
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
