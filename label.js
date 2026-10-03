const { guard, imageFrom, askVision, fixKcal, num } = require('./_lib');

const SYSTEM = `You read packaged-food nutrition labels. Extract values PER SERVING exactly as printed (convert sodium to mg, salt is not sodium).
Reply with ONLY JSON: {"name":"","serving":"e.g. 40 g","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0}
Use 0 for values not printed. If the image has no readable nutrition label reply {"error":"no_label"}.`;

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  const image = imageFrom(req);
  if (!image) return res.status(400).json({ error: 'bad_image' });
  try {
    const j = await askVision(image, SYSTEM, 'Read this nutrition label.');
    if (j.error) return res.status(422).json({ error: 'no_label' });
    const f = fixKcal({ calories: num(j.calories, 4000), protein: num(j.protein, 300), carbs: num(j.carbs, 600), fat: num(j.fat, 300) });
    res.status(200).json({ name: String(j.name || 'Scanned food').slice(0, 40), serving: String(j.serving || '1 serving').slice(0, 30), calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: num(j.fiber, 100), sugar: num(j.sugar, 400), sodium: num(j.sodium, 10000) });
  } catch (e) { res.status(502).json({ error: 'analysis_failed' }); }
};
