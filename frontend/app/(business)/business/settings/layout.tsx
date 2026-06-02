/** Settings use the main app shell; sidebar mode switches via pathname. */
export default function BusinessSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="w-full min-w-0">{children}</div>;
}
