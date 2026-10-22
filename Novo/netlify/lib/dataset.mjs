// Junta tudo (base de dados + recolha automática) num único "dataset" que o site lê.

import { getJSON, setJSON } from "./storage.mjs";
import { todayLisbon, nextMonth, daysInMonth, monthRange, median } from "./util.mjs";
import { hasApiKey } from "./youtube.mjs";
import { adminEnabled } from "./auth.mjs";

/** Views ganhas por mês a partir dos registos diários do YouTube. */
export function ytMonthly(starts = {}, today = todayLisbon()) {
  const curM = today.slice(0, 7);
  const out = {};
  for (const M of Object.keys(starts).sort()) {
    const s = starts[M];
    const dim = daysInMonth(M);
    const n = starts[nextMonth(M)];
    let gained;
    let days;
    let full = false;
    if (n) {
      gained = n.v - s.v;
      days = dim - s.d + (n.d - 1);
      full = s.d <= 1 && n.d <= 2;
    } else if (s.ev !== undefined && s.ed > s.d) {
      gained = s.ev - s.v;
      days = s.ed - s.d;
    } else {
      continue;
    }
    if (days <= 0) continue;
    gained = Math.max(0, gained);
    const entry = { v: Math.round(gained), src: "youtube" };
    if (!full) {
      entry.p = 1;
      entry.days = days;
      entry.est = Math.round((gained / days) * dim);
      if (M === curM) entry.cur = 1;
    }
    out[M] = entry;
  }
  return out;
}

function pickChannelMonth(yt, manual) {
  if (manual?.lock) return manual;
  if (yt && !yt.p) return yt;
  if (manual) return manual;
  return yt || null;
}

function combine(values) {
  const list = values.filter(Boolean);
  if (!list.length) return null;
  const srcs = new Set(list.map((v) => v.src));
  const out = { v: list.reduce((a, v) => a + (v.v || 0), 0), src: srcs.size === 1 ? [...srcs][0] : "misto" };
  if (list.some((v) => v.p)) {
    out.p = 1;
    out.est = list.reduce((a, v) => a + (v.est ?? v.v ?? 0), 0);
    if (list.some((v) => v.cur)) out.cur = 1;
  }
  return out;
}

function socialSummary(socials = {}) {
  const out = {};
  for (const [k, s] of Object.entries(socials)) {
    if (!s) continue;
    const entries = [...(s.entries || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    out[k] = { url: s.url || "", handle: s.handle || "", entries, last: entries[entries.length - 1] || null };
  }
  return out;
}

/** Subscritores ganhos e vídeos publicados por mês (Social Blade), últimos 13 meses. */
function resumoSB(lista) {
  if (!lista.length) return undefined;
  const s = {};
  const n = {};
  for (const x of lista) {
    if (!x.m) continue;
    const [y0, m0] = x.m.ini.split("-").map(Number);
    const mes = (i) => new Date(Date.UTC(y0, m0 - 1 + i, 1)).toISOString().slice(0, 7);
    const vids = limparVideos(x.m.n);
    x.m.s.forEach((v, i) => {
      if (v !== null && v !== undefined) s[mes(i)] = (s[mes(i)] || 0) + Math.max(0, v);
    });
    vids.forEach((v, i) => {
      if (v !== null && v !== undefined) n[mes(i)] = (n[mes(i)] || 0) + v;
    });
  }
  const ultimos = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => a[0].localeCompare(b[0])).slice(-13));
  if (!Object.keys(s).length && !Object.keys(n).length) return undefined;
  return { s: ultimos(s), n: ultimos(n) };
}

/** O Social Blade só começou a contar vídeos a certa altura: os meses antes vêm a 0 e o primeiro traz o total. */
function limparVideos(arr) {
  const n = [...(arr || [])];
  const f = n.findIndex((v) => v > 0);
  if (f < 0) return n.map(() => null);
  const resto = n.slice(f + 1).filter((v) => v !== null).sort((a, b) => a - b);
  const mediana = resto.length ? resto[Math.floor(resto.length / 2)] : 0;
  if (n[f] > 50 && n[f] > 5 * Math.max(1, mediana)) for (let i = 0; i <= f; i++) n[i] = null;
  return n;
}

