// Um canal visto como se fosse um Youtuber à parte: os seus números, e os dados escritos para ele
// no painel (nome, categoria, descrição, etiquetas). O que não tiver, vem do Youtuber dono.
// Usado na página de cada canal e no Palco com "cada canal entra sozinho".

/** Os canais que contam de um Youtuber, com o principal primeiro. */
export function canaisQueContam(p, porId) {
  return (p.channelIds || []).map((id) => porId.get(id)).filter((c) => c && c.count);
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

/** O "Youtuber" feito de um canal. contam = os canais que contam do dono (para a parte da folha). */
export function perfilDoCanal(p, c, contam) {
  const principal = contam[0]?.id === c.id;
  return {
    ...p,
    id: c.id,
    name: c.nome || c.title || p.name,
    category: c.category || p.category,
    bio: c.bio || (principal ? p.bio : ""),
    tags: c.tags || (principal ? p.tags : []),
    realName: principal ? p.realName : "",
    dono: p.id,
    donoNome: p.name,
    canal: { id: c.id, role: c.role, count: c.count, principal },
    photo: c.thumb || (principal ? p.photo : ""),
    banner: c.banner || (principal ? p.banner : ""),
    monthly: principal ? mesesPrincipal(p, c, contam.slice(1)) : { ...(c.monthly || {}) },
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
  };
}
