/** Settings use the main app shell; sidebar mode switches via pathname. */
export default function BusinessSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">{children}</div>
  );
}