function personVideoSummary(chIds, vsum) {
  const list = chIds.map((id) => vsum[id]).filter(Boolean);
  if (!list.length) return null;
  const main = list[0];
  const sumV = list.reduce((a, s) => a + s.views90, 0);
  return {
    up30: list.reduce((a, s) => a + s.up30, 0),
    up90: list.reduce((a, s) => a + s.up90, 0),
    sh90: list.reduce((a, s) => a + s.sh90, 0),
    views90: sumV,
    last: list.map((s) => s.last).sort().pop() || "",
    med: main.med,
    medLong: main.medLong,
    medShort: main.medShort,
    avg: main.avg,
    gap: main.gap,
    eng: sumV ? list.reduce((a, s) => a + s.eng * s.views90, 0) / sumV : main.eng,
    top: list.flatMap((s) => s.top || []).sort((a, b) => b.v - a.v).slice(0, 3),
  };
}

function projectSummary(p, pv, baselineOf) {
  const vids = pv?.videos || [];
  const base = {
    id: p.id,
    name: p.name,
    type: p.type || "série",
    personId: p.personId || "",
    guests: p.guests || [],
    description: p.description || "",
    tags: p.tags || [],
    ratings: p.ratings || null,
    cover: p.cover || pv?.playlist?.thumb || vids[0]?.th || "",
    status: p.status || "",
    source: p.source || null,
    at: pv?.at || "",
  };
  if (vids.length) {
    const views = vids.map((v) => v.v);
    const total = views.reduce((a, b) => a + b, 0);
    const best = vids.reduce((a, v) => (v.v > a.v ? v : a), vids[0]);
    const avg = total / vids.length;
    const baseline = baselineOf(p.personId);
    return {
      ...base,
      episodes: vids.length,
      totalViews: total,
      avgViews: Math.round(avg),
      medViews: Math.round(median(views)),
      likes: vids.reduce((a, v) => a + v.l, 0),
      comments: vids.reduce((a, v) => a + v.c, 0),
      duration: vids.reduce((a, v) => a + (v.d || 0), 0),
      first: vids[0].p,
      last: vids[vids.length - 1].p,
      year: Number((vids[0].p || "").slice(0, 4)) || p.year || null,
      best: { id: best.id, t: best.t, v: best.v },
      impact: baseline ? Math.round((avg / baseline) * 100) / 100 : null,
      baseline: baseline || null,
      videos: vids.map(({ id, t, p, v, l, c, d }) => ({ id, t, p, v, l, c, d })),
      auto: true,
    };
  }
  const m = p.manual || {};
  const episodes = Number(m.episodes) || 0;
  const total = Number(m.views) || 0;
  const baseline = baselineOf(p.personId);
  return {
    ...base,
    episodes,
    totalViews: total,
    avgViews: episodes ? Math.round(total / episodes) : 0,
    year: Number(p.year) || null,
    impact: baseline && episodes ? Math.round((total / episodes / baseline) * 100) / 100 : null,
    baseline: baseline || null,
    videos: [],
    auto: false,
  };
}

