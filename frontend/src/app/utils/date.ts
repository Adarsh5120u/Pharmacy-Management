// Utility functions for handling date formatting

/**
 * Formats a date string or Date object into DD/MM/YYYY format.
 *
 * @param input - a date string or Date object
 * @returns formatted date (e.g. "19/02/2026"); empty string if invalid date
 */
export function formatDate(input?: string | Date | null): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a date/time string or Date object into DD/MM/YYYY HH:MM format.
 *
 * @param input - a date string or Date object
 * @returns formatted date/time (e.g. "19/02/2026 14:23"); empty string if invalid date
 */
export function formatDateTime(input?: string | Date | null): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
