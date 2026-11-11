// Shared room chat backed by Upstash Redis REST API.
// Required Vercel environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
const crypto = require('crypto');

const ROOM_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_MESSAGES = 100;

async function redis(commands) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    const error = new Error('Chat database is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.');
    error.status = 503;
    throw error;
  }
  const response = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!response.ok) throw new Error('Chat database request failed.');
  const results = await response.json();
  const failed = results.find(item => item.error);
  if (failed) throw new Error('Chat database command failed.');
  return results.map(item => item.result);
}
function validRoom(value) { return typeof value === 'string' && /^[A-Z0-9]{6}$/.test(value); }
function roomKey(room) { return 'chatblox:room:' + room; }
function messagesKey(room) { return 'chatblox:messages:' + room; }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'create') {
        for (let attempt = 0; attempt < 8; attempt++) {
          const room = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
          const result = await redis([['SET', roomKey(room), '1', 'NX', 'EX', String(ROOM_TTL_SECONDS)]]);
          if (result[0] === 'OK') return res.status(201).json({ ok: true, room });
        }
        return res.status(503).json({ error: 'Could not create a room. Please try again.' });
      }
      const room = typeof body.room === 'string' ? body.room.toUpperCase() : '';
      if (!validRoom(room)) return res.status(400).json({ error: 'Enter a valid 6-character room code.' });
      const exists = await redis([['EXISTS', roomKey(room)]]);
      if (!exists[0]) return res.status(404).json({ error: 'Room not found.' });
      if (body.action === 'join') return res.status(200).json({ ok: true, room });
      if (body.action === 'send') {
        const name = typeof body.name === 'string' ? body.name.trim().replace(/[<>]/g, '').slice(0, 20) : '';
        const text = typeof body.text === 'string' ? body.text.trim().slice(0, 500) : '';
        if (!name || !text) return res.status(400).json({ error: 'A display name and message are required.' });
        const message = JSON.stringify({ id: crypto.randomUUID(), name, text, time: Date.now() });
        await redis([
          ['LPUSH', messagesKey(room), message],
          ['LTRIM', messagesKey(room), '0', String(MAX_MESSAGES - 1)],
          ['EXPIRE', messagesKey(room), String(ROOM_TTL_SECONDS)]
        ]);
        return res.status(201).json({ ok: true });
      }
      return res.status(400).json({ error: 'Unknown chat action.' });
    }
    if (req.method === 'GET') {
      const room = typeof req.query?.room === 'string' ? req.query.room.toUpperCase() : '';
      if (!validRoom(room)) return res.status(400).json({ error: 'Enter a valid 6-character room code.' });
      const results = await redis([
        ['EXISTS', roomKey(room)],
        ['LRANGE', messagesKey(room), '0', String(MAX_MESSAGES - 1)]
      ]);
      if (!results[0]) return res.status(404).json({ error: 'Room not found.' });
      const messages = (results[1] || []).map(value => {
        try { return JSON.parse(value); } catch { return null; }
      }).filter(Boolean).reverse();
      return res.status(200).json({ ok: true, room, messages });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Chat is temporarily unavailable. Please try again.' });
  }
};
