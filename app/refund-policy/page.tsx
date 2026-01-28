export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Refund Policy</h1>
      <div className="prose max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Return Window</h2>
          <p>
            We offer a 30-day return policy from the date of delivery. Items must be
            unused, unworn, and in their original condition with all tags attached.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Eligible Items</h2>
          <p>Most items can be returned except:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Intimate apparel and undergarments</li>
            <li>Sale or clearance items</li>
            <li>Items marked as final sale</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Return Process</h2>
          <p>To initiate a return:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Contact our customer service team</li>
            <li>Pack the item securely with original packaging</li>
            <li>Ship the item to our return address</li>
            <li>Wait for inspection and refund processing</li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Refund Processing</h2>
          <p>
            Once we receive and inspect your return, we will process your refund within
            5-7 business days. The refund will be credited to your original payment method.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Exchanges</h2>
          <p>
            We currently do not offer direct exchanges. Please return the item for a refund
            and place a new order for the desired item.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Return Shipping</h2>
          <p>
            Return shipping costs are the responsibility of the customer unless the item
            received was defective or incorrect.
          </p>
        </section>
      </div>
    </div>
  );
}
