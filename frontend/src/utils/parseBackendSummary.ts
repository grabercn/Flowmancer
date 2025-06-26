import type { BackendSummary } from "../types";

/**
 * Parses a backend summary (raw LLM response or object) into a readable string.
 * Accepts either an object or a string (with or without ```json blocks).
 * Returns a readable string including project name and generated timestamp.
 */
export function parseBackendSummary(summary: string | BackendSummary): string {
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

  const projectName = 'Universal Code UI';
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