export async function buildDataset(db) {
  const [stats, ytstart, vsum, projvids, meta, quota, sbextra] = await Promise.all([
    getJSON("stats", {}),
    getJSON("ytstart", {}),
    getJSON("videosummary", {}),
    getJSON("projvids", {}),
    getJSON("meta", {}),
    getJSON("quota", null),
    getJSON("sbextra", {}),
  ]);
  const today = todayLisbon();
  const curM = today.slice(0, 7);
  let firstMonth = curM;
  let trackingSince = null;

  const channels = [];
  const chMonthly = {};
  for (const link of Object.values(db.channels)) {
    const st = stats[link.id] || {};
    const yt = ytMonthly(ytstart[link.id], today);
    const merged = {};
    for (const M of new Set([...Object.keys(yt), ...Object.keys(link.monthly || {})])) {
      const v = pickChannelMonth(yt[M], link.monthly?.[M]);
      if (v) merged[M] = v;
      if (M < firstMonth) firstMonth = M;
    }
    for (const M of Object.keys(ytstart[link.id] || {})) if (!trackingSince || M < trackingSince) trackingSince = M;
    chMonthly[link.id] = merged;
    channels.push({
      id: link.id,
      personId: link.personId,
      role: link.role,
      count: link.count !== false,
      title: st.title || link.title || "",
      handle: st.handle || link.handle || "",
      thumb: st.thumb || link.thumb || "",
      banner: st.banner || "",
      country: st.country || "",
      language: st.language || "",
      publishedAt: st.publishedAt || "",
      description: st.description || "",
      subs: st.subs ?? null,
      hiddenSubs: Boolean(st.hiddenSubs),
      views: st.views ?? null,
      videos: st.videos ?? null,
      at: st.at || "",
      missing: Boolean(st.missing),
      monthly: merged,
      vid: vsum[link.id] || null,
    });
  }
  const chById = new Map(channels.map((c) => [c.id, c]));

  const people = [];
  for (const p of Object.values(db.people)) {
    const chIds = [p.mainChannelId, ...p.channels.filter((c) => c !== p.mainChannelId)].filter((c) => chById.has(c));
    const counted = chIds.filter((c) => chById.get(c).count);
    const months = new Set(Object.keys(p.monthly || {}));
    for (const c of counted) for (const M of Object.keys(chMonthly[c] || {})) months.add(M);
    const monthly = {};
    for (const M of months) {
      if (M < firstMonth) firstMonth = M;
      const own = p.monthly?.[M];
      if (own?.lock) {
        monthly[M] = own;
        continue;
      }
      const fromCh = combine(counted.map((c) => chMonthly[c]?.[M]));
      const val = fromCh || own;
      if (val) monthly[M] = val;
    }
    const withStats = counted.map((c) => chById.get(c)).filter((c) => c.views !== null);
    const main = chById.get(chIds[0]);
    const totals = withStats.length
      ? {
          subs: withStats.reduce((a, c) => a + (c.subs || 0), 0),
          views: withStats.reduce((a, c) => a + (c.views || 0), 0),
          videos: withStats.reduce((a, c) => a + (c.videos || 0), 0),
          src: "youtube",
        }
      : p.legacy?.totalViews || p.legacy?.subs
        ? { subs: p.legacy.subs || null, views: p.legacy.totalViews || null, videos: null, src: "folha" }
        : null;
    const since = withStats.map((c) => c.publishedAt).filter(Boolean).sort()[0] || p.legacy?.createdAt || "";
    people.push({
      id: p.id,
      name: p.name,
      realName: p.realName || "",
      bio: p.bio || "",
      category: p.category || "",
      tags: p.tags || [],
      status: p.status || "ativo",
      hidden: Boolean(p.hidden),
      photo: p.photo || main?.thumb || "",
      banner: main?.banner || "",
      location: p.location || "",
      startedYear: p.startedYear || null,
      mainChannelId: chIds[0] || "",
      channelIds: chIds,
      socials: socialSummary(p.socials),
      monthly,
      totals,
      since,
      legacy: p.legacy?.pontuacao ? { pontuacao: p.legacy.pontuacao } : {},
      vid: personVideoSummary(counted, vsum),
      sb: resumoSB(counted.map((c) => sbextra[c]).filter(Boolean)),
      updatedAt: p.updatedAt || "",
    });
  }

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const baselineOf = (pid) => {
    const p = peopleById.get(pid);
    return p?.vid ? p.vid.medLong || p.vid.med || null : null;
  };
  const projects = Object.values(db.projects).map((p) => projectSummary(p, projvids[p.id], baselineOf));

  const categories = [...new Set(people.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));

  return {
    generatedAt: new Date().toISOString(),
    today,
    currentMonth: curM,
    months: monthRange(firstMonth, curM),
    settings: { weights: db.settings.weights, alcanceTopo: db.settings.alcanceTopo, siteTitle: db.settings.siteTitle },
    categories,
    people,
    channels,
    projects,
    meta: {
      lastDaily: meta.lastDaily || null,
      lastVideos: meta.lastVideos || null,
      trackingSince,
      hasApiKey: hasApiKey(),
      adminEnabled: adminEnabled(),
      seededFrom: db.seededFrom || null,
      quota: quota ? { day: quota.day, used: quota.used } : null,
    },
  };
}

/** Reconstrói o dataset e guarda-o (chamado depois de cada alteração ou recolha). */
export async function rebuild(db) {
  const ds = await buildDataset(db);
  await setJSON("dataset", ds);
  return ds;
}

/** Versão pública: sem pessoas escondidas e sem notas privadas. */
export function publicDataset(ds) {
  const hidden = new Set(ds.people.filter((p) => p.hidden).map((p) => p.id));
  if (!hidden.size) return ds;
  return {
    ...ds,
    people: ds.people.filter((p) => !hidden.has(p.id)),
    channels: ds.channels.filter((c) => !hidden.has(c.personId)),
    projects: ds.projects.map((p) => ({ ...p, guests: p.guests.filter((g) => !hidden.has(g)) })).filter((p) => !hidden.has(p.personId)),
  };
}
