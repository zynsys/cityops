import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Instagram, Facebook, Linkedin } from 'lucide-react';

const FOOTER_LINKS = {
  'Get Started': [
    { href: '/reports/new', label: 'Report a Problem' },
    { href: '/reports/mine', label: 'Your Reports' },
    { href: '/reports', label: 'Analytics' },
    { href: '/alerts', label: 'Local Alerts' },
  ],
  'Learn More': [
    { href: '/how-it-works', label: 'How it Works' },
    { href: '/councils', label: 'For Councils' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
  Resources: [
    { href: '/docs/api', label: 'API Documentation' },
    { href: '/help', label: 'Help Center' },
    { href: '/contact', label: 'Contact Support' },
    { href: '/press', label: 'Press Kit' },
  ],
  Community: [
    { href: '/blog', label: 'Blog' },
    { href: '/stories', label: 'Success Stories' },
    { href: '/contributing', label: 'Contributing' },
    { href: 'https://github.com', label: 'GitHub Repository' },
  ],
} as const;

const SOCIAL_LINKS = [
  { href: '#', label: 'Twitter', icon: Twitter },
  { href: '#', label: 'Instagram', icon: Instagram },
  { href: '#', label: 'Facebook', icon: Facebook },
  { href: '#', label: 'LinkedIn', icon: Linkedin },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#161F2F] text-[oklch(85%_0.01_260)]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr] lg:gap-14">
          {/* Branding column */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="CityOps" width={28} height={28} />
              <span className="text-xl font-bold text-white">CityOps</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed">
              Empowering communities to report and track local reports. Making cities more responsive, one report at a
              time.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <a key={social.label} href={social.href} aria-label={social.label} className="link-hover">
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links], index, arr) => (
            <div key={heading}>
              <h3 className="text-xl font-bold text-white">{heading}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm link-hover">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright strip */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-gray-500"></div>
        <div className="py-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-[oklch(55%_0.015_260)]">&copy; {currentYear} CityOps. All rights reserved.</p>
          <p className="text-sm text-[oklch(55%_0.015_260)] flex items-center gap-1">
            Developed by{' '}
            <a
              href="https://www.linkedin.com/in/prasadhonrao/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              Prasad Honrao
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
