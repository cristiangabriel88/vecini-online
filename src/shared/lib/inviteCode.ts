const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
const CODE_LENGTH = 8;
const CODE_RE = /^[A-Z2-9]{8}$/;

/** Generate an 8-character unambiguous alphanumeric invite code. */
export function generateInviteCode(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  }
  return out;
}

/** Validate the shape of an invite code (does not check consumption). */
export function isValidInviteCodeFormat(code: string): boolean {
  return CODE_RE.test(code.trim().toUpperCase());
}

/** Normalise user input to the canonical code form. */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z2-9]/g, '');
}
