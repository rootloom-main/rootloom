import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

export function Footer() {
  const footerLinks = {
    shop: [
      { name: 'Men', href: '/shop?category=men' },
      { name: 'Women', href: '/shop?category=women' },
      { name: 'Kids', href: '/shop?category=kids' },
      { name: 'Accessories', href: '/shop?category=accessories' },
    ],
    help: [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms & Conditions', href: '/terms' },
      { name: 'Shipping Policy', href: '/shipping-policy' },
      { name: 'Refund Policy', href: '/refund-policy' },
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Track Order', href: '/account/orders' },
    ],
  };

  return (
    <footer className="border-t border-woven-sand bg-forest-ash text-ash-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-heirloom-white">ROOT&LOOM</h3>
            <p className="text-sm text-ash-white/80">
              Your destination for premium fashion. Quality clothing for everyone.
            </p>
            <div className="flex gap-4">
              <Link
                href="https://facebook.com"
                target="_blank"
                className="text-ash-white hover:text-heirloom-white transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://instagram.com"
                target="_blank"
                className="text-ash-white hover:text-heirloom-white transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com"
                target="_blank"
                className="text-ash-white hover:text-heirloom-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://youtube.com"
                target="_blank"
                className="text-ash-white hover:text-heirloom-white transition-colors"
              >
                <Youtube className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-heirloom-white">Shop</h4>
            <ul className="space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white hover:text-heirloom-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-heirloom-white">Help</h4>
            <ul className="space-y-2">
              {footerLinks.help.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white hover:text-heirloom-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-heirloom-white">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white hover:text-heirloom-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-ash-white/10 text-center text-sm text-ash-white/60">
          <p>&copy; {new Date().getFullYear()} Root&Loom. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
