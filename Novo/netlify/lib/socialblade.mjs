// Importação dos dados recolhidos pelo marcador (bookmarklet) do Social Blade.

import { getJSON, setJSON } from "./storage.mjs";
import { todayLisbon } from "./util.mjs";

/** Valida e limpa o que vem do marcador. */
export function cleanPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Dados do Social Blade inválidos.");
  const monthly = [];
  for (const m of payload.monthly || []) {
    const month = String(m.month || "").slice(0, 7);
    const views = Math.round(Number(m.views));
    if (/^\d{4}-\d{2}$/.test(month) && Number.isFinite(views) && views >= 0) monthly.push({ month, views });
  }
  const daily = [];
  for (const d of payload.daily || []) {
    const date = String(d.date || "").slice(0, 10);
    const views = Math.round(Number(d.views));
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(views) && views > 0) {
      daily.push({ date, views, subs: Number(d.subs) || null, videos: Number(d.videos) || null });
    }
  }
  daily.sort((a, b) => a.date.localeCompare(b.date));
  return {
    channelId: /^UC[a-zA-Z0-9_-]{22}$/.test(payload.channelId || "") ? payload.channelId : "",
    handle: String(payload.handle || "").replace(/^@/, "").trim(),
    title: String(payload.title || "").slice(0, 200),
    url: String(payload.url || "").slice(0, 300),
    monthly,
    daily,
  };
}

/** Procura o canal na base de dados pelo ID ou pelo @handle. */
export function findChannel(db, stats, data) {
  if (data.channelId && db.channels[data.channelId]) return data.channelId;
  if (data.handle) {
    const h = data.handle.toLowerCase();
    for (const link of Object.values(db.channels)) {
      const hh = (stats[link.id]?.handle || link.handle || "").replace(/^@/, "").toLowerCase();
      if (hh && hh === h) return link.id;
    }
  }
  return "";
}

/**
 * Grava os meses no canal (ou na pessoa, se ainda não tem canal ligado)
 * e usa os totais diários como ponto de partida da recolha do mês atual.
 */
export async function applyImport(db, data, { channelId, personId }) {
  const months = applyMonths(db, data.monthly, { channelId, personId });
  const days = channelId && data.daily.length ? await applyDaily([{ channelId, daily: data.daily }]) : 0;
  return { months, days };
}

export function applyMonths(db, monthly, { channelId, personId }) {
  const curM = todayLisbon().slice(0, 7);
  const target = channelId ? db.channels[channelId] : db.people[personId];
  if (!target) throw new Error("Escolhe o canal ou a pessoa para estes dados.");
  target.monthly ||= {};
  let months = 0;
  for (const { month, views } of monthly) {
    if (month >= curM) continue; // o mês atual ainda não acabou
    if (target.monthly[month]?.lock) continue;
    target.monthly[month] = { v: views, src: "socialblade" };
    months++;
  }
  return months;
}

/** Totais diários de vários canais, lendo e gravando cada mês uma só vez. */
export async function applyDaily(lista) {
  const porMes = {};
  for (const { channelId, daily } of lista) for (const d of daily) ((porMes[d.date.slice(0, 7)] ||= {})[channelId] ||= []).push(d);
  if (!Object.keys(porMes).length) return 0;
  const ytstart = await getJSON("ytstart", {});
  let days = 0;
  for (const [M, canais] of Object.entries(porMes)) {
    const snap = await getJSON("snap/" + M, {});
    for (const [channelId, list] of Object.entries(canais)) {
      list.sort((a, b) => a.date.localeCompare(b.date));
      const ch = (snap[channelId] ||= {});
      const st = ((ytstart[channelId] ||= {})[M] ||= { v: list[0].views, d: Number(list[0].date.slice(8)) });
      for (const d of list) {
        const day = Number(d.date.slice(8));
        if (!ch[day]) {
          ch[day] = [d.views, d.subs, d.videos];
          days++;
        }
        if (day < st.d) {
          st.v = d.views;
          st.d = day;
        }
        if (!st.ed || day > st.ed) {
          st.ev = d.views;
          st.ed = day;
        }
      }
    }
    await setJSON("snap/" + M, snap);
  }
  await setJSON("ytstart", ytstart);
  return days;
}

