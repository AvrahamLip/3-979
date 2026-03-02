/**
 * API Service for fetching report data
 *
 * Uses the direct webhook URL (no proxy needed since we call the server directly).
 * The n8n server does not use authentication.
 */

const WEBHOOK_URL = 'https://151.145.89.228.sslip.io/webhook/Doch-1';

/**
 * Converts a YYYY-MM-DD date string (from the HTML date input)
 * to the format the webhook expects: DD/MM/YYYY
 */
function formatDateForApi(isoDate) {
  // isoDate is like "2026-03-02"
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export async function fetchReport(isoDate) {
  const dateParam = formatDateForApi(isoDate);
  const url = `${WEBHOOK_URL}?date=${dateParam}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching report:', error);
    throw error;
  }
}
