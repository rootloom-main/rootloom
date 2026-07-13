import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { sendOrderConfirmationWhatsApp } from '@/lib/whatsapp';
import { validateCouponLogic } from '@/lib/coupon';
import { recordOpsEvent } from '@/lib/ops-events';
import { getPaymentProvider } from '@/lib/payments/providers';
import type { CheckoutItem, PaymentVerificationInput } from '@/lib/payments/types';

const ORDER_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;

type BuyNowItem = {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
  name: string;
  image?: string;
  size?: string;
  color?: string;
};

type StartCheckoutInput = {
  user: User;
  addressId?: string;
  selectedItemIds?: string[];
  couponCode?: string;
  orderId?: string;
  checkoutSource?: 'BUY_NOW' | 'CART';
  buyNowItem?: BuyNowItem;
};

type FinalizeInput = PaymentVerificationInput & {
  userId?: string;
  source: 'browser' | 'webhook';
};

function normalizeBuyNowItem(item: BuyNowItem | undefined): BuyNowItem {
  if (!item || typeof item !== 'object') {
    throw new Error('Buy Now item is required');
  }

  const quantity = Number(item.quantity);
  if (
    !item.productId ||
    !item.variantId ||
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    throw new Error('Invalid Buy Now item');
  }

  return {
    ...item,
    quantity,
  };
}

function uniqueIds(ids: Array<string | undefined | null>) {
  return [...new Set(ids.filter(Boolean) as string[])];
}

function isMissingRpcSignature(error: any) {
  const message = String(error?.message || error?.details || error?.hint || '');
  return (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    message.includes('Could not find the function') ||
    message.includes('function public.finalize_paid_order') ||
    message.includes('function finalize_paid_order')
  );
}

function createOrderNumber() {
  return `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function ensurePendingOrder(order: any, userId?: string) {
  if (!order) {
    throw new Error('Order not found');
  }

  if (userId && order.user_id !== userId) {
    throw new Error('Order not found');
  }

  if (order.payment_status === 'completed') {
    throw new Error('This order has already been paid.');
  }

  if (order.status === 'cancelled') {
    throw new Error('This order has been cancelled.');
  }

  if (Date.now() - new Date(order.created_at).getTime() > ORDER_PAYMENT_TTL_MS) {
    throw new Error('This order has expired.');
  }
}

async function getUserPhone(supabase: SupabaseClient, user: User) {
  if (user.user_metadata?.phone) {
    return user.user_metadata.phone;
  }

  const { data } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .single();

  return (data as any)?.phone || null;
}

async function loadCartItems(supabase: SupabaseClient, userId: string, selectedItemIds?: string[]) {
  let query = supabase
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      variant_id,
      product:products!inner(name, base_price),
      variant:product_variants!inner(price_adjustment, stock, reserved_quantity)
    `)
    .eq('user_id', userId)
    .is('products.deleted_at', null);

  if (selectedItemIds?.length) {
    query = query.in('id', selectedItemIds);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  if (!data?.length) {
    throw new Error('No selected items found in cart');
  }

  return data.map((item: any) => {
    const product = Array.isArray(item.product) ? item.product[0] : item.product;
    const variant = Array.isArray(item.variant) ? item.variant[0] : item.variant;
    const availableStock = Number(variant?.stock || 0) - Number(variant?.reserved_quantity || 0);

    if (!variant || availableStock < item.quantity) {
      throw new Error(`Not enough stock for ${product?.name || 'item'}. Only ${availableStock || 0} left.`);
    }

    return {
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: Number(product?.base_price || 0) + Number(variant?.price_adjustment || 0),
      name: product?.name || 'Product',
    };
  }) as CheckoutItem[];
}

async function loadBuyNowItems(supabase: SupabaseClient, buyNowItemInput: BuyNowItem): Promise<CheckoutItem[]> {
  const buyNowItem = normalizeBuyNowItem(buyNowItemInput);
  const { data: variant, error } = await supabase
    .from('product_variants')
    .select('id, price_adjustment, stock, reserved_quantity, product:products!inner(id, name, base_price)')
    .eq('id', buyNowItem.variantId)
    .is('products.deleted_at', null)
    .single();

  if (error || !variant) {
    throw new Error('Product variant not found or unavailable');
  }

  const product = Array.isArray(variant.product) ? variant.product[0] : variant.product;
  if ((product as any)?.id !== buyNowItem.productId) {
    throw new Error('Buy Now item does not match the selected product');
  }

  const availableStock = Number((variant as any).stock || 0) - Number((variant as any).reserved_quantity || 0);

  if (availableStock < buyNowItem.quantity) {
    throw new Error(`Not enough stock. Only ${availableStock} left.`);
  }

  const price = Number((product as any)?.base_price || 0) + Number((variant as any).price_adjustment || 0);

  return [{
    product_id: (product as any).id,
    variant_id: buyNowItem.variantId,
    quantity: buyNowItem.quantity,
    price,
    name: (product as any)?.name || buyNowItem.name || 'Product',
  }];
}

