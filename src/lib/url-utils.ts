/**
 * Strips fragments/hashes from a URL to return its canonical form.
 */
export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url.split('#')[0];
  }
}

/**
 * Returns a stable 64-character SHA-256 hex string.
 * Uses Web Crypto API (available in modern browsers and Node 20+).
 */
export async function sha256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  let subtle = typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null;
  if (!subtle) {
    // Fallback for Node.js environments during vitest
    const nodeCrypto = await import('node:crypto');
    subtle = (nodeCrypto.webcrypto as any).subtle;
  }
    
  const hashBuffer = await subtle!.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
