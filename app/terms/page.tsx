export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Terms & Conditions</h1>
      <div className="prose max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Acceptance of Terms</h2>
          <p>
            By accessing and using StyleHub, you accept and agree to be bound by the terms
            and provisions of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Use of the Website</h2>
          <p>
            You may use our website for lawful purposes only. You agree not to use the
            website in any way that could damage, disable, or impair the site.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Product Information</h2>
          <p>
            We strive to provide accurate product descriptions and pricing. However, we do
            not warrant that product descriptions or other content is accurate, complete,
            or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Pricing and Payment</h2>
          <p>
            All prices are in Indian Rupees (INR) and are subject to change without notice.
            Payment must be made at the time of purchase through our secure payment gateway.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Limitation of Liability</h2>
          <p>
            StyleHub shall not be liable for any indirect, incidental, special,
            consequential or punitive damages resulting from your use of the website or
            products.
          </p>
        </section>
      </div>
    </div>
  );
}
