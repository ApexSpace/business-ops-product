/** Strip HTML tags and collapse whitespace for search/plain display. */
export function htmlToPlainText(html: string): string {
  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
