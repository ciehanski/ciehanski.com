// Live, shared bits over Supabase Realtime (free tier; no tables or server
// code): the "N here now" count, and pixel hearts that everyone viewing the
// same scene sees. Stays off unless content/site.json has
// presence.supabaseUrl + presence.supabaseAnonKey (the anon key is public by design).

export async function startPresence(cfg, { onCount, onHeart }) {
  const off = { sendHeart() {} };
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) return off;
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const me = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
    const channel = client.channel(cfg.channel || 'here-now', { config: { presence: { key: me }, broadcast: { self: false } } });
    channel.on('presence', { event: 'sync' }, () => onCount(Object.keys(channel.presenceState()).length));
    channel.on('broadcast', { event: 'heart' }, ({ payload }) => {
      // only trust well-formed payloads: numbers in range and a short scene id
      const { x, y, scene } = payload || {};
      if (typeof scene === 'string' && scene.length < 20 && Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 480 && y >= 0 && y <= 270) onHeart({ x, y, scene });
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ since: Date.now() });
    });
    return { sendHeart: (h) => channel.send({ type: 'broadcast', event: 'heart', payload: h }) };
  } catch (err) {
    console.warn('presence unavailable:', err);
    return off;
  }
}
