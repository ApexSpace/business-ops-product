export function BusinessProfileSectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <h3 className="border-b pb-2 text-sm font-medium text-foreground">
      {children}
    </h3>
  );
}
