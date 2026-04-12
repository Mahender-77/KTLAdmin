import DOMPurify from "dompurify";

/**
 * Conservative XSS defenses for the Admin SPA (REQ-36).
 * Strips all markup; use for any API-sourced or user-entered string shown as text.
 */
export function sanitizeText(input: unknown): string {
  const str = input == null ? "" : typeof input === "string" ? input : String(input);
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
}

/**
 * Same as `sanitizeText` today — no rich HTML allowed in Admin renders.
 * If a field is later promoted to controlled HTML, tighten `ALLOWED_TAGS` here only for that call site.
 */
export function sanitizeHtml(input: unknown): string {
  return sanitizeText(input);
}
