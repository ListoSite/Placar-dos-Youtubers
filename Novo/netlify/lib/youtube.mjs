// Ligação à YouTube Data API v3 (grátis: 10 000 unidades por dia).
// Custos usados aqui: channels/videos/playlistItems/playlists/channelSections = 1 unidade,
// search = 100 unidades (só usado na descoberta e na procura por nome).

import { mockCall, mockFeed } from "./youtube-mock.mjs";

const API = "https://www.googleapis.com/youtube/v3/";
let unitsThisRequest = 0;

export function hasApiKey() {
  return Boolean(process.env.YOUTUBE_API_KEY) || process.env.YT_MOCK === "1";
}

export function takeUnits() {
  const u = unitsThisRequest;
  unitsThisRequest = 0;
  return u;
}

async function call(endpoint, params, cost = 1) {
  unitsThisRequest += cost;
  if (process.env.YT_MOCK === "1") return mockCall(endpoint, params);
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Falta a chave da API do YouTube (YOUTUBE_API_KEY) nas variáveis do Netlify.");
  const url = new URL(API + endpoint);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  url.searchParams.set("key", key);
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason || "";
    if (reason === "quotaExceeded") throw new Error("A quota diária da API do YouTube acabou. Volta a tentar amanhã (renova à meia-noite da Califórnia).");
    if (res.status === 404 && endpoint === "playlistItems") return { items: [], notFound: true };
    throw new Error(`YouTube API (${endpoint}): ${data?.error?.message || res.status}`);
  }
  return data;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function isoDurationToSeconds(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

function bestThumb(t = {}) {
  return (t.high || t.medium || t.default || {}).url || "";
}

export function normalizeChannel(item) {
  const s = item.snippet || {};
  const st = item.statistics || {};
  const b = item.brandingSettings || {};
  return {
    id: item.id,
    title: s.title || "",
    handle: s.customUrl || "",
    description: (s.description || "").slice(0, 600),
    thumb: bestThumb(s.thumbnails),
    banner: b.image?.bannerExternalUrl || "",
    country: s.country || b.channel?.country || "",
    language: s.defaultLanguage || b.channel?.defaultLanguage || "",
    keywords: (b.channel?.keywords || "").slice(0, 300),
    publishedAt: s.publishedAt || "",
    uploads: item.contentDetails?.relatedPlaylists?.uploads || (item.id ? "UU" + item.id.slice(2) : ""),
    subs: Number(st.subscriberCount || 0),
    hiddenSubs: Boolean(st.hiddenSubscriberCount),
    views: Number(st.viewCount || 0),
    videos: Number(st.videoCount || 0),
  };
}

export function normalizeVideo(item) {
  const s = item.snippet || {};
  const st = item.statistics || {};
  return {
    id: item.id,
    t: s.title || "",
    ch: s.channelId || "",
    p: s.publishedAt || "",
    d: isoDurationToSeconds(item.contentDetails?.duration),
    v: Number(st.viewCount || 0),
    l: Number(st.likeCount || 0),
    c: Number(st.commentCount || 0),
    live: Boolean(item.liveStreamingDetails),
    th: bestThumb(s.thumbnails),
    // Para o Radar do Caso (não ficam guardados com os vídeos)
    desc: String(s.description || "").slice(0, 1500),
    tags: (s.tags || []).slice(0, 20),
    chT: s.channelTitle || "",
    lang: s.defaultAudioLanguage || s.defaultLanguage || "",
  };
}

/** Os comentários mais relevantes de um vídeo (texto), para o Radar do Caso. 1 unidade. */
export async function comentariosDe(videoId, max = 25) {
  const data = await call("commentThreads", { part: "snippet", videoId, maxResults: max, order: "relevance", textFormat: "plainText" });
  return (data.items || []).map((it) => String(it.snippet?.topLevelComment?.snippet?.textDisplay || "").slice(0, 400)).filter(Boolean);
}

/** Dados completos de até N canais (50 por pedido = 1 unidade). */
export async function channelsByIds(ids) {
  const out = [];
  for (const part of chunk([...new Set(ids)].filter(Boolean), 50)) {
    const data = await call("channels", {
      part: "snippet,statistics,contentDetails,brandingSettings",
      id: part.join(","),
      maxResults: 50,
    });
    for (const it of data.items || []) out.push(normalizeChannel(it));
  }
  return out;
}

async function channelBy(param, value) {
  const data = await call("channels", { part: "snippet,statistics,contentDetails,brandingSettings", [param]: value });
  const it = data.items?.[0];
  return it ? normalizeChannel(it) : null;
}

/** Interpreta um link, @handle, ID de canal ou nome de utilizador. */
export function parseChannelInput(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  let m = /(UC[a-zA-Z0-9_-]{22})/.exec(raw);
  if (m) return { type: "id", value: m[1] };
  m = /youtube\.com\/@([^/?#\s]+)/i.exec(raw) || /^@([^\s/]+)$/.exec(raw);
  if (m) return { type: "handle", value: decodeURIComponent(m[1]) };
  m = /youtube\.com\/user\/([^/?#\s]+)/i.exec(raw);
  if (m) return { type: "username", value: m[1] };
  m = /youtube\.com\/c\/([^/?#\s]+)/i.exec(raw);
  if (m) return { type: "custom", value: decodeURIComponent(m[1]) };
  if (/^[^\s]+$/.test(raw) && !/^https?:/i.test(raw)) return { type: "handle", value: raw };
  return { type: "name", value: raw };
}

/**
 * Encontra um canal. Para nomes soltos tenta primeiro o @handle (1 unidade)
 * e só procura (100 unidades) se allowSearch for true.
 */
export async function resolveChannel(input, { allowSearch = false } = {}) {
  const p = parseChannelInput(input);
  if (!p) return null;
  if (p.type === "id") return channelBy("id", p.value);
  if (p.type === "handle") return channelBy("forHandle", "@" + p.value.replace(/^@/, ""));
  if (p.type === "username") return (await channelBy("forUsername", p.value)) || channelBy("forHandle", "@" + p.value);
  if (p.type === "custom") {
    const c = await channelBy("forHandle", "@" + p.value);
    if (c || !allowSearch) return c;
  }
  const compact = p.value.replace(/\s+/g, "");
  if (p.type === "name" && compact.length >= 3) {
    const c = await channelBy("forHandle", "@" + compact);
    if (c) return c;
  }
  if (!allowSearch) return null;
  const list = await searchChannels(p.value, { max: 5 });
  return list[0] || null;
}

/** Variações de @handle a partir de um nome (para ligar a folha antiga sem gastar quota). */
export function handleGuesses(name) {
  const base = String(name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const words = base.replace(/[^a-z0-9 ]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const set = new Set();
  if (!words.length) return [];
  set.add(words.join(""));
  set.add(words.join("_"));
  set.add(words.join("."));
  set.add(words.join("-"));
  set.add(words.join("") + "oficial");
  set.add(words.join("") + "official");
  set.add(words.join("") + "yt");
  return [...set].filter((h) => h.length >= 3 && h.length <= 30).slice(0, 6);
}

/** Procura canais (100 unidades). Filtros de Portugal e língua portuguesa. */
export async function searchChannels(q, { max = 25, region = "PT", lang = "pt", pageToken } = {}) {
  const data = await call(
    "search",
    { part: "snippet", type: "channel", q, maxResults: Math.min(50, max), regionCode: region, relevanceLanguage: lang, pageToken },
    100,
  );
  const ids = (data.items || []).map((i) => i.id?.channelId || i.snippet?.channelId).filter(Boolean);
  const chans = await channelsByIds(ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  chans.sort((a, b) => order.get(a.id) - order.get(b.id));
  chans.nextPageToken = data.nextPageToken || null;
  return chans;
}

/** Canais destacados na página de um canal (1 unidade). */
export async function featuredChannels(channelId) {
  const data = await call("channelSections", { part: "contentDetails", channelId });
  const ids = new Set();
  for (const s of data.items || []) for (const c of s.contentDetails?.channels || []) ids.add(c);
  ids.delete(channelId);
  return [...ids];
}

/** IDs de vídeos de uma playlist (1 unidade por 50). */
export async function playlistVideoIds(playlistId, max = 50) {
  const ids = [];
  let pageToken;
  do {
    const data = await call("playlistItems", { part: "contentDetails", playlistId, maxResults: 50, pageToken });
    if (data.notFound) break;
    for (const it of data.items || []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    pageToken = data.nextPageToken;
  } while (pageToken && ids.length < max);
  return ids.slice(0, max);
}

export async function videosByIds(ids) {
  const out = [];
  for (const part of chunk([...new Set(ids)].filter(Boolean), 50)) {
    const data = await call("videos", { part: "snippet,contentDetails,statistics,liveStreamingDetails", id: part.join(","), maxResults: 50 });
    for (const it of data.items || []) out.push(normalizeVideo(it));
  }
  return out;
}

export async function playlistInfo(playlistId) {
  const data = await call("playlists", { part: "snippet,contentDetails", id: playlistId });
  const it = data.items?.[0];
  if (!it) return null;
  return {
    id: it.id,
    title: it.snippet?.title || "",
    description: (it.snippet?.description || "").slice(0, 1000),
    channelId: it.snippet?.channelId || "",
    thumb: bestThumb(it.snippet?.thumbnails),
    count: it.contentDetails?.itemCount || 0,
  };
}

/**
 * Últimos vídeos de um canal, com a indicação de quais são Shorts.
 * Usa a playlist de uploads (UU…) e a playlist só de Shorts (UUSH…).
 */
export async function recentUploads(channelId, max = 50) {
  const uploads = "UU" + channelId.slice(2);
  const shortsList = "UUSH" + channelId.slice(2);
  const [ids, shortIds] = await Promise.all([
    playlistVideoIds(uploads, max),
    playlistVideoIds(shortsList, 50).catch(() => []),
  ]);
  const vids = await videosByIds(ids);
  const shorts = new Set(shortIds);
  const knownShorts = shortIds.length > 0;
  for (const v of vids) v.s = knownShorts ? shorts.has(v.id) : v.d > 0 && v.d <= 180;
  vids.sort((a, b) => (b.p || "").localeCompare(a.p || ""));
  return vids;
}

// ---------- Feed RSS do canal (não gasta quota) ----------

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const xmlTexto = (s) =>
  String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e] ?? m));

/** Lê o feed RSS de um canal: { id, t, p, v, l, desc, th, s }. */
export function lerFeedXML(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const tag = (re) => (re.exec(e) || [])[1];
    const id = tag(/<yt:videoId>([\w-]{11})<\/yt:videoId>/);
    if (!id) continue;
    out.push({
      id,
      t: xmlTexto(tag(/<title>([\s\S]*?)<\/title>/)).slice(0, 300),
      p: tag(/<published>([^<]+)<\/published>/) || "",
      v: Number(tag(/<media:statistics views="(\d+)"/) || 0),
      l: Number(tag(/<media:starRating count="(\d+)"/) || 0),
      desc: xmlTexto(tag(/<media:description>([\s\S]*?)<\/media:description>/)).slice(0, 1500),
      th: tag(/<media:thumbnail url="([^"]+)"/) || "",
      s: /href="[^"]*\/shorts\//.test(e),
      rss: true,
    });
  }
  return out;
}

/** Os últimos 15 vídeos de um canal pelo feed RSS do YouTube (0 unidades). Dá null se falhar. */
export async function lerFeed(channelId) {
  if (process.env.YT_MOCK === "1") return mockFeed(channelId);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, { signal: ctl.signal, headers: { "user-agent": "Mozilla/5.0 (PlacarDosYoutubers radar)" } });
    if (!r.ok) return null;
    const xml = await r.text();
    return /<feed/.test(xml) ? lerFeedXML(xml) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Os 50 vídeos em tendência em Portugal (1 unidade). */
export async function tendenciasPT(regiao = "PT") {
  const data = await call("videos", { part: "snippet,contentDetails,statistics", chart: "mostPopular", regionCode: regiao, maxResults: 50 });
  return (data.items || []).map(normalizeVideo);
}

/** Procura vídeos (100 unidades). Para ver se um caso saiu da bolha. */
export async function procurarVideos(q, { depois, max = 25 } = {}) {
  const data = await call("search", { part: "snippet", type: "video", q, maxResults: Math.min(50, max), order: "date", publishedAfter: depois }, 100);
  return (data.items || []).map((i) => i.id?.videoId).filter(Boolean);
}

/** Extrai o ID de uma playlist ou de vídeos a partir de links colados. */
export function parseProjectSource(text) {
  const raw = String(text || "");
  const pl = /[?&]list=([a-zA-Z0-9_-]+)/.exec(raw) || /^(PL[a-zA-Z0-9_-]{10,})$/.exec(raw.trim());
  const videoIds = new Set();
  const re = /(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([a-zA-Z0-9_-]{11})/g;
  let m;
  while ((m = re.exec(raw))) videoIds.add(m[1]);
  for (const tok of raw.split(/[\s,;]+/)) if (/^[a-zA-Z0-9_-]{11}$/.test(tok)) videoIds.add(tok);
  return { playlistId: pl ? pl[1] : null, videoIds: [...videoIds] };
}
