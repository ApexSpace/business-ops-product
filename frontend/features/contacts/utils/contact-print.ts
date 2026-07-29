import { getContactPrintAppointments } from "@/features/contacts/api/contact-workspace.api";

export function openContactPrintAppointments(contactId: string) {
  void getContactPrintAppointments(contactId).then((data) => {
    const rows = data.appointments
      .map(
        (appt) =>
          `<tr><td>${new Date(appt.startAt).toLocaleString()}</td><td>${appt.title}</td><td>${appt.serviceName ?? "—"}</td><td>${appt.providerName ?? "—"}</td><td>${appt.status}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><title>Upcoming appointments</title>
      <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}h1{font-size:20px}</style>
      </head><body>
      <h1>${data.businessName}</h1>
      <p><strong>${data.contactLabel}</strong>${data.contactPhone ? ` · ${data.contactPhone}` : ""}${data.contactEmail ? ` · ${data.contactEmail}` : ""}</p>
      <h2>Upcoming appointments</h2>
      <table><thead><tr><th>When</th><th>Title</th><th>Service</th><th>Provider</th><th>Status</th></tr></thead>
      <tbody>${rows || "<tr><td colspan='5'>No upcoming appointments</td></tr>"}</tbody></table>
      <p style="margin-top:16px;font-size:12px;color:#666">Generated ${new Date(data.generatedAt).toLocaleString()}</p>
      </body></html>`;
    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  });
}