// ---------- Dados extra do Social Blade (subscritores, vídeos, semanas, redes) ----------

const numeros = (arr, max) => (Array.isArray(arr) ? arr.slice(0, max).map((x) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? null : Math.round(Number(x)))) : []);
function colunas(c, re, max) {
  if (!c || typeof c.ini !== "string" || !re.test(c.ini) || !Array.isArray(c.v)) return null;
  return { ini: c.ini, v: numeros(c.v, max), s: numeros(c.s, max), n: numeros(c.n, max) };
}

/** Valida os dados extra que vêm do marcador. */
export function cleanExtra(sb) {
  if (!sb || typeof sb !== "object") return null;
  const i = sb.info && typeof sb.info === "object" ? sb.info : null;
  const out = {
    at: /^\d{4}-\d{2}-\d{2}T/.test(sb.at || "") ? sb.at : new Date().toISOString(),
    info: i
      ? {
          nome: String(i.nome || "").slice(0, 120),
          handle: String(i.handle || "").slice(0, 60),
          pais: String(i.pais || "").slice(0, 4),
          tipo: String(i.tipo || "").slice(0, 30),
          criado: /^\d{4}-\d{2}-\d{2}$/.test(i.criado || "") ? i.criado : "",
          kids: i.kids === true,
          redes: (Array.isArray(i.redes) ? i.redes : []).filter((u) => typeof u === "string" && /^https?:\/\/[^\s"<>]+$/.test(u)).slice(0, 12),
          subs: Number.isFinite(Number(i.subs)) ? Number(i.subs) : null,
          views: Number.isFinite(Number(i.views)) ? Number(i.views) : null,
          videos: Number.isFinite(Number(i.videos)) ? Number(i.videos) : null,
        }
      : null,
    m: colunas(sb.m, /^\d{4}-\d{2}$/, 240),
    d: colunas(sb.d, /^\d{4}-\d{2}-\d{2}$/, 120),
    w: colunas(sb.w, /^\d{4}-\d{2}-\d{2}$/, 160),
  };
  return out.info || out.m || out.d || out.w ? out : null;
}

/** Totais diários (views, subs, vídeos) a partir das colunas diárias. */
export function dailyFromExtra(x) {
  if (!x?.d) return [];
  const ini = Date.parse(x.d.ini + "T00:00:00Z");
  const out = [];
  x.d.v.forEach((v, i) => {
    if (!v) return;
    out.push({ date: new Date(ini + i * 86400000).toISOString().slice(0, 10), views: v, subs: x.d.s[i] ?? null, videos: x.d.n[i] ?? null });
  });
  return out;
}

export async function saveExtras(mapa) {
  if (!Object.keys(mapa).length) return;
  const todos = await getJSON("sbextra", {});
  Object.assign(todos, mapa);
  await setJSON("sbextra", todos);
}

const DOMINIOS = [
  ["instagram", /(^|\.)instagram\.com$/],
  ["tiktok", /(^|\.)tiktok\.com$/],
  ["twitch", /(^|\.)twitch\.tv$/],
  ["x", /(^|\.)(x|twitter)\.com$/],
  ["kick", /(^|\.)kick\.com$/],
];

/** Preenche os links das redes sociais que ainda estão vazios. Nunca substitui um link escrito à mão. */
export function fillSocials(db, personId, urls) {
  const p = db.people[personId];
  if (!p || !urls?.length) return 0;
  p.socials ||= {};
  let n = 0;
  for (const u of urls) {
    let host;
    try {
      host = new URL(u).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) continue;
    const rede = (DOMINIOS.find(([, re]) => re.test(host)) || ["site"])[0];
    if (p.socials[rede]?.url) continue;
    p.socials[rede] = { ...(p.socials[rede] || {}), url: u, entries: p.socials[rede]?.entries || [] };
    n++;
  }
  if (n) p.updatedAt = new Date().toISOString();
  return n;
}

// ---------- TikTok (pelo Social Blade) ----------

const numOuNull = (x) => (x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? null : Math.round(Number(x)));
function colunasTT(c, re, max) {
  if (!c || typeof c.ini !== "string" || !re.test(c.ini) || !Array.isArray(c.f)) return null;
  return { ini: c.ini, f: numeros(c.f, max), l: numeros(c.l, max), n: numeros(c.n, max) };
}

/** Valida os dados do TikTok que vêm do marcador: perfil, ganhos por mês e totais por dia. */
export function cleanTikTok(tt) {
  if (!tt || typeof tt !== "object" || !tt.info || typeof tt.info !== "object") return null;
  const i = tt.info;
  const user = String(i.user || "").replace(/^@/, "").trim();
  if (!/^[\w.]{2,40}$/.test(user)) return null;
  return {
    at: /^\d{4}-\d{2}-\d{2}T/.test(tt.at || "") ? tt.at : new Date().toISOString(),
    info: {
      id: /^\d{1,30}$/.test(String(i.id || "")) ? String(i.id) : "",
      user,
      nome: String(i.nome || "").slice(0, 120),
      seg: numOuNull(i.seg),
      gostos: numOuNull(i.gostos),
      videos: numOuNull(i.videos),
      criado: /^\d{4}-\d{2}-\d{2}$/.test(i.criado || "") ? i.criado : "",
    },
    m: colunasTT(tt.m, /^\d{4}-\d{2}$/, 120),
    d: colunasTT(tt.d, /^\d{4}-\d{2}-\d{2}$/, 120),
  };
}

const mesMais = (ini, i) => {
  const [y, m] = ini.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7);
};
const fimDoMes = (m) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
};

