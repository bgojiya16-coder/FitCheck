// Free Open Food Facts lookup (no key needed). Values are per 100 g.
module.exports = async (req, res) => {
  const code = String((req.query && req.query.code) || '').replace(/\D/g, '');
  if (code.length < 8 || code.length > 14) return res.status(400).json({ error: 'bad_code' });
  try {
    const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + code + '.json?fields=product_name,brands,nutriments', { headers: { 'User-Agent': 'Fit30/1.0' } });
    const p = r.ok && (await r.json()).product;
    const n = p && p.nutriments;
    if (!n || n['energy-kcal_100g'] == null) return res.status(404).json({ error: 'not_found' });
    const v = k => Math.round((+n[k] || 0) * 10) / 10;
    res.status(200).json({ name: ((p.brands ? p.brands.split(',')[0] + ' ' : '') + (p.product_name || 'Product')).slice(0, 40), serving: '100 g', calories: v('energy-kcal_100g'), protein: v('proteins_100g'), carbs: v('carbohydrates_100g'), fat: v('fat_100g'), fiber: v('fiber_100g'), sugar: v('sugars_100g'), sodium: Math.round((+n['sodium_100g'] || 0) * 1000) });
  } catch (e) { res.status(502).json({ error: 'lookup_failed' }); }
};
