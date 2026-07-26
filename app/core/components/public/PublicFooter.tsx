export function PublicFooter() {
  return (
    <footer className="border-t theme-border theme-surface">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-4 px-4 py-8 text-sm theme-muted sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p>&copy; {new Date().getFullYear()} Scholaroscope. All rights reserved.</p>
      </div>
    </footer>
  );
}
