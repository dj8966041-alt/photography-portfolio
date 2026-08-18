module.exports = async (req, res) => {
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: 'portfolio/data.json' });
    if (blobs.length > 0) {
      const r = await fetch(`${blobs[0].url}?t=${Date.now()}`);
      if (r.ok) return res.json(await r.json());
    }
    res.json({ events: [] });
  } catch {
    res.json({ events: [] });
  }
};
