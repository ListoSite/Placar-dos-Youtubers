// Recolha automática de dados do YouTube.
//  - runDaily():   números de todos os canais (1 unidade por cada 50 canais)
//  - runVideos():  últimos vídeos de alguns canais de cada vez (≈3 unidades por canal)
//  - refreshProjects(): vídeos dos projetos (playlists ou listas de vídeos)

import { getJSON, setJSON } from "./storage.mjs";
import { channelsByIds, recentUploads, playlistVideoIds, videosByIds, playlistInfo, takeUnits, comentariosDe, lerFeed, tendenciasPT, procurarVideos } from "./youtube.mjs";
import {
  lerRadar, guardarRadar, lerIndice, guardarIndice, juntarNoRadar, contextoRadar, analisarCanal, eCandidato, itemDoVideo, linhaDoIndice,
  detetarCasos, canaisDoGrupo, nomesDosYoutubers, norm, DIAS_INDICE,
} from "./radar.mjs";
import { todayLisbon, todayPacific, median, pool } from "./util.mjs";

const DAY = 86400000;

export async function addQuota(units) {
  if (!units) return;
  const day = todayPacific();
  const q = await getJSON("quota", { day, used: 0, history: {} });
  if (q.day !== day) {
    q.history = q.history || {};
    q.history[q.day] = q.used;
    const keys = Object.keys(q.history).sort().slice(-14);
    q.history = Object.fromEntries(keys.map((k) => [k, q.history[k]]));
    q.day = day;
    q.used = 0;
  }
  q.used += units;
  await setJSON("quota", q);
}

/** Guarda os números de hoje de uma lista de canais já lidos da API. */
export async function storeChannelNumbers(chans, { dateStr = todayLisbon() } = {}) {
  const M = dateStr.slice(0, 7);
  const day = Number(dateStr.slice(8));
  const [stats, snap, ytstart] = await Promise.all([
    getJSON("stats", {}),
    getJSON("snap/" + M, {}),
    getJSON("ytstart", {}),
  ]);
  const at = new Date().toISOString();
  for (const c of chans) {
    stats[c.id] = { ...c, at, missing: false };
    (snap[c.id] ||= {})[day] = [c.views, c.subs, c.videos];
    const s = ((ytstart[c.id] ||= {})[M] ||= { v: c.views, d: day });
    if (day < s.d) {
      s.v = c.views;
      s.d = day;
    }
    if (!s.ed || day >= s.ed) {
      s.ev = c.views;
      s.ed = day;
    }
  }
  await Promise.all([setJSON("stats", stats), setJSON("snap/" + M, snap), setJSON("ytstart", ytstart)]);
  return stats;
}

export async function runDaily(db) {
  const ids = Object.keys(db.channels);
  if (!ids.length) return { channels: 0 };
  const chans = await channelsByIds(ids);
  const found = new Set(chans.map((c) => c.id));
  const stats = await storeChannelNumbers(chans);
  let missing = 0;
  for (const id of ids) {
    if (!found.has(id) && stats[id]) {
      stats[id].missing = true;
      missing++;
    }
  }
  if (missing) await setJSON("stats", stats);
  const meta = await getJSON("meta", {});
  meta.lastDaily = new Date().toISOString();
  await setJSON("meta", meta);
  await addQuota(takeUnits());
  return { channels: chans.length, missing };
}

export function summarizeVideos(items, now = Date.now()) {
  const age = (v) => (now - Date.parse(v.p)) / DAY;
  const in30 = items.filter((v) => age(v) <= 30);
  const in90 = items.filter((v) => age(v) <= 90);
  const settled = items.filter((v) => age(v) >= 7);
  const longs = settled.filter((v) => !v.s);
  const shorts = settled.filter((v) => v.s);
  const engBase = items.filter((v) => age(v) >= 2 && v.v > 0);
  const sumV = engBase.reduce((a, v) => a + v.v, 0);
  const sumE = engBase.reduce((a, v) => a + v.l + v.c, 0);
  const gaps = [];
  const sorted = [...items].sort((a, b) => Date.parse(b.p) - Date.parse(a.p));
  for (let i = 1; i < Math.min(sorted.length, 21); i++) gaps.push((Date.parse(sorted[i - 1].p) - Date.parse(sorted[i].p)) / DAY);
  return {
    n: items.length,
    last: sorted[0]?.p || "",
    up30: in30.length,
    up90: in90.length,
    sh90: in90.filter((v) => v.s).length,
    views90: in90.reduce((a, v) => a + v.v, 0),
    med: Math.round(median(settled.map((v) => v.v))),
    medLong: Math.round(median(longs.map((v) => v.v))),
    medShort: Math.round(median(shorts.map((v) => v.v))),
    avg: settled.length ? Math.round(settled.reduce((a, v) => a + v.v, 0) / settled.length) : 0,
    eng: sumV ? sumE / sumV : 0,
    gap: gaps.length ? Math.round(median(gaps) * 10) / 10 : null,
    top: [...in90].sort((a, b) => b.v - a.v).slice(0, 3).map((v) => ({ id: v.id, t: v.t, v: v.v, p: v.p, s: v.s, th: v.th })),
  };
}

