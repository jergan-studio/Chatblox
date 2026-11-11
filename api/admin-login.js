// Vercel serverless function. Configure JERGAN_ADMIN_PASSWORD and
// JERGAN_SESSION_SECRET in the Vercel project environment variables.
const crypto = require('crypto');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const expected = process.env.JERGAN_ADMIN_PASSWORD;
  const sessionSecret = process.env.JERGAN_SESSION_SECRET;
  if (!expected || !sessionSecret) return res.status(503).json({ ok: false, error: 'Admin login is not configured on the server.' });
  const supplied = typeof req.body?.password === 'string' ? req.body.password : '';
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ ok: false });
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  res.setHeader('Set-Cookie', `chatblox_admin=${payload}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);
  return res.status(200).json({ ok: true });
};
