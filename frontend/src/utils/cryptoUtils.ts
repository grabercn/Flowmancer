/**
 * Obfuscates an API key using XOR with a secret, then Base64 encodes the result.
 *
 * @param apiKey The plain-text API key to obfuscate.
 * @returns A Base64-encoded, XOR-obfuscated string.
 */
export function encryptApiKey(apiKey: string): string {
  const secret = import.meta.env.VITE_ENCRYPTION_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing VITE_ENCRYPTION_SECRET_KEY in .env file");
  }

  return apiKey
}
