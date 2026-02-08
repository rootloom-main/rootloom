export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold mb-3">Information We Collect</h2>
          <p>
            We collect information you provide directly to us, including your name, email
            address, phone number, shipping address, and payment information when you make
            a purchase.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Process and fulfill your orders</li>
            <li>Send you order confirmations and updates</li>
            <li>Respond to your comments and questions</li>
            <li>Improve our products and services</li>
            <li>Send you marketing communications (with your consent)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Information Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your
            personal information against unauthorized access, alteration, disclosure, or
            destruction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at
            privacy@rootandloom.com
          </p>
        </section>
      </div>
    </div>
  );
}
