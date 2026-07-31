import { toast } from "sonner";
import { getContactPrintAppointments } from "@/features/contacts/api/contact-workspace.api";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function writePrintDocument(win: Window, html: string) {
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/**
 * Opens a printable upcoming-appointments document for a contact.
 * The window must be opened synchronously on the user click; writing
 * happens after the API responds. Do not pass `noopener` to window.open —
 * Chrome then returns null while still leaving a blank tab.
 */
export function openContactPrintAppointments(contactId: string) {
  const win = window.open("about:blank", "_blank");
  if (!win) {
    toast.error("Allow pop-ups to print upcoming appointments");
    return;
  }

  writePrintDocument(
    win,
    `<!DOCTYPE html><html><head><title>Upcoming appointments</title></head><body><p>Loading appointments…</p></body></html>`,
  );

  void getContactPrintAppointments(contactId)
    .then((data) => {
      const rows = data.appointments
        .map(
          (appt) =>
            `<tr><td>${escapeHtml(new Date(appt.startAt).toLocaleString())}</td><td>${escapeHtml(appt.title)}</td><td>${escapeHtml(appt.serviceName ?? "—")}</td><td>${escapeHtml(appt.providerName ?? "—")}</td><td>${escapeHtml(appt.status)}</td></tr>`,
        )
        .join("");
      const contactMeta = [
        data.contactPhone ? escapeHtml(data.contactPhone) : null,
        data.contactEmail ? escapeHtml(data.contactEmail) : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const html = `<!DOCTYPE html><html><head><title>Upcoming appointments</title>
      <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}h1{font-size:20px}</style>
      </head><body>
      <h1>${escapeHtml(data.businessName)}</h1>
      <p><strong>${escapeHtml(data.contactLabel)}</strong>${contactMeta ? ` · ${contactMeta}` : ""}</p>
      <h2>Upcoming appointments</h2>
      <table><thead><tr><th>When</th><th>Title</th><th>Service</th><th>Provider</th><th>Status</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>No upcoming appointments</td></tr>"}</tbody></table>
      <p style="margin-top:16px;font-size:12px;color:#666">Generated ${escapeHtml(new Date(data.generatedAt).toLocaleString())}</p>
      </body></html>`;

      if (win.closed) return;
      writePrintDocument(win, html);
      win.focus();
      win.print();
    })
    .catch((err: Error) => {
      if (!win.closed) {
        writePrintDocument(
          win,
          `<!DOCTYPE html><html><head><title>Print error</title></head><body><p>Could not load appointments.</p><p>${escapeHtml(err.message || "Unknown error")}</p></body></html>`,
        );
      }
      toast.error(err.message || "Failed to load appointments for print");
    });
}
