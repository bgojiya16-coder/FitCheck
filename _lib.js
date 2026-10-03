// Shared helpers. The API key lives ONLY in the ANTHROPIC_API_KEY environment variable on the server.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const num = (x, max = 100000) => Math.min(max, Math.max(0, Math.round((+x || 0) * 10) / 10));

function guard(req, res) {
  const origin = process.env.ALLOWED_ORIGIN; // optional, e.g. https://yourapp.vercel.app
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); }
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return false; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(500).json({ error: 'no_key' }); return false; }
  return true;
}

function imageFrom(req) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec((req.body && req.body.image) || '');
  if (!m || m[2].length > 4_000_000) return null;
  return { type: 'image', source: { type: 'base64', media_type: 'image/' + m[1], data: m[2] } };
}

async function askVision(image, system, text) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages: [{ role: 'user', content: [image, { type: 'text', text }] }] })
  });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const j = await r.json();
  const t = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no json');
  return JSON.parse(t.slice(a, b + 1));
}

// If the model's calories disagree with its own macros by >35%, trust the macros (4/4/9 rule).
function fixKcal(f) {
  const e = 4 * f.protein + 4 * f.carbs + 9 * f.fat;
  if (!f.calories || (e > 20 && Math.abs(e - f.calories) / f.calories > 0.35)) f.calories = Math.round(e);
  return f;
}
const clean = f => fixKcal({ name: String(f.name || 'Food').slice(0, 40), grams: Math.max(1, num(f.grams, 2000)), calories: num(f.calories, 4000), protein: num(f.protein, 300), carbs: num(f.carbs, 600), fat: num(f.fat, 300), fiber: num(f.fiber, 100), sugar: num(f.sugar, 400), sodium: num(f.sodium, 10000) });

module.exports = { guard, imageFrom, askVision, clean, num, fixKcal };