/** Atualiza os últimos vídeos de N canais (os que estão há mais tempo sem atualizar). */
export async function runVideos(db, { limit = 20, only } = {}) {
  const vstate = await getJSON("vstate", {});
  let ids = only ? only.filter((id) => db.channels[id]) : Object.keys(db.channels);
  ids.sort((a, b) => (vstate[a] || "").localeCompare(vstate[b] || ""));
  ids = ids.slice(0, limit);
  if (!ids.length) return { channels: 0 };
  const vsum = await getJSON("videosummary", {});
  const errors = [];
  let quotaError = null;
  await pool(ids, 4, async (id) => {
    if (quotaError) return;
    try {
      const items = await recentUploads(id, 50);
      const slim = items.map(({ id, t, p, d, v, l, c, s, live, th }) => ({ id, t, p, d, v, l, c, s, live, th }));
      await setJSON("videos/" + id, { at: new Date().toISOString(), items: slim });
      vsum[id] = summarizeVideos(slim);
      vstate[id] = new Date().toISOString();
    } catch (e) {
      errors.push(`${id}: ${e.message}`);
      if (/quota/i.test(e.message)) quotaError = e;
    }
  });
  await Promise.all([setJSON("videosummary", vsum), setJSON("vstate", vstate)]);
  if (quotaError) {
    await addQuota(takeUnits());
    throw quotaError;
  }
  const meta = await getJSON("meta", {});
  meta.lastVideos = new Date().toISOString();
  await setJSON("meta", meta);
  await addQuota(takeUnits());
  return { channels: ids.length, errors };
}

/**
 * Radar do Caso: lê os últimos 15 vídeos de cada canal pelo feed RSS do YouTube (não gasta quota).
 * Da API só se usa:
 *   - os detalhes dos vídeos dos últimos 14 dias (comentários e etiquetas): 1 unidade por cada 50 vídeos;
 *   - os comentários dos que já parecem notícia: 1 unidade cada, com um máximo por procura;
 *   - as tendências de Portugal: 1 unidade, no máximo de 6 em 6 horas;
 *   - a lista de uploads quando o feed falha (cerca de 3 unidades), só se permitirApi.
 * No fim recalcula os casos a crescer e junta tudo ao radar sem estragar o que se mudou no painel.
 */
