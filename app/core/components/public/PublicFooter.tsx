import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>&copy; {new Date().getFullYear()} Scholaroscope. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/login" className="font-semibold hover:text-slate-950">Sign in</Link>
          <Link href="/get-started" className="font-semibold hover:text-slate-950">Create workspace</Link>
        </div>
      </div>
    </footer>
  );
}
