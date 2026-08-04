import { createHmac, randomInt, timingSafeEqual } from "crypto";

/**
 * Kode verifikasi email STATELESS — tanpa tabel DB, aman untuk production
 * yang tidak boleh di-migrate.
 *
 * Cara kerja:
 * 1. `issueEmailCode` membuat kode 6 digit + `proof` (expiry + signature HMAC
 *    dari email|kode|expiry). Kode dikirim ke email user, `proof` dikembalikan
 *    ke client sebagai hidden field. Server tidak menyimpan apa pun.
 * 2. `verifyEmailCode` menghitung ulang signature dari kode yang diinput user
 *    dan membandingkannya secara constant-time. Kode yang salah tidak akan
 *    pernah menghasilkan signature yang cocok.
 * 3. Setelah kode cocok, `issueVerifiedEmail` menerbitkan token "email sudah
 *    terverifikasi" (juga HMAC) yang wajib disertakan saat membuat akun —
 *    sehingga langkah buat-password tidak bisa ditembus tanpa verifikasi.
 *
 * Kekurangan stateless: kode tidak bisa dicabut sekali diterbitkan. Ini
 * dimitigasi dengan expiry pendek (10 menit) + rate limit kirim & verifikasi
 * (app/lib/rate-limit.ts) sehingga brute-force 6 digit tidak feasible.
 */

const CODE_TTL_MS = 10 * 60_000; // kode berlaku 10 menit
const VERIFIED_TTL_MS = 30 * 60_000; // token "terverifikasi" berlaku 30 menit

function getSecret(): string {
  const secret =
    process.env.EMAIL_CODE_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("EMAIL_CODE_SECRET / NEXTAUTH_SECRET belum dikonfigurasi");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Buat kode 6 digit + proof untuk email. Kode dikirim via email, proof ke client. */
export function issueEmailCode(email: string): { code: string; proof: string } {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const exp = Date.now() + CODE_TTL_MS;
  const sig = sign(`code|${normalizeEmail(email)}|${code}|${exp}`);
  return { code, proof: `${exp}.${sig}` };
}

/** Verifikasi kode yang diinput user terhadap proof dari langkah kirim kode. */
export function verifyEmailCode(email: string, code: string, proof: string): boolean {
  const [expStr, sig] = proof.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || Date.now() > exp) return false;
  if (!/^\d{6}$/.test(code)) return false;
  const expected = sign(`code|${normalizeEmail(email)}|${code}|${exp}`);
  return safeEqual(expected, sig);
}

/** Terbitkan token bukti "email sudah terverifikasi" untuk langkah buat akun. */
export function issueVerifiedEmail(email: string): string {
  const exp = Date.now() + VERIFIED_TTL_MS;
  const sig = sign(`verified|${normalizeEmail(email)}|${exp}`);
  return `${exp}.${sig}`;
}

/** Verifikasi token terverifikasi saat pembuatan akun. */
export function verifyVerifiedEmail(email: string, token: string): boolean {
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || Date.now() > exp) return false;
  const expected = sign(`verified|${normalizeEmail(email)}|${exp}`);
  return safeEqual(expected, sig);
}

/**
 * RESET PASSWORD — varian khusus dengan namespace payload terpisah
 * (`resetcode|` / `resetverified|`). Token registrasi TIDAK bisa dipakai
 * silang ke flow reset (dan sebaliknya) karena signature-nya berbeda,
 * walaupun keduanya membuktikan hal yang sama (kepemilikan email).
 */
export function issuePasswordResetCode(email: string): { code: string; proof: string } {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const exp = Date.now() + CODE_TTL_MS;
  const sig = sign(`resetcode|${normalizeEmail(email)}|${code}|${exp}`);
  return { code, proof: `${exp}.${sig}` };
}

export function verifyPasswordResetCode(email: string, code: string, proof: string): boolean {
  const [expStr, sig] = proof.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || Date.now() > exp) return false;
  if (!/^\d{6}$/.test(code)) return false;
  const expected = sign(`resetcode|${normalizeEmail(email)}|${code}|${exp}`);
  return safeEqual(expected, sig);
}

export function issuePasswordResetToken(email: string): string {
  const exp = Date.now() + VERIFIED_TTL_MS;
  const sig = sign(`resetverified|${normalizeEmail(email)}|${exp}`);
  return `${exp}.${sig}`;
}

export function verifyPasswordResetToken(email: string, token: string): boolean {
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!exp || !sig || Date.now() > exp) return false;
  const expected = sign(`resetverified|${normalizeEmail(email)}|${exp}`);
  return safeEqual(expected, sig);
}
