/**
 * Minimal base64url JWT payload decoder. No signature verification — this is
 * only used to read `exp` client-side for proactive refresh scheduling.
 * Pure JS (no atob dependency) so it runs identically on Hermes, web and node.
 */

const B64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64Decode(input: string): string {
  let str = input.replace(/=+$/, "");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of str) {
    const value = B64_ALPHABET.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function base64UrlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = base64Decode(base64);
  // Decode UTF-8 byte sequence.
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8").decode(bytes);
  }
  return decodeURIComponent(
    Array.from(bytes)
      .map((b) => `%${b.toString(16).padStart(2, "0")}`)
      .join(""),
  );
}

/** Decode a JWT's payload segment. Returns null on any malformed input. */
export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string,
): T | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlToUtf8(parts[1])) as T;
  } catch {
    return null;
  }
}
