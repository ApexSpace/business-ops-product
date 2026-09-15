export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-transparent has-[[data-trial-wizard]]:min-h-0">
      {children}
    </div>
  );
}
