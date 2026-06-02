/**
 * Contact workspace fills the main column below the topbar (flex-1, no page scroll).
 */
export default function ContactWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