export async function procurarRadar(db, canais, { radar = null, permitirApi = true, maxApi = 10, comentariosMax = 20, prioridade = new Set(), tendencias = true, campos = {} } = {}) {
  const r = radar || (await lerRadar());
  const agora = Date.now();
  const [vsum, ind] = await Promise.all([getJSON("videosummary", {}), lerIndice()]);
  const errors = [];
  let quotaError = null;
  let viaApi = 0;
  let feeds = 0;

  // 0. Tendências de Portugal (1 unidade, de 6 em 6 horas)
  let tendNovas = [];
  if (tendencias && agora - Date.parse(r.tendencias?.at || 0) > 6 * 3600e3) {
    try {
      tendNovas = await tendenciasPT();
      r.tendencias = { at: new Date().toISOString(), pos: Object.fromEntries(tendNovas.map((v, i) => [v.id, i + 1])) };
    } catch (e) {
      errors.push("tendências: " + e.message);
      if (/quota/i.test(e.message)) quotaError = e;
    }
  }
  const ctx = contextoRadar(db, r, { agora });

  // 1. Feeds (e a API só quando o feed falha)
  const lidos = [];
  await pool(canais, 8, async (canal) => {
    let vids = await lerFeed(canal.id);
    if (vids) feeds++;
    else if (permitirApi && viaApi < maxApi && !quotaError) {
      viaApi++;
      vids = await recentUploads(canal.id, 15).catch((e) => {
        errors.push(`${canal.id}: ${e.message}`);
        if (/quota/i.test(e.message)) quotaError = e;
        return null;
      });
    } else errors.push(`${canal.id}: o feed não respondeu`);
    if (vids) lidos.push({ canal, vids });
  });

  // Vídeos em tendência de canais que não estão no Placar, quando falam de Youtubers do Placar
  const noPlacar = new Set(Object.keys(db.channels));
  const nomes = ctx.nomes;
  for (const v of tendNovas) {
    if (noPlacar.has(v.ch) || canais.some((c) => c.id === v.ch)) continue;
    const t = norm(v.t);
    if (!nomes.some((y) => y.nomes.some((n) => ` ${t} `.includes(` ${n} `)))) continue;
    lidos.push({ canal: { id: v.ch, personId: null, titulo: v.chT || "Canal em tendência", tendencia: true }, vids: [v] });
  }

  // 2. Detalhes dos vídeos recentes que vieram do feed (comentários, etiquetas): 1 unidade por 50
  const recente = agora - DIAS_INDICE * 864e5;
  const pedir = lidos.flatMap(({ vids }) => vids.filter((v) => v.rss && Date.parse(v.p || 0) >= recente && !ctx.removidos.has(v.id)).map((v) => v.id));
  if (pedir.length && !quotaError) {
    try {
      const det = new Map((await videosByIds(pedir)).map((v) => [v.id, v]));
      for (const { vids } of lidos)
        for (const v of vids) {
          const d = det.get(v.id);
          if (d) Object.assign(v, { c: d.c, l: d.l || v.l, v: Math.max(v.v || 0, d.v || 0), tags: d.tags, desc: d.desc || v.desc, d: d.d });
        }
    } catch (e) {
      errors.push("detalhes: " + e.message);
      if (/quota/i.test(e.message)) quotaError = e;
    }
  }

  // 3. Analisar
  const medianaDe = (canal, vids) => {
    const s = vsum[canal.id];
    if (s?.medLong || s?.medShort) return { l: s.medLong || s.med, s: s.medShort || s.med };
    const assentes = vids.filter((v) => agora - Date.parse(v.p || 0) >= 7 * 864e5);
    return { l: median(assentes.filter((v) => !v.s).map((v) => v.v)), s: median(assentes.filter((v) => v.s).map((v) => v.v)) };
  };
  let analisados = lidos.map(({ canal, vids }) => ({ canal, vids, med: medianaDe(canal, vids), lista: analisarCanal(ctx, canal, vids, { mediana: medianaDe(canal, vids) }) }));

  // 4. Comentários dos que já parecem notícia (os escolhidos primeiro), até ao máximo
  let comentarios = 0;
  if (r.regras.comentarios && comentariosMax > 0 && !quotaError) {
    const cand = analisados
      .flatMap((x) => x.lista.map((y) => ({ x, ...y })))
      .filter(({ v, a }) => a.pontos >= r.regras.minimo - 1 && v.c >= 20 && !ctx.antes.get(v.id)?.comLidos)
      .sort((a, b) => (prioridade.has(b.x.canal.id) ? 1 : 0) - (prioridade.has(a.x.canal.id) ? 1 : 0) || b.a.pontos - a.a.pontos)
      .slice(0, comentariosMax);
    const textos = {};
    await pool(cand, 4, async ({ v }) => {
      textos[v.id] = await comentariosDe(v.id).catch(() => []);
    });
    comentarios = cand.length;
    if (cand.length)
      analisados = analisados.map((x) => (x.lista.some(({ v }) => textos[v.id]) ? { ...x, lista: analisarCanal(ctx, x.canal, x.vids, { mediana: x.med, comentarios: textos }) } : x));
  }

  // 5. Itens e índice
  const itens = [];
  for (const { canal, lista } of analisados) {
    const chNome = canal.titulo || db.channels[canal.id]?.title || "";
    for (const va of lista) {
      if (Date.parse(va.v.p || 0) >= recente) {
        ind.v[va.v.id] = linhaDoIndice(canal, chNome, va);
        Object.assign(ind.disp, Object.fromEntries(Object.entries(va.a.nomesAssuntos).filter(([k]) => !ind.disp[k])));
      }
      if (eCandidato(ctx, va)) itens.push(itemDoVideo(ctx, canal, va));
    }
  }
  const nomeDe = (id) => db.people[id]?.name || id;
  const casos = detetarCasos(ind, { agora, mudos: r.casosMudos, nomeDe });

  // 6. Guardar (o radar é lido outra vez: pode ter mudado no painel enquanto isto corria)
  await guardarIndice(ind, agora);
  const fresh = juntarNoRadar(await lerRadar(), { itens, campos: { ultima: new Date().toISOString(), casos, tendencias: r.tendencias, ...campos } });
  await guardarRadar(fresh);
  await addQuota(takeUnits());
  if (quotaError) throw quotaError;
  const antesIds = ctx.antes;
  return { novos: itens.filter((x) => !antesIds.has(x.id)).length, canais: canais.length, feeds, viaApi, comentarios, errors, radar: fresh };
}

