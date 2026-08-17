/**
 * Password / PIN hashing.
 *
 * Uses PBKDF2-HMAC-SHA256 with a random 16-byte salt and 150,000 iterations,
 * via the browser's native Web Crypto API (works fully offline, no dependencies).
 *
 * Stored format: "pbkdf2$<iterations>$<saltHex>$<hashHex>"
 *
 * Backward compatibility: accounts created before this change have a plain
 * SHA-256 hex hash (no salt) stored. verifyPassword() still accepts that
 * legacy format so existing users are not locked out; every account is
 * automatically upgraded to the new salted format the next time its
 * password/PIN is changed (hashPassword() always produces the new format).
 */

const PBKDF2_ITERATIONS = 150_000;

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Constant-time string comparison to avoid leaking hash info via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

/** Legacy (pre-upgrade) unsalted SHA-256 — verify-only, never produced for new hashes. */
async function legacySha256(password: string): Promise<string> {
  const data = new TextEncoder().encode(password) as BufferSource;
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashHex = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${hashHex}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('pbkdf2$')) {
    const parts = hash.split('$');
    if (parts.length !== 4) return false;
    const [, iterStr, saltHex, hashHex] = parts;
    const iterations = Number(iterStr);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;
    const computed = await pbkdf2(password, fromHex(saltHex), iterations);
    return timingSafeEqual(computed, hashHex);
  }

  // Legacy unsalted SHA-256 hash from before this security upgrade.
  const computed = await legacySha256(password);
  return timingSafeEqual(computed, hash);
}