async function createPendingOrder(
  supabase: SupabaseClient,
  input: {
    userId: string;
    addressId: string;
    items: CheckoutItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
    discountAmount: number;
    couponCode: string | null;
  }
) {
  const { data, error } = await supabase.rpc('create_pending_checkout_order', {
    p_user_id: input.userId,
    p_order_number: createOrderNumber(),
    p_subtotal: input.subtotal,
    p_shipping_cost: input.shippingCost,
    p_total: input.total,
    p_discount_amount: input.discountAmount,
    p_coupon_code: input.couponCode,
    p_shipping_address_id: input.addressId,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      price: item.price,
    })),
  } as any);

  if (error) {
    throw error;
  }

  return data as { id: string; order_number: string };
}

async function loadOrderWithItems(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      shipping_address:addresses(*),
      order_items(
        *,
        product:products(name),
        variant:product_variants(size, color)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    throw error;
  }

  return data as any;
}

async function sendPaidOrderNotifications(supabase: SupabaseClient, orderId: string, user: User) {
  const order = await loadOrderWithItems(supabase, orderId);
  const { data: claimedNotification } = await supabase
    .from('orders')
    .update({ payment_notified_at: new Date().toISOString() } as any)
    .eq('id', orderId)
    .is('payment_notified_at', null as any)
    .select('id')
    .maybeSingle();

  if (!claimedNotification) {
    return;
  }

  const items = (order.order_items || []).map((item: any) => ({
    name: item.product?.name || 'Product',
    quantity: item.quantity,
    price: (Number(item.price) * Number(item.quantity)).toFixed(2),
  }));

  await sendOrderConfirmationEmail({
    orderNumber: order.order_number,
    customerName: user.user_metadata?.full_name || 'Customer',
    customerEmail: user.email || '',
    totalAmount: Number(order.total).toFixed(2),
    items,
  }).catch((error) => console.error('[Payments] Failed to send order email', error));

  const phone = await getUserPhone(supabase, user);
  if (phone) {
    await sendOrderConfirmationWhatsApp(
      phone,
      user.user_metadata?.full_name || 'Customer',
      order.order_number,
      Number(order.total).toFixed(2),
      false
    ).catch((error) => console.error('[Payments] Failed to send WhatsApp', error));
  }

}