/**
 * Fora da bolha: procura vídeos recentes sobre um caso português em canais que não estão no Placar
 * e vê quais são de fora de Portugal (país do canal ou língua do vídeo). 100 unidades + 2.
 * Só conta um vídeo que fala mesmo do Youtuber do caso (no título ou na descrição).
 */
export async function procurarForaDaBolha(db, casoId, { radar = null } = {}) {
  const r = radar || (await lerRadar());
  const caso = (r.casos || []).find((c) => c.id === casoId);
  if (!caso) throw new Error("Esse caso já não está a crescer.");
  const pessoas = caso.chaves.filter((k) => k.startsWith("p:")).map((k) => db.people[k.slice(2)]).filter(Boolean);
  if (!pessoas.length) throw new Error("Só dá para ver fora da bolha nos casos com Youtubers do Placar.");
  const ind = await lerIndice();
  const assunto = caso.chaves.find((k) => k.startsWith("e:"));
  const q = [pessoas[0].name, assunto ? ind.disp[assunto] || assunto.slice(2) : ""].filter(Boolean).join(" ");
  const depois = new Date(Date.parse(caso.desde || Date.now()) - 2 * 864e5).toISOString();
  const ids = await procurarVideos(q, { depois, max: 25 });
  const vids = ids.length ? await videosByIds(ids) : [];
  const meus = new Set([...Object.keys(db.channels), ...(r.regras.extras || []).map((e) => e.id)]);
  const nomes = nomesDosYoutubers(db).filter((y) => pessoas.some((p) => p.id === y.id));
  const fala = (texto, n) => (n.startsWith("@") ? texto.includes(n) : ` ${texto} `.includes(` ${n} `));
  const falam = vids.filter((v) => !meus.has(v.ch) && nomes.some((y) => y.nomes.some((n) => fala(norm(v.t + " " + v.desc), n))));
  const chans = falam.length ? new Map((await channelsByIds(falam.map((v) => v.ch))).map((c) => [c.id, c])) : new Map();
  const videos = falam.map((v) => {
    const c = chans.get(v.ch);
    const pais = c?.country || "";
    const lingua = v.lang || "";
    const fora = (pais && pais !== "PT") || (lingua && !/^pt(-PT)?$/i.test(lingua));
    const onde = pais && pais !== "PT" ? pais : lingua && !/^pt(-PT)?$/i.test(lingua) ? lingua : pais || lingua;
    return { id: v.id, t: v.t.slice(0, 160), ch: v.ch, n: c?.title || v.chT || "", pais, lingua, onde, fora, v: v.v, p: v.p, th: v.th };
  });
  videos.sort((a, b) => (b.fora ? 1 : 0) - (a.fora ? 1 : 0));
  const res = { at: new Date().toISOString(), q, fora: videos.filter((v) => v.fora).length, paises: [...new Set(videos.filter((v) => v.fora).map((v) => v.onde))].slice(0, 8), videos: videos.slice(0, 15) };
  const fresh = await lerRadar();
  fresh.bolha = { ...Object.fromEntries(Object.entries(fresh.bolha || {}).filter(([, b]) => Date.now() - Date.parse(b.at) < 10 * 864e5)), [casoId]: res };
  await guardarRadar(fresh);
  await addQuota(takeUnits());
  return { bolha: res, radar: fresh };
}

/**
 * A ronda diária do radar: todos os Youtubers do Placar e os canais extra, aos bocados (a função corre
 * de hora a hora e continua de onde ficou). Os escolhidos vão primeiro e têm os comentários primeiro.
 * No fim, se estiver ligado, vê se o caso português mais forte saiu da bolha (100 unidades, 1 por dia).
 */
