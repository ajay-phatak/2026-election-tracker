import { getRaceHistory } from "./_providers.js";

// GET /api/history?state=GA -> { stateCode, sources: [{ id, label, points:[{t,dem,rep}], hasData }] }
export default async function handler(req, res) {
  const state = String(req.query?.state || "").toUpperCase();
  if (!state) {
    res.status(400).json({ error: "missing ?state=" });
    return;
  }
  try {
    const data = await getRaceHistory(state);
    if (!data) {
      res.status(404).json({ error: `unknown state ${state}` });
      return;
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