async function cleanupPurchasedCartItems(
  supabase: SupabaseClient,
  input: {
    userId: string;
    cartItemIds: string[];
    productIds: string[];
    variantIds: string[];
  }
) {
  const deletedIds = new Set<string>();

  if (input.cartItemIds.length > 0) {
    const { data, error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', input.userId)
      .in('id', input.cartItemIds)
      .select('id');

    if (error) throw error;
    (data || []).forEach((item: any) => deletedIds.add(item.id));
  }

  if (input.variantIds.length > 0) {
    const { data, error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', input.userId)
      .in('variant_id', input.variantIds)
      .select('id');

    if (error) throw error;
    (data || []).forEach((item: any) => deletedIds.add(item.id));
  }

  if (input.productIds.length > 0) {
    const { data, error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', input.userId)
      .in('product_id', input.productIds)
      .select('id');

    if (error) throw error;
    (data || []).forEach((item: any) => deletedIds.add(item.id));
  }

  return deletedIds.size;
}

export class PaymentService {
  constructor(private readonly supabase: SupabaseClient) {}

  async startCheckout(input: StartCheckoutInput) {
    const provider = getPaymentProvider();

    let order: { id: string; order_number: string; total: number; user_id: string; created_at: string; payment_status: string; status: string };
    let cartItemIds: string[] = [];
    let purchasedProductIds: string[] = [];
    let purchasedVariantIds: string[] = [];
    let createdNewOrder = false;

    if (input.orderId) {
      const existingOrder = await loadOrderWithItems(this.supabase, input.orderId);
      ensurePendingOrder(existingOrder, input.user.id);
      order = existingOrder;
      purchasedProductIds = uniqueIds((existingOrder.order_items || []).map((item: any) => item.product_id));
      purchasedVariantIds = uniqueIds((existingOrder.order_items || []).map((item: any) => item.variant_id));
    } else {
      if (!input.addressId) {
        throw new Error('Address is required');
      }

      // Verify shipping address ownership
      const { data: address, error: addressError } = await this.supabase
        .from('addresses')
        .select('id')
        .eq('id', input.addressId)
        .eq('user_id', input.user.id)
        .single();

      if (addressError || !address) {
        throw new Error('Shipping address does not belong to user');
      }

      const isBuyNow = input.checkoutSource === 'BUY_NOW';
      const buyNowItem = isBuyNow ? normalizeBuyNowItem(input.buyNowItem) : undefined;

      const items = isBuyNow
        ? await loadBuyNowItems(this.supabase, buyNowItem!)
        : await loadCartItems(this.supabase, input.user.id, input.selectedItemIds);
      cartItemIds = isBuyNow ? [] : (items.map((item) => item.id).filter(Boolean) as string[]);
      purchasedProductIds = uniqueIds(items.map((item) => item.product_id));
      purchasedVariantIds = uniqueIds(items.map((item) => item.variant_id));

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingCost = subtotal > 999 ? 0 : 50;
      let discountAmount = 0;
      let validCouponCode: string | null = null;

      if (input.couponCode) {
        const couponResult = await validateCouponLogic(this.supabase as any, input.couponCode, subtotal, {
          userId: input.user.id,
        });

        if (!couponResult.success) {
          throw new Error(couponResult.message);
        }

        discountAmount = couponResult.discountAmount || 0;
        validCouponCode = couponResult.couponCode || input.couponCode;
      }

      const pendingOrder = await createPendingOrder(this.supabase, {
        userId: input.user.id,
        addressId: input.addressId,
        items,
        subtotal,
        shippingCost,
        total: Math.round(Math.max(0, subtotal + shippingCost - discountAmount)),
        discountAmount,
        couponCode: validCouponCode,
      });

      order = {
        id: pendingOrder.id,
        order_number: pendingOrder.order_number,
        total: Math.round(Math.max(0, subtotal + shippingCost - discountAmount)),
        user_id: input.user.id,
        created_at: new Date().toISOString(),
        payment_status: 'pending',
        status: 'pending',
      };
      createdNewOrder = true;
    }

    try {
      const providerOrder = await provider.createOrder({
        amount: Number(order.total),
        currency: 'INR',
        receipt: order.order_number,
        notes: {
          order_id: order.id,
          user_id: input.user.id,
        },
      });

      const { error: paymentError } = await this.supabase.from('payments' as any).insert({
        user_id: input.user.id,
        order_id: order.id,
        provider: providerOrder.provider,
        razorpay_order_id: providerOrder.providerOrderId,
        provider_order_id: providerOrder.providerOrderId,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
        status: 'pending',
        cart_snapshot: [],
        address_id: (order as any).shipping_address_id || input.addressId || null,
        coupon_code: (order as any).coupon_code || input.couponCode || null,
        metadata: {
          cart_item_ids: cartItemIds,
          checkout_source: input.checkoutSource || 'CART',
          purchased_product_ids: purchasedProductIds,
          purchased_variant_ids: purchasedVariantIds,
          order_number: order.order_number,
        },
      } as any);

      if (paymentError) {
        throw paymentError;
      }

      // Record operational event in the background (non-blocking)
      recordOpsEvent({
        eventType: 'payment.checkout_started',
        status: 'success',
        userId: input.user.id,
        orderId: order.id,
        paymentId: providerOrder.providerOrderId,
      }).catch((err) => console.error('Failed to log checkout event in background:', err));

      const contact = input.user.user_metadata?.phone || null;

      return {
        orderId: order.id,
        orderNumber: order.order_number,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
        provider: providerOrder.provider,
        providerOrderId: providerOrder.providerOrderId,
        publicKey: 'getCheckoutPublicKey' in provider ? provider.getCheckoutPublicKey() : '',
        customer: {
          name: input.user.user_metadata?.full_name || 'Customer',
          email: input.user.email || '',
          contact,
        },
      };
    } catch (error) {
      if (createdNewOrder) {
        await this.supabase.from('order_items').delete().eq('order_id', order.id);
        await this.supabase
          .from('orders')
          .delete()
          .eq('id', order.id)
          .eq('payment_status', 'pending')
          .eq('status', 'pending');
      }
      throw error;
    }
  }

  async finalizePayment(input: FinalizeInput) {
    const provider = getPaymentProvider();
    if (input.source === 'browser' && !input.signature) {
      throw new Error('Payment signature is required');
    }
    const verified = await provider.verifyPayment(input);

    const { data: payment, error } = await this.supabase
      .from('payments' as any)
      .select('*')
      .eq('razorpay_order_id', verified.providerOrderId)
      .single();

    if (error || !payment) {
      throw new Error('Payment attempt not found');
    }

    if (input.userId && payment.user_id !== input.userId) {
      throw new Error('Payment attempt not found');
    }

    if (verified.amount !== -1 && (Number(payment.amount) !== Number(verified.amount) || payment.currency !== verified.currency)) {
      throw new Error('Payment amount mismatch');
    }

    if (!['captured', 'authorized'].includes(verified.status)) {
      throw new Error('Payment has not been completed');
    }

    const cartItemIds = uniqueIds((payment.metadata?.cart_item_ids || []) as string[]);
    const purchasedProductIds = uniqueIds((payment.metadata?.purchased_product_ids || []) as string[]);
    const purchasedVariantIds = uniqueIds((payment.metadata?.purchased_variant_ids || []) as string[]);

    let order: any;
    const { data: atomicOrder, error: finalizeError } = await this.supabase.rpc('finalize_paid_order', {
      p_order_id: payment.order_id,
      p_provider_order_id: verified.providerOrderId,
      p_provider_payment_id: verified.providerPaymentId,
      p_user_id: payment.user_id,
      p_cart_item_ids: cartItemIds,
      p_purchased_product_ids: purchasedProductIds,
      p_purchased_variant_ids: purchasedVariantIds,
    } as any);

    if (finalizeError) {
      if (!isMissingRpcSignature(finalizeError)) {
        throw finalizeError;
      }

      console.warn('[Payments] Falling back to legacy finalize_paid_order RPC signature. Apply the latest Supabase migrations to restore atomic cart cleanup.', finalizeError);
      const { data: legacyOrder, error: legacyFinalizeError } = await this.supabase.rpc('finalize_paid_order', {
        p_order_id: payment.order_id,
        p_provider_order_id: verified.providerOrderId,
        p_provider_payment_id: verified.providerPaymentId,
      } as any);

      if (legacyFinalizeError) {
        throw legacyFinalizeError;
      }

      order = legacyOrder;
      await cleanupPurchasedCartItems(this.supabase, {
        userId: payment.user_id,
        cartItemIds,
        productIds: purchasedProductIds,
        variantIds: purchasedVariantIds,
      }).catch((cleanupError) => {
        console.error('[Payments] Legacy cart cleanup failed after successful payment finalization', cleanupError);
      });
    } else {
      order = atomicOrder;
    }

    await this.supabase
      .from('payments' as any)
      .update({
        status: 'success',
        provider_payment_id: verified.providerPaymentId,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(payment.metadata || {}),
          finalized_by: input.source,
          provider_status: verified.status,
        },
      } as any)
      .eq('id', payment.id);

    const finalizedOrder = Array.isArray(order) ? order[0] : order;

    const { data: orderUser } = await this.supabase.auth.admin.getUserById(payment.user_id);
    if (orderUser?.user) {
      // Send notifications in the background (non-blocking)
      sendPaidOrderNotifications(this.supabase, payment.order_id, orderUser.user)
        .catch((error) => console.error('[Payments] Failed to send order notification in background', error));
    }

    // Log operational events in the background (non-blocking)
    recordOpsEvent({
      eventType: 'payment.completed',
      status: 'success',
      userId: payment.user_id,
      orderId: payment.order_id,
      paymentId: verified.providerPaymentId,
      reference: verified.providerOrderId,
      metadata: { source: input.source },
    }).catch((error) => console.error('[Payments] Failed to record completed event in background', error));

    return {
      orderId: payment.order_id,
      orderNumber: finalizedOrder?.order_number || payment.metadata?.order_number,
    };
  }

  async recordFailure(input: {
    providerOrderId: string;
    providerPaymentId?: string | null;
    reason?: string | null;
    userId?: string;
  }) {
    const { data: payment } = await this.supabase
      .from('payments' as any)
      .select('*')
      .eq('razorpay_order_id', input.providerOrderId)
      .single();

    if (!payment || (input.userId && payment.user_id !== input.userId)) {
      return null;
    }

    await this.supabase.from('payment_attempts' as any).insert({
      order_id: payment.order_id,
      payment_id: payment.id,
      provider: payment.provider || 'razorpay',
      provider_order_id: input.providerOrderId,
      provider_payment_id: input.providerPaymentId || null,
      status: 'failed',
      reason: input.reason || 'payment_failed',
      metadata: {},
    } as any);

    await this.supabase
      .from('payments' as any)
      .update({
        status: 'failed',
        provider_payment_id: input.providerPaymentId || payment.provider_payment_id || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', payment.id)
      .eq('status', 'pending');

    await recordOpsEvent({
      eventType: 'payment.failed',
      status: 'failed',
      userId: payment.user_id,
      orderId: payment.order_id,
      paymentId: input.providerPaymentId || input.providerOrderId,
      metadata: { reason: input.reason || 'payment_failed' },
    });

    return { orderId: payment.order_id };
  }
}
