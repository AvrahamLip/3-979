/**
 * API Service for fetching report data
 */

const WEBHOOK_URL = '/api-webhook/webhook/Doch-1';

export async function fetchReport(date) {
  try {
    const response = await fetch(`${WEBHOOK_URL}?date=${date}`);
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
