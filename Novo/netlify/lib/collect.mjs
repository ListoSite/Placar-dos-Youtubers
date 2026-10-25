// Recolha automática de dados do YouTube.
//  - runDaily():   números de todos os canais (1 unidade por cada 50 canais)
//  - runVideos():  últimos vídeos de alguns canais de cada vez (≈3 unidades por canal)
//  - refreshProjects(): vídeos dos projetos (playlists ou listas de vídeos)

import { getJSON, setJSON } from "./storage.mjs";
import { channelsByIds, recentUploads, playlistVideoIds, videosByIds, playlistInfo, takeUnits, comentariosDe } from "./youtube.mjs";
import { lerRadar, radarCanal, guardarRadar } from "./radar.mjs";
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
 * Radar do Caso: lê os últimos 15 vídeos de cada canal (cerca de 3 unidades da quota por canal,
 * mais 1 por cada vídeo com comentários lidos) e junta ao radar os que podem dar notícia.
 */
export async function procurarRadar(db, canais, { radar = null, guardar = true } = {}) {
  const r = radar || (await lerRadar());
  const vsum = await getJSON("videosummary", {});
  const antes = r.itens.length;
  const errors = [];
  let quotaError = null;
  await pool(canais, 4, async (canal) => {
    if (quotaError) return;
    try {
      const items = await recentUploads(canal.id, 15);
      await radarCanal(db, r, canal, items, { mediana: vsum[canal.id]?.med || 0, buscarComentarios: (v) => comentariosDe(v) });
    } catch (e) {
      errors.push(`${canal.id}: ${e.message}`);
      if (/quota/i.test(e.message)) quotaError = e;
    }
  });
  r.ultima = new Date().toISOString();
  if (guardar) await guardarRadar(r);
  await addQuota(takeUnits());
  if (quotaError) throw quotaError;
  return { novos: r.itens.length - antes, canais: canais.length, errors };
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
