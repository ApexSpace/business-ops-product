export function PublicPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">{children}</main>
    </div>
  );
}

export function PublicBookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#f8f9fb] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <main className="w-full max-w-6xl">{children}</main>
    </div>
  );
}