/**
 * Liga o TikTok a uma pessoa: preenche o link (se estiver vazio) e junta ao histórico de números
 * o total de hoje e o total no fim de cada um dos últimos 12 meses (total de hoje menos os ganhos
 * dos meses seguintes). Os números escritos à mão nunca são substituídos.
 */
export function applyTikTok(db, personId, tt) {
  const p = db.people[personId];
  if (!p || !tt) return 0;
  p.socials ||= {};
  const s = (p.socials.tiktok ||= { url: "", entries: [] });
  s.entries ||= [];
  if (!s.url) s.url = `https://www.tiktok.com/@${tt.info.user}`;
  if (!s.handle) s.handle = tt.info.user;
  const novos = [];
  const hoje = tt.at.slice(0, 10);
  if (tt.info.seg !== null) novos.push({ date: hoje, followers: tt.info.seg, likes: tt.info.gostos ?? undefined, videos: tt.info.videos ?? undefined, src: "socialblade" });
  if (tt.m && tt.info.seg !== null) {
    const meses = tt.m.f.map((_, i) => mesMais(tt.m.ini, i));
    let f = tt.info.seg;
    let l = tt.info.gostos;
    let n = tt.info.videos;
    for (let i = meses.length - 1; i >= 0 && novos.length < 13; i--) {
      const m = meses[i];
      if (fimDoMes(m) < hoje) novos.push({ date: fimDoMes(m), followers: Math.max(0, f), likes: l ?? undefined, videos: n ?? undefined, src: "socialblade" });
      // Antes deste mês: tira os ganhos do próprio mês
      f -= tt.m.f[i] || 0;
      if (l !== null) l -= tt.m.l[i] || 0;
      if (n !== null) n -= tt.m.n[i] || 0;
    }
  }
  let mudou = 0;
  for (const e of novos) {
    for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
    const i = s.entries.findIndex((x) => x.date === e.date);
    if (i >= 0 && s.entries[i].src !== "socialblade") continue;
    if (i >= 0) s.entries[i] = e;
    else s.entries.push(e);
    mudou++;
  }
  s.entries.sort((a, b) => a.date.localeCompare(b.date));
  if (mudou) p.updatedAt = new Date().toISOString();
  return mudou;
}

export async function saveTikToks(mapa) {
  if (!Object.keys(mapa).length) return;
  const todos = await getJSON("ttextra", {});
  Object.assign(todos, mapa);
  await setJSON("ttextra", todos);
}
