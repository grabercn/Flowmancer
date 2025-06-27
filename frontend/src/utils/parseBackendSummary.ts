import type { BackendSummary } from "../types";

/**
 * Parses a backend summary (raw LLM response or object) into a readable string.
 * Accepts either an object or a string (with or without ```json blocks).
 * Returns a readable string including project name (extracted from download_url) and generated timestamp.
 */
export function parseBackendSummary(download_url: string, summary: string | BackendSummary): string {
  let parsed: BackendSummary | null = null;

  // Try parsing string if needed
  if (typeof summary === 'string') {
    try {
      const cleaned = summary
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/```$/, '');
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error('Failed to parse summary string:', err);
      return '⚠️ Could not parse backend summary.';
    }
  } else {
    parsed = summary;
  }

  if (!parsed || typeof parsed !== 'object') {
    return '⚠️ Invalid summary structure.';
  }

  // Extract project name from download_url - take last segment after '/'
  const urlParts = download_url.split('/');
  const lastSegment = urlParts[urlParts.length - 1] || 'Unknown Project';

  // Optional: remove file extension from lastSegment if present
  const projectName = lastSegment.replace(/\.[^/.]+$/, '');

  const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0] + ' UTC';

  const endpointLines = parsed.endpoints.map(
    (ep) => `• [${ep.method}] ${ep.path} — ${ep.description}`
  );

  const typeLines = parsed.types.map(
    (type) => `• ${type.typeName}: ${type.description}`
  );

  return [
    `🛠️ **Project:** ${projectName}`,
    `🕒 **Generated:** ${timestamp}`,
    ``,
    `📡 **API Endpoints**\n${endpointLines.join('\n')}`,
    ``,
    `📦 **Data Types**\n${typeLines.join('\n')}`
  ].join('\n');
}
