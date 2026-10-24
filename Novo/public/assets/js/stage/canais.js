// Palco com "cada canal sozinho": quem tem vários canais que contam entra uma vez por canal,
// cada um com os seus números e dados (ver ../canais.js). Os outros ficam iguais.

import { canaisQueContam, perfilDoCanal } from "../canais.js";

/** Há alguém com mais de um canal que conta? (só aí faz sentido a escolha) */
export function temVariosCanais(ds) {
  const n = new Map();
  for (const c of ds.channels || []) if (c.count) n.set(c.personId, (n.get(c.personId) || 0) + 1);
  return [...n.values()].some((x) => x > 1);
}

/** Um dataset em que cada canal que conta é um "Youtuber" (com dono = o Youtuber verdadeiro). */
export function dividirCanais(ds) {
  const porId = new Map(ds.channels.map((c) => [c.id, c]));
  const people = [];
  const karma = { ...(ds.karma?.pessoas || {}) };
  for (const p of ds.people) {
    const lista = canaisQueContam(p, porId);
    if (lista.length < 2) {
      people.push(p);
      continue;
    }
    for (const c of lista) {
      people.push(perfilDoCanal(p, c, lista));
      if (karma[p.id]) karma[c.id] = karma[p.id];
    }
  }
  const categories = [...new Set([...(ds.categories || []), ...people.map((p) => p.category).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "pt"));
  return { ...ds, people, categories, ...(ds.karma ? { karma: { ...ds.karma, pessoas: karma } } : {}), canaisSeparados: true };
}

/** Os resultados (duelos, coroas, títulos) voltam para o Youtuber dono de cada canal. */
export function resultadosDosDonos(resultados, ds) {
  const dono = new Map(ds.people.filter((p) => p.dono).map((p) => [p.id, p.dono]));
  const d = (id) => dono.get(id) || id;
  return resultados
    .map((r) => ({ ...r, ...(r.a ? { a: d(r.a) } : {}), ...(r.b ? { b: d(r.b) } : {}), ...(r.vence ? { vence: d(r.vence) } : {}), ...(Array.isArray(r.participantes) ? { participantes: [...new Set(r.participantes.map(d))] } : {}) }))
    .filter((r) => r.tipo !== "duelo" || r.a !== r.b);
}
