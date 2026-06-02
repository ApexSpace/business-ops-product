export function InstagramSetupChecklist() {
  return (
    <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-sm">
      <p className="font-medium text-foreground">
        No Instagram professional account found
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Make sure your Instagram account is professional and linked to a Facebook
        Page.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
        <li>Instagram must be a Professional account</li>
        <li>Instagram must be linked to a Facebook Page</li>
        <li>Select the correct Page during Meta login</li>
        <li>
          Grant <span className="font-mono text-foreground">instagram_basic</span>{" "}
          and{" "}
          <span className="font-mono text-foreground">
            instagram_manage_messages
          </span>
        </li>
      </ol>
    </div>
  );
}
