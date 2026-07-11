'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { PublicThemeToggle } from '@/app/components/theme/PublicThemeToggle';

const navItems = [
  { href: '#how-it-works', label: 'Workflow' },
  { href: '#features', label: 'Capabilities' },
  { href: '#audiences', label: 'Use cases' },
  { href: '/get-started', label: 'Pricing' },
];

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b transition ${
        scrolled ? 'border-slate-200 bg-white/95 shadow-sm backdrop-blur' : 'border-transparent bg-white/80 backdrop-blur'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1220px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-950">
          Scholaroscope
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Public navigation">
          {navItems.map((item) => (
            item.href.startsWith('/') ? (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-slate-600 hover:text-slate-950">
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="text-sm font-medium text-slate-600 hover:text-slate-950">
                {item.label}
              </a>
            )
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <PublicThemeToggle />
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Link
            href="/get-started"
            className="inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 text-slate-800 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav className="mx-auto grid max-w-[1220px] gap-2" aria-label="Mobile public navigation">
            {navItems.map((item) => (
              item.href.startsWith('/') ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              )
            ))}
            <Link
              href="/login"
              className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={() => setMenuOpen(false)}
            >
              Sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
