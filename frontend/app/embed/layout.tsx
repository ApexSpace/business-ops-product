export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh overflow-x-hidden bg-background">
      <main className="w-full p-0 pb-[env(safe-area-inset-bottom)] sm:p-2">
        {children}
      </main>
    </div>
  );
}
