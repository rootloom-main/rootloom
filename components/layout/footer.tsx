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
      { name: 'Shipping Policy', href: '/legal/shipping' },
      { name: 'Returns & Exchanges', href: '/legal/refund' },
      { name: 'FAQ', href: '/contact' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/legal/privacy' },
      { name: 'Terms & Conditions', href: '/legal/terms' },
      { name: 'Refund Policy', href: '/legal/refund' },
      { name: 'Shipping Policy', href: '/legal/shipping' },
      { name: 'Cookie Policy', href: '/legal/cookies' },
    ]
  };

  return (
    <footer className="border-t border-woven-sand bg-forest-ash text-ash-white font-sans">
      <div className="container mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 md:gap-12 lg:gap-8">

          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <Link href="/" className="block">
              <h3 className="font-serif text-2xl md:text-3xl font-bold text-heirloom-white tracking-wide">ROOT & LOOM</h3>
            </Link>
            <p className="text-sm text-ash-white/90 leading-relaxed max-w-sm">
                Redefining the urban wardrobe. Bold fits, premium drip, and street-ready energy for the next generation.
            </p>

            <div className="flex gap-4 pt-2">
              <a href="https://www.instagram.com/rootloom.in/" target="_blank" rel="noopener noreferrer" className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-raw-clay transition-colors group" aria-label="Instagram">
                <Instagram className="h-5 w-5 md:h-6 md:w-6 text-ash-white group-hover:text-white" />
              </a>
              <a href="https://www.facebook.com/share/1D1ZrHGpBb/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-raw-clay transition-colors group" aria-label="Facebook">
                <Facebook className="h-5 w-5 md:h-6 md:w-6 text-ash-white group-hover:text-white" />
              </a>
              <a href="https://wa.me/919913555532" target="_blank" rel="noopener noreferrer" className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-raw-clay transition-colors group" aria-label="WhatsApp">
                <Phone className="h-5 w-5 md:h-6 md:w-6 text-ash-white group-hover:text-white" />
              </a>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-3 text-xs md:text-sm text-ash-white/90">
                <Mail className="h-4 w-4 text-raw-clay flex-shrink-0" />
                <a href="mailto:root@rootloom.in" className="hover:text-white transition-colors py-2">root@rootloom.in</a>
              </div>
              <div className="flex items-start gap-3 text-xs md:text-sm text-ash-white/90">
                <MapPin className="h-4 w-4 text-raw-clay flex-shrink-0 mt-0.5" />
                <span className="max-w-[250px] leading-relaxed">
                  Shri Ram Folding Works Shri Ram Industries park-3<br />
                  Shed 19 Near Vaishalinagar OPP Cozy Hotel Shahwadi<br />
                  Narol Ahmedabad 382405
                </span>
              </div>
            </div>
          </div>

          {/* Link Columns Wrapper for Mobile 2-cols */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-4 lg:contents">
            {/* Shop Column */}
            <div>
              <h4 className="font-semibold text-heirloom-white mb-4 md:mb-6 tracking-widest uppercase text-[10px] md:text-xs">Shop</h4>
              <ul className="space-y-3">
                {footerLinks.shop.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-xs md:text-sm text-ash-white/90 hover:text-raw-clay transition-colors duration-200 py-1.5 inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-semibold text-heirloom-white mb-4 md:mb-6 tracking-widest uppercase text-[10px] md:text-xs">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-xs md:text-sm text-ash-white/90 hover:text-raw-clay transition-colors duration-200 py-1.5 inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help Column */}
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-semibold text-heirloom-white mb-4 md:mb-6 tracking-widest uppercase text-[10px] md:text-xs">Support</h4>
              <ul className="space-y-3 grid grid-cols-2 md:grid-cols-1 gap-y-3 gap-x-8">
                {footerLinks.help.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-xs md:text-sm text-ash-white/90 hover:text-raw-clay transition-colors duration-200 py-1.5 inline-block"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 md:mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] md:text-xs text-ash-white/70 text-center md:text-left">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center">
            <p>&copy; {new Date().getFullYear()} Root & Loom. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {footerLinks.legal.map(link => (
                <Link key={link.name} href={link.href} className="hover:text-ash-white transition-colors py-2">
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
              Secure SSL Encryption
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
