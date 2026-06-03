import { getControlHistory } from "./_providers.js";

// GET /api/control-history -> { senate:{sources:[{id,label,points:[{t,dem,rep}],hasData}]}, house:{...} }
export default async function handler(req, res) {
  try {
    const data = await getControlHistory();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
