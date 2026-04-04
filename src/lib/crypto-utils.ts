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