export async function rondaDoRadar(db, { tempo = 15000, parte = 40 } = {}) {
  const inicio = Date.now();
  let radar = await lerRadar();
  // Duas rondas por dia: de manhã (a partir das 7h) e ao fim do dia (a partir das 19h), hora de Lisboa
  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(new Date()));
  if (hora < 7 && radar.ronda?.dia !== `${todayLisbon(new Date(Date.now() - 864e5))}-2`) return { cedo: true };
  const id = hora < 7 ? `${todayLisbon(new Date(Date.now() - 864e5))}-2` : `${todayLisbon()}-${hora >= 19 ? 2 : 1}`;
  let ronda = radar.ronda?.dia === id ? radar.ronda : { dia: id, desde: 0, com: 0, inicio: new Date().toISOString() };
  if (ronda.fim) return { feito: true, ronda };
  const regras = radar.regras;
  const prioridade = new Set(canaisDoGrupo(db, regras, "escolhidos").map((c) => c.id));
  const todos = canaisDoGrupo(db, regras, "todos").sort((a, b) => (prioridade.has(b.id) ? 1 : 0) - (prioridade.has(a.id) ? 1 : 0));
  ronda.total = todos.length;
  const resumo = { canais: 0, novos: 0, feeds: 0, erros: 0 };
  while (ronda.desde < todos.length && Date.now() - inicio < tempo) {
    const bocado = todos.slice(ronda.desde, ronda.desde + parte);
    const res = await procurarRadar(db, bocado, {
      radar,
      // A API (quando o feed falha) só para os escolhidos
      permitirApi: bocado.some((c) => prioridade.has(c.id)),
      maxApi: 10,
      // Os comentários do dia ficam metade para cada ronda
      comentariosMax: Math.max(0, Math.min(20, Math.round((regras.comentariosDia ?? 60) / 2) - ronda.com)),
      prioridade,
      tendencias: true,
      campos: { ronda: { ...ronda, desde: ronda.desde + bocado.length } },
    });
    ronda = { ...ronda, desde: ronda.desde + bocado.length, com: ronda.com + res.comentarios };
    radar = res.radar;
    Object.assign(resumo, { canais: resumo.canais + bocado.length, novos: resumo.novos + res.novos, feeds: resumo.feeds + res.feeds, erros: resumo.erros + res.errors.length });
  }
  if (ronda.desde >= todos.length) {
    ronda.fim = new Date().toISOString();
    // Fora da bolha: o caso português mais forte que ainda não foi visto nos últimos 3 dias
    const caso = regras.bolhaAuto && (radar.casos || []).find((c) => c.nat === "pt" && c.chaves.some((k) => k.startsWith("p:")) && c.canais >= 3 && !(Date.now() - Date.parse(radar.bolha?.[c.id]?.at || 0) < 3 * 864e5));
    if (caso) {
      try {
        radar = (await procurarForaDaBolha(db, caso.id, { radar })).radar;
        resumo.bolha = caso.titulo;
      } catch (e) {
        resumo.bolhaErro = e.message;
      }
    }
    const fresh = await lerRadar();
    fresh.ronda = ronda;
    await guardarRadar(fresh);
  }
  return { ...resumo, ronda };
}

/** Vai buscar os vídeos de um projeto (playlist e/ou lista de vídeos). */
export async function fetchProjectVideos(project) {
  const src = project.source || {};
  let ids = [...(src.videoIds || [])];
  let info = null;
  if (src.playlistId) {
    info = await playlistInfo(src.playlistId).catch(() => null);
    ids = [...(await playlistVideoIds(src.playlistId, 300)), ...ids];
  }
  ids = [...new Set(ids)].filter((id) => !(src.exclude || []).includes(id));
  const vids = ids.length ? await videosByIds(ids) : [];
  const order = new Map(ids.map((id, i) => [id, i]));
  vids.sort((a, b) => (a.p || "").localeCompare(b.p || "") || order.get(a.id) - order.get(b.id));
  return {
    at: new Date().toISOString(),
    playlist: info,
    videos: vids.map(({ id, t, p, d, v, l, c, ch, th }) => ({ id, t, p, d, v, l, c, ch, th })),
  };
}

export async function refreshProjects(db, { limit = 4, only } = {}) {
  const projvids = await getJSON("projvids", {});
  let list = Object.values(db.projects).filter((p) => p.source && (p.source.playlistId || p.source.videoIds?.length));
  if (only) list = list.filter((p) => only.includes(p.id));
  list.sort((a, b) => (projvids[a.id]?.at || "").localeCompare(projvids[b.id]?.at || ""));
  list = list.slice(0, limit);
  for (const p of list) {
    projvids[p.id] = await fetchProjectVideos(p);
  }
  if (list.length) await setJSON("projvids", projvids);
  await addQuota(takeUnits());
  return { projects: list.length };
}
