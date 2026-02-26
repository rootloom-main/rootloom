import Link from 'next/link';
import { Mail, MapPin, Phone, Instagram, Facebook, Twitter } from 'lucide-react';

export function Footer() {
  const footerLinks = {
    shop: [
      { name: 'All Products', href: '/shop' },
      { name: 'New Arrivals', href: '/shop?sort=newest' },
      { name: 'Best Sellers', href: '/shop?sort=bestsellers' },
      { name: 'Accessories', href: '/shop?category=accessories' },
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Careers', href: '/about' },
      { name: 'Press', href: '/about' },
    ],
    help: [
      { name: 'Track Order', href: '/account/orders' },
      { name: 'shipping Policy', href: '/shipping-policy' },
      { name: 'Returns & Exchanges', href: '/refund-policy' },
      { name: 'FAQ', href: '/contact' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms & Conditions', href: '/terms' },
      { name: 'Refund Policy', href: '/refund-policy' },
    ]
  };

  return (
    <footer className="border-t border-woven-sand bg-forest-ash text-ash-white font-sans">
      <div className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">

          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <Link href="/" className="block">
              <h3 className="font-serif text-3xl font-bold text-heirloom-white tracking-wide">ROOT & LOOM</h3>
            </Link>
            <p className="text-sm text-ash-white/70 leading-relaxed max-w-sm">
              Weaving tradition into modern luxury. Sustainable, ethical, and crafted for the contemporary journey.
              Join us in celebrating the art of slow fashion.
            </p>

            <div className="flex gap-4 pt-4">
              <a href="#" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-raw-clay transition-colors group">
                <Instagram className="h-5 w-5 text-ash-white group-hover:text-white" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-raw-clay transition-colors group">
                <Facebook className="h-5 w-5 text-ash-white group-hover:text-white" />
              </a>
              <a href="#" className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-raw-clay transition-colors group">
                <Twitter className="h-5 w-5 text-ash-white group-hover:text-white" />
              </a>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 text-sm text-ash-white/80">
                <Mail className="h-4 w-4 text-raw-clay" />
                <span>support@rootandloom.com</span>
              </div>
            </div>
          </div>

          {/* Shop Column */}
          <div>
            <h4 className="font-semibold text-heirloom-white mb-6 tracking-widest uppercase text-xs">Shop</h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white/70 hover:text-raw-clay transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-heirloom-white mb-6 tracking-widest uppercase text-xs">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white/70 hover:text-raw-clay transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help Column */}
          <div>
            <h4 className="font-semibold text-heirloom-white mb-6 tracking-widest uppercase text-xs">Support</h4>
            <ul className="space-y-3">
              {footerLinks.help.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-ash-white/70 hover:text-raw-clay transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-ash-white/50">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
            <p>&copy; {new Date().getFullYear()} Root & Loom. All rights reserved.</p>
            <div className="flex gap-4">
              {footerLinks.legal.map(link => (
                <Link key={link.name} href={link.href} className="hover:text-ash-white transition-colors">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Secure SSL Encryption
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
