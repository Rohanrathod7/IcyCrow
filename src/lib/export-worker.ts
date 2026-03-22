import type { WorkspaceBundle } from './types';

const MAGIC = new Uint8Array([0x49, 0x43, 0x52, 0x57]); // "ICRW"
const VERSION = 1;
const PBKDF2_ITERATIONS = 100_000;
export const EXPORT_LIMIT_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Validates password strength for export.
 * Min 8 chars, 1 digit, 1 special char.
 */
export function validateExportPassword(password: string): true | 'WEAK_PASSWORD' {
  if (password.length < 8) return 'WEAK_PASSWORD';
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (!hasDigit || !hasSpecial) return 'WEAK_PASSWORD';
  return true;
}

/**
 * Exports a WorkspaceBundle to a secure encrypted binary format (.icycrow).
 * Layout: 
 * [Magic (4)] [Version (1)] [Salt (16)] [IV (12)] [JSON Length (4)] [Ciphertext (N)] [HMAC (32)]
 */
export async function exportWorkspace(payload: WorkspaceBundle, password: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const rawJson = JSON.stringify(payload);
  const jsonBytes = encoder.encode(rawJson);

  // 1. Key Derivation Materials
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const baseKey = await deriveBaseKey(password);

  // 2. Encryption (AES-GCM)
  const aesKey = await deriveSubKey(baseKey, salt, 'AES-GCM', ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    jsonBytes
  );

  // 3. Signing (HMAC)
  const hmacKey = await deriveSubKey(baseKey, salt, 'HMAC', ['sign']);
  const jsonLenView = new DataView(new ArrayBuffer(4));
  jsonLenView.setUint32(0, jsonBytes.byteLength, false); // big-endian
  
  // Assemble prefix for signing: Magic + Version + Salt + IV + JsonLen + Ciphertext
  const prefixParts = [
    MAGIC, 
    new Uint8Array([VERSION]), 
    salt, 
    iv, 
    new Uint8Array(jsonLenView.buffer), 
    new Uint8Array(ciphertext as any)
  ];
  const hmacInput = assembleBuffer(prefixParts);
  const signature = await crypto.subtle.sign('HMAC', hmacKey, hmacInput.buffer as any);

  // 4. Final Assembly
  return assembleBuffer([...prefixParts, new Uint8Array(signature)]).buffer;
}

/**
 * Imports a WorkspaceBundle from a .icycrow binary buffer.
 * Performs integrity check (HMAC) and decryption (AES-GCM).
 */
export async function importWorkspace(buffer: ArrayBuffer, password: string): Promise<WorkspaceBundle> {
  const view = new DataView(buffer);
  
  if (buffer.byteLength < 69) throw new Error('INVALID_FORMAT');

  // 1. Validate Magic
  for (let i = 0; i < 4; i++) {
    if (view.getUint8(i) !== MAGIC[i]) throw new Error('INVALID_FORMAT');
  }

  // 2. Extract Parts
  // [Magic(4)][Version(1)][Salt(16)][IV(12)][Len(4)][Data(N)][HMAC(32)]
  const version = view.getUint8(4);
  if (version !== VERSION) throw new Error('UNSUPPORTED_VERSION');

  const salt = new Uint8Array(buffer as ArrayBuffer, 5, 16);
  const iv = new Uint8Array(buffer as ArrayBuffer, 21, 12);
  const jsonLen = view.getUint32(33, false);
  const hmacStart = buffer.byteLength - 32;
  const ciphertext = new Uint8Array(buffer as ArrayBuffer, 37, hmacStart - 37);
  const signature = new Uint8Array(buffer as ArrayBuffer, hmacStart, 32);

  // 3. Verify HMAC
  const baseKey = await deriveBaseKey(password);
  const hmacKey = await deriveSubKey(baseKey, salt, 'HMAC', ['verify']);
  
  const hmacInput = new Uint8Array(buffer, 0, hmacStart);
  // Cast salt/iv/signature/input to any to avoid SharedArrayBuffer/ArrayBufferLike issues in TS
  const isValid = await crypto.subtle.verify('HMAC', hmacKey, signature as any, hmacInput as any);
  if (!isValid) throw new Error('HMAC_VERIFICATION_FAILED');

  // 4. Decrypt AES-GCM
  const aesKey = await deriveSubKey(baseKey, salt, 'AES-GCM', ['decrypt']);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as any },
      aesKey,
      ciphertext as any
    );
    
    // Safety check: decrypted plain-text length should match the recorded JSON length
    if (plaintext.byteLength !== jsonLen) {
      throw new Error('CONTENT_CORRUPTION');
    }

    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch (err) {
    if ((err as Error).message === 'CONTENT_CORRUPTION') throw err;
    throw new Error('DECRYPTION_FAILED');
  }
}

// Helpers

async function deriveBaseKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
}

async function deriveSubKey(baseKey: CryptoKey, salt: Uint8Array, type: 'AES-GCM' | 'HMAC', usages: KeyUsage[]): Promise<CryptoKey> {
  const algorithm = type === 'AES-GCM' 
    ? { name: 'AES-GCM', length: 256 } 
    : { name: 'HMAC', hash: 'SHA-256', length: 256 };

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as any, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    algorithm,
    false,
    usages
  );
}

function assembleBuffer(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((acc, curr) => acc + curr.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
