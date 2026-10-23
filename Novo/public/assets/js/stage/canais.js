// Palco com "cada canal sozinho": quem tem vários canais que contam entra uma vez por canal,
// cada um com os seus números (views por mês, subscritores, vídeos). Os outros ficam iguais.

/** Há alguém com mais de um canal que conta? (só aí faz sentido a escolha) */
export function temVariosCanais(ds) {
  const n = new Map();
  for (const c of ds.channels || []) if (c.count) n.set(c.personId, (n.get(c.personId) || 0) + 1);
  return [...n.values()].some((x) => x > 1);
}

/** Os meses do canal principal: os dele e, quando ele não tem números, a parte da folha antiga do Youtuber. */
function mesesPrincipal(p, principal, outros) {
  const out = { ...(principal.monthly || {}) };
  for (const [m, e] of Object.entries(p.monthly || {})) {
    if (out[m] || !e) continue;
    const dosOutros = outros.reduce((a, c) => a + (c.monthly?.[m]?.v || 0), 0);
    if (!dosOutros) out[m] = e;
    else if (!e.p && e.v - dosOutros > 0) out[m] = { v: e.v - dosOutros, src: e.src };
  }
  return out;
}

/** Um dataset em que cada canal que conta é um "Youtuber" (com dono = o Youtuber verdadeiro). */
export function dividirCanais(ds) {
  const porId = new Map(ds.channels.map((c) => [c.id, c]));
  const people = [];
  const karma = { ...(ds.karma?.pessoas || {}) };
  for (const p of ds.people) {
    const lista = (p.channelIds || []).map((id) => porId.get(id)).filter((c) => c && c.count);
    if (lista.length < 2) {
      people.push(p);
      continue;
    }
    lista.forEach((c, i) => {
      const principal = i === 0;
      people.push({
        ...p,
        id: c.id,
        name: c.title || p.name,
        dono: p.id,
        donoNome: p.name,
        photo: c.thumb || (principal ? p.photo : ""),
        banner: c.banner || (principal ? p.banner : ""),
        monthly: principal ? mesesPrincipal(p, c, lista.slice(1)) : { ...(c.monthly || {}) },
        totals: c.views !== null && c.views !== undefined ? { subs: c.subs, views: c.views, videos: c.videos, src: "youtube" } : principal ? p.totals : null,
        vid: c.vid || null,
        idx: undefined,
        medida: { canal: c.id },
        mainChannelId: c.id,
        channelIds: [c.id],
        since: c.publishedAt || (principal ? p.since : ""),
        sb: undefined,
        tt: principal ? p.tt : undefined,
        socials: principal ? p.socials : {},
        legacy: principal ? p.legacy : {},
      });
      if (karma[p.id]) karma[c.id] = karma[p.id];
    });
  }
  return { ...ds, people, ...(ds.karma ? { karma: { ...ds.karma, pessoas: karma } } : {}), canaisSeparados: true };
}

/** Os resultados (duelos, coroas, títulos) voltam para o Youtuber dono de cada canal. */
export function resultadosDosDonos(resultados, ds) {
  const dono = new Map(ds.people.filter((p) => p.dono).map((p) => [p.id, p.dono]));
  const d = (id) => dono.get(id) || id;
  return resultados
    .map((r) => ({ ...r, ...(r.a ? { a: d(r.a) } : {}), ...(r.b ? { b: d(r.b) } : {}), ...(r.vence ? { vence: d(r.vence) } : {}), ...(Array.isArray(r.participantes) ? { participantes: [...new Set(r.participantes.map(d))] } : {}) }))
    .filter((r) => r.tipo !== "duelo" || r.a !== r.b);
}
