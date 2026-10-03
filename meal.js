const { guard, imageFrom, askVision, clean } = require('./_lib');

const SYSTEM = `You are an experienced clinical nutritionist estimating a meal from a photo.
Identify every distinct food or drink (use specific names; Indian dishes are common: roti, dal, sabji, paneer, rice, curd...).
Estimate the COOKED/served weight of each in grams using visible cues (plate, bowl, spoon, hand size). Include hidden cooking fat (oil, ghee, butter) inside the dish values.
Give nutrition for that estimated weight: calories (kcal), protein, carbs, fat, fiber, sugar (g) and sodium (mg).
Be realistic, not optimistic. Reply with ONLY JSON:
{"foods":[{"name":"","grams":0,"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0}],"notes":"one short sentence on the main uncertainty"}
If there is no food in the image reply {"foods":[],"notes":"No food detected"}.`;

module.exports = async (req, res) => {
  if (!guard(req, res)) return;
  const image = imageFrom(req);
  if (!image) return res.status(400).json({ error: 'bad_image' });
  try {
    const j = await askVision(image, SYSTEM, 'Analyze this meal.');
    const foods = (Array.isArray(j.foods) ? j.foods : []).slice(0, 12).map(clean);
    if (!foods.length) return res.status(422).json({ error: 'no_food' });
    res.status(200).json({ foods, notes: String(j.notes || '').slice(0, 200) });
  } catch (e) { res.status(502).json({ error: 'analysis_failed' }); }
};
