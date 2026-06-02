"use client";

const META_APP_REVIEW_NOTES: Record<
  string,
  { title: string; purpose: string }[]
> = {
  whatsapp: [
    {
      title: "whatsapp_business_management",
      purpose:
        "Connect the customer WhatsApp Business Account and list phone numbers.",
    },
    {
      title: "whatsapp_business_messaging",
      purpose: "Send and receive customer WhatsApp messages.",
    },
    {
      title: "business_management",
      purpose: "Complete Embedded Signup and access WABA resources.",
    },
  ],
  facebook: [
    {
      title: "pages_show_list",
      purpose: "List Facebook Pages so the customer can choose which Page to use.",
    },
    {
      title: "pages_messaging",
      purpose: "Receive and respond to Facebook Page messages.",
    },
    {
      title: "pages_manage_metadata",
      purpose: "Read Page metadata for resource selection.",
    },
  ],
  instagram: [
    {
      title: "instagram_basic",
      purpose: "List Instagram professional accounts linked to Pages.",
    },
    {
      title: "instagram_manage_messages",
      purpose: "Receive and respond to Instagram Direct messages.",
    },
    {
      title: "pages_show_list",
      purpose: "Discover Pages linked to Instagram business accounts.",
    },
  ],
};

interface MetaAppReviewNotesProps {
  providerKey: string;
}

export function MetaAppReviewNotes({ providerKey }: MetaAppReviewNotesProps) {
  const notes = META_APP_REVIEW_NOTES[providerKey];
  if (!notes?.length) return null;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/10 p-3">
      <p className="text-sm font-medium">Why these permissions are needed</p>
      <ul className="space-y-2 text-xs text-muted-foreground">
        {notes.map((note) => (
          <li key={note.title}>
            <span className="font-mono text-foreground">{note.title}</span>
            {" — "}
            {note.purpose}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Meta config IDs: Facebook/Instagram use META_LOGIN_CONFIG_ID; WhatsApp uses
        META_EMBEDDED_SIGNUP_CONFIG_ID. Webhooks use META_WEBHOOK_VERIFY_TOKEN.
      </p>
    </div>
  );
}
