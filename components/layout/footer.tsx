import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';

export function Footer() {
  const footerLinks = {
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact Us', href: '/contact' },
      // { name: 'Careers', href: '/about' }, // Future
    ],
    help: [
      { name: 'Track Order', href: '/account/orders' },
      { name: 'Shipping Policy', href: '/shipping-policy' },
      { name: 'Refund Policy', href: '/refund-policy' },
      { name: 'Returns & Exchanges', href: '/refund-policy' },
    ],
    legal: [ // "Show these according to major ecommerce websites"
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms & Conditions', href: '/terms' },
    ]
  };

  return (
    <footer className="border-t border-woven-sand bg-forest-ash text-ash-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="block">
              <h3 className="font-serif text-2xl font-bold text-heirloom-white tracking-wide">ROOT & LOOM</h3>
            </Link>
            <p className="text-sm text-ash-white/70 leading-relaxed max-w-xs">
              Weaving tradition into modern luxury. Sustainable, ethical, and crafted for the contemporary journey.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-ash-white/80">
                <Mail className="h-4 w-4" />
                <span>support@rootandloom.com</span>
              </div>
              {/* Placeholder for Phone/Address if needed later */}
            </div>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-heirloom-white mb-6 tracking-wide">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white/70 hover:text-heirloom-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Column */}
          <div>
            <h4 className="font-semibold text-heirloom-white mb-6 tracking-wide">Help & Support</h4>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white/70 hover:text-heirloom-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-heirloom-white mb-6 tracking-wide">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white/70 hover:text-heirloom-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-ash-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-ash-white/50">
          <p>&copy; {new Date().getFullYear()} Root & Loom. All rights reserved.</p>
          <div className="flex gap-6 items-center">
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-heirloom-white/80">v1.1</span>
            {/* Payment Icons Placeholder text for now */}
            <span>Secure Payments</span>
            <span>SSL Encrypted</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
