import crypto from 'crypto';
import { supabaseAdmin } from './supabaseServer';

const SESSION_COOKIE = 'session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

// نستخدم SHA-256 المدمج في Node (وحدة crypto) بدلاً من مكتبة bcrypt خارجية،
// لتجنّب أي مشاكل تثبيت حزم، وليعمل الكود مباشرة في أي بيئة Node بدون إعداد إضافي.
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function bufToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function strToBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToStr(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64)));
}

const encoder = new TextEncoder();

async function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET غير مضبوط في متغيرات البيئة');
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// role: 'admin' | 'marketer'
export async function createSessionToken(role) {
  const payload = JSON.stringify({ role, iat: Date.now() });
  const payloadB64 = strToBase64Url(payload);
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = bufToBase64Url(sig);
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  try {
    const key = await getKey();
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
    const expectedSigB64 = bufToBase64Url(expectedSig);
    if (expectedSigB64 !== sigB64) return null;
    const payload = JSON.parse(base64UrlToStr(payloadB64));
    if (Date.now() - payload.iat > THIRTY_DAYS * 1000) return null;
    return payload; // { role, iat }
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };

// يتحقق من كلمة المرور المُدخلة مقابل الهاش المخزّن في قاعدة البيانات، ويُرجع الدور إن نجحت
export async function checkPassword(password) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('app_settings')
    .select('admin_password_hash, marketer_password_hash')
    .eq('id', 1)
    .single();

  if (error || !data) return null;

  const hash = sha256(password);
  if (data.admin_password_hash && data.admin_password_hash === hash) return 'admin';
  if (data.marketer_password_hash && data.marketer_password_hash === hash) return 'marketer';
  return null;
}

export async function hashPassword(password) {
  return sha256(password);
}
