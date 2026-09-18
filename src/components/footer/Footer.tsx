import Link from 'next/link';
import { Twitter, Instagram, Facebook, Linkedin } from 'lucide-react';
import { BrandMark } from '@/components/header/BrandMark';

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
    <footer className="border-t border-border bg-section-alt text-muted-foreground">
      <div className="section-shell py-12 sm:py-14">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4 xl:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
          {/* Branding column */}
          <div className="col-span-2 lg:col-span-4 xl:col-span-1">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-xl">
              <BrandMark />
              <span className="font-heading text-xl font-bold tracking-tight text-foreground">CityOps</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              Helping communities report local issues and follow their progress. More responsive cities, one report at a
              time.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <social.icon className="size-4.5" strokeWidth={1.75} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading} className="min-w-0">
              <h2 className="text-xs font-semibold tracking-wider text-foreground uppercase">{heading}</h2>
              <ul className="mt-3 space-y-0.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 items-center rounded-md py-2 text-sm leading-relaxed transition-colors hover:text-foreground"
                    >
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
      <div className="section-shell">
        <div className="flex flex-col gap-2 border-t border-border py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {currentYear} CityOps. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Developed by{' '}
            <a
              href="https://www.linkedin.com/in/prasadhonrao/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md font-medium text-foreground underline-offset-4 hover:underline"
            >
              Prasad Honrao
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
