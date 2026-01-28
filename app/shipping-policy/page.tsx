export default function ShippingPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Shipping Policy</h1>
      <div className="prose max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Shipping Methods</h2>
          <p>
            We offer standard shipping across India. Orders are typically processed within
            1-2 business days and delivered within 5-7 business days.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Shipping Charges</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Free shipping on orders above ₹999</li>
            <li>₹50 flat shipping fee for orders below ₹999</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Order Tracking</h2>
          <p>
            Once your order is shipped, you will receive a tracking number via email. You
            can track your order status in your account dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Delivery Time</h2>
          <p>
            Delivery times may vary based on your location. Metro cities typically receive
            orders faster than remote areas.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Shipping Restrictions</h2>
          <p>
            We currently ship only within India. International shipping is not available at
            this time.
          </p>
        </section>
      </div>
    </div>
  );
}
