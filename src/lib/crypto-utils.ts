/**
 * Converts an ArrayBuffer to a Base64 string.
 * This is MV3 compatible (runs in Service Worker).
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  if (buffer.byteLength === 0) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Avoid large spread for stack safety
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string to an ArrayBuffer.
 * This is MV3 compatible.
 */
export function base64ToBuffer(base64: string): ArrayBuffer {
  if (!base64) return new ArrayBuffer(0);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Validates passphrase strength for IcyCrow security standards.
 * Minimum 8 characters, at least 1 number, and 1 special character.
 */
export function validatePassphraseStrength(passphrase: string): boolean {
  if (!passphrase || passphrase.length < 8) return false;
  
  const hasNumber = /[0-9]/.test(passphrase);
  const hasSpecial = /[^A-Za-z0-9]/.test(passphrase);
  
  return hasNumber && hasSpecial;
}
