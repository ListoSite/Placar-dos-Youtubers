// API do Placar dos Youtubers.
// Público (página pública): GET /api/publico, /api/votacoes, /api/status, POST /api/login
// Painel (precisa do token obtido no login): GET /api/dataset, /api/videos, /api/daily, /api/sb,
//   /api/palco/historico e tudo em /api/admin/...

import { json, todayLisbon, pool } from "../lib/util.mjs";
import { getJSON, setJSON, listKeys, lerLinhas, adicionarLinhas, armazenamentoAtual, estadoSupabase, migrarParaSupabase } from "../lib/storage.mjs";
import { dadosPublicos, guardarPublicacao, listarPublicacoes, mudarPublicacao, apagarPublicacao, COLECAO_PUB } from "../lib/publico.mjs";
import { listarVotacoes, guardarVotacao, apagarVotacao, configPublica, mudarEstado, resolverVotacao, criarTorneio, avancarTorneio, apagarTorneio } from "../lib/votacoes.mjs";
import { lerConfig, guardarConfig, datasetPublico, configPublicaVitrine, canalPublico, BLOCOS, ABAS } from "../lib/vitrine.mjs";
import { guardarResultados, resumoHistorico, COLECAO as COLECAO_PALCO } from "../lib/historico.mjs";
import { adminEnabled, checkPassword, createToken, verifyToken, tokenFromRequest, googleLigado, googleClientId, verificarGoogle } from "../lib/auth.mjs";
import { loadDB, saveDB, newPerson, attachChannel, detachChannel, mergePeople, deletePerson, PERSON_FIELDS, DEFAULT_SETTINGS } from "../lib/db.mjs";
import { rebuild, publicDataset } from "../lib/dataset.mjs";
import { runDaily, runVideos, refreshProjects, fetchProjectVideos, storeChannelNumbers, addQuota } from "../lib/collect.mjs";
import {
  hasApiKey, takeUnits, resolveChannel, channelsByIds, searchChannels, featuredChannels,
  handleGuesses, parseProjectSource, playlistInfo,
} from "../lib/youtube.mjs";
import { cleanPayload, findChannel, applyImport, applyMonths, applyDaily, cleanExtra, dailyFromExtra, saveExtras, fillSocials, cleanTikTok, applyTikTok, saveTikToks } from "../lib/socialblade.mjs";
import { estimarPessoa, apagarEstimativas, unidadesUsadas } from "../lib/estimate.mjs";

export const config = { path: "/api/*" };

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function body(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function originOf(req) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

async function getDataset(req) {
  let ds = await getJSON("dataset");
  if (!ds || ds.today !== todayLisbon()) {
    const db = await loadDB(originOf(req));
    ds = await rebuild(db);
  }
  return ds;
}

function knownSets(db) {
  return { known: new Set(Object.keys(db.channels)), rejected: new Set(Object.keys(db.rejected)) };
}

function markCandidates(db, chans) {
  const { known, rejected } = knownSets(db);
  return chans.map((c) => ({
    ...c,
    linkedTo: known.has(c.id) ? db.channels[c.id].personId : null,
    rejected: rejected.has(c.id) ? db.rejected[c.id] : null,
  }));
}

function sanitizePerson(input, existing) {
  const out = {};
  for (const k of PERSON_FIELDS) if (k in input) out[k] = input[k];
  if ("tags" in out) out.tags = (Array.isArray(out.tags) ? out.tags : String(out.tags).split(",")).map((t) => String(t).trim()).filter(Boolean);
  if ("name" in out) out.name = String(out.name).trim() || existing?.name || "Sem nome";
  if ("mainChannelId" in out && existing && out.mainChannelId && !existing.channels.includes(out.mainChannelId)) delete out.mainChannelId;
  return out;
}

const publicRoutes = {
  "GET dataset": async (req) => {
    const ds = await getDataset(req);
    return json(publicDataset(ds), 200, { "cache-control": "public, max-age=60" });
  },
  "GET videos": async (req, url) => {
    const id = url.searchParams.get("channel") || "";
    const v = await getJSON("videos/" + id.replace(/[^a-zA-Z0-9_-]/g, ""), { items: [] });
    return json(v, 200, { "cache-control": "public, max-age=300" });
  },
  "GET daily": async (req, url) => {
    const ids = (url.searchParams.get("channels") || "").split(",").filter(Boolean).slice(0, 10);
    const n = Math.min(Number(url.searchParams.get("months")) || 3, 12);
    const keys = (await listKeys("snap/")).sort().slice(-n);
    const out = {};
    for (const key of keys) {
      const snap = await getJSON(key, {});
      const M = key.slice(5);
      for (const id of ids) if (snap[id]) (out[id] ||= {})[M] = snap[id];
    }
    return json(out, 200, { "cache-control": "public, max-age=600" });
  },
  "GET sb": async (req, url) => {
    const ids = (url.searchParams.get("channels") || "").split(",").filter((x) => /^UC[\w-]{22}$/.test(x)).slice(0, 12);
    const todos = await getJSON("sbextra", {});
    const out = {};
    for (const id of ids) if (todos[id]) out[id] = todos[id];
    return json(out, 200, { "cache-control": "public, max-age=600" });
  },
  // O painel pergunta se a sessão guardada ainda vale (sem dar erro 401 na consola)
  "GET sessao": async (req) => json({ valida: verifyToken(tokenFromRequest(req)) }, 200, { "cache-control": "private, no-store" }),
  "GET status": async () => {
    const meta = await getJSON("meta", {});
    return json({ ok: true, hasApiKey: hasApiKey(), adminEnabled: adminEnabled(), loginGoogle: googleLigado() ? googleClientId() : "", armazenamento: await armazenamentoAtual(), supabase: configPublica(), ...meta });
  },
  "GET votacoes": async () => json({ ...(await listarVotacoes()), supabase: configPublica() }, 200, { "cache-control": "public, max-age=15" }),
  // A página pública: a configuração (o que aparece) e só os dados que podem aparecer
  "GET publico": async (req) => {
    const [ds, cfg, extra] = await Promise.all([getDataset(req), lerConfig(), dadosPublicos()]);
    const pub = datasetPublico(ds, cfg);
    const vivos = new Set(pub.people.map((p) => p.id));
    const pessoas = Object.fromEntries(Object.entries(extra.pessoas || {}).filter(([id]) => vivos.has(id)));
    return json(
      {
        cfg: configPublicaVitrine(cfg),
        ds: pub,
        canal: extra.canal,
        publicacoes: cfg.videos.publicacoes ? extra.publicacoes.slice(0, cfg.videos.n) : [],
        hall: cfg.videos.hall ? extra.hall : {},
        pessoas,
        historico: cfg.perfis.ligado && cfg.perfis.secoes.palco ? historicoPublico(await resumoHistorico(), vivos) : null,
      },
      200,
      { "cache-control": "public, max-age=60" },
    );
  },
  "GET palco/historico": async () => json(await resumoHistorico(), 200, { "cache-control": "public, max-age=60" }),
  "POST login": async (req) => {
    if (!adminEnabled()) throw new HttpError(503, "A edição está desligada: define ADMIN_PASSWORD nas variáveis do Netlify.");
    // Travão contra quem tenta adivinhar a palavra-passe: 8 erros por endereço em 15 minutos, 40 no total
    const ip = (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?").split(",")[0].trim();
    const falhas = await getJSON("login-falhas", {});
    const agora = Date.now();
    for (const [k, v] of Object.entries(falhas)) if (v.ate < agora) delete falhas[k];
    const { password, google } = await body(req);
    // (o limite total só conta para a palavra-passe: o login com Google não se adivinha e continua sempre a funcionar)
    if ((falhas[ip]?.n || 0) >= 8 || (!google && (falhas["*"]?.n || 0) >= 40)) throw new HttpError(429, "Demasiadas tentativas erradas. Espera 15 minutos e tenta outra vez.");
    const falhou = async () => {
      for (const k of google ? [ip] : [ip, "*"]) falhas[k] = { n: (falhas[k]?.n || 0) + 1, ate: falhas[k]?.ate || agora + 15 * 60 * 1000 };
      await setJSON("login-falhas", falhas).catch(() => {});
    };
    if (google) {
      if (!googleLigado()) throw new HttpError(503, "O login com Google não está ligado: define GOOGLE_CLIENT_ID e ADMIN_EMAILS no Netlify.");
      try {
        await verificarGoogle(google);
      } catch (e) {
        await falhou();
        await new Promise((r) => setTimeout(r, 400));
        throw new HttpError(401, e.message);
      }
      return json({ token: createToken() });
    }
    if (!checkPassword(password)) {
      await falhou();
      await new Promise((r) => setTimeout(r, 600));
      throw new HttpError(401, "Palavra-passe errada.");
    }
    return json({ token: createToken() });
  },
};

const adminRoutes = {
  "GET db": async ({ db }) => {
    const [quota, stats] = await Promise.all([getJSON("quota", null), getJSON("stats", {})]);
    return { db, quota, hasApiKey: hasApiKey(), statsCount: Object.keys(stats).length };
  },

  // ---------- Pessoas ----------
  "POST person": async ({ db, b }) => {
    const input = b.person || {};
    let person = input.id ? db.people[input.id] : null;
    if (person) {
      Object.assign(person, sanitizePerson(input, person), { updatedAt: new Date().toISOString() });
    } else {
      const fields = sanitizePerson(input);
      person = newPerson(fields, new Set(Object.keys(db.people)));
      db.people[person.id] = person;
    }
    return { person, save: true };
  },
  "POST person/delete": async ({ db, b }) => {
    deletePerson(db, b.id);
    return { ok: true, save: true };
  },
  "POST person/merge": async ({ db, b }) => {
    mergePeople(db, b.from, b.into);
    return { ok: true, person: db.people[b.into], save: true };
  },
  "POST person/monthly": async ({ db, b }) => {
    const p = db.people[b.personId];
    if (!p) throw new HttpError(404, "Pessoa não encontrada.");
    for (const e of b.entries || []) {
      if (!/^\d{4}-\d{2}$/.test(e.month)) continue;
      if (e.v === null || e.v === "" || e.v === undefined) delete p.monthly[e.month];
      else p.monthly[e.month] = { v: Math.max(0, Math.round(Number(e.v) || 0)), src: e.src || "manual", ...(e.lock ? { lock: 1 } : {}) };
    }
    p.updatedAt = new Date().toISOString();
    return { ok: true, monthly: p.monthly, save: true };
  },
  "POST monthly/bulk": async ({ db, b }) => {
    let n = 0;
    for (const item of b.items || []) {
      const p = db.people[item.personId];
      if (!p) continue;
      for (const e of item.entries || []) {
        if (!/^\d{4}-\d{2}$/.test(e.month) || !Number.isFinite(Number(e.v))) continue;
        if (p.monthly[e.month]?.lock && !b.overwriteLocked) continue;
        p.monthly[e.month] = { v: Math.max(0, Math.round(Number(e.v))), src: e.src === "socialblade" ? "socialblade" : "manual" };
        n++;
      }
      p.updatedAt = new Date().toISOString();
    }
    return { ok: true, saved: n, save: true };
  },
  "POST person/from-channel": async ({ db, b }) => {
    const ch = b.channel?.id ? (await channelsByIds([b.channel.id]))[0] : await resolveChannel(b.input, { allowSearch: false });
    if (!ch) throw new HttpError(404, "Canal não encontrado.");
    if (db.channels[ch.id]) throw new HttpError(409, `Este canal já está no placar (${db.people[db.channels[ch.id].personId]?.name}).`);
    const person = newPerson({ name: b.name || ch.title, category: b.category || "" }, new Set(Object.keys(db.people)));
    db.people[person.id] = person;
    attachChannel(db, person.id, ch, "principal");
    await storeChannelNumbers([ch]);
    return { person, channel: ch, save: true, videosFor: [ch.id] };
  },

  // ---------- Canais ----------
  "POST channel/resolve": async ({ db, b }) => {
    const ch = await resolveChannel(b.input, { allowSearch: Boolean(b.search) });
    if (!ch) throw new HttpError(404, "Não encontrei esse canal. Tenta colar o link do canal.");
    return { channel: markCandidates(db, [ch])[0] };
  },
  "POST channel/link": async ({ db, b }) => {
    const ch = b.channelId ? (await channelsByIds([b.channelId]))[0] : await resolveChannel(b.input, { allowSearch: false });
    if (!ch) throw new HttpError(404, "Canal não encontrado.");
    attachChannel(db, b.personId, ch, b.role || (db.people[b.personId]?.channels.length ? "secundário" : "principal"));
    await storeChannelNumbers([ch]);
    return { channel: ch, person: db.people[b.personId], save: true, videosFor: [ch.id] };
  },
  "POST channel/update": async ({ db, b }) => {
    const link = db.channels[b.channelId];
    if (!link) throw new HttpError(404, "Canal não encontrado.");
    if (b.role) link.role = b.role;
    if ("count" in b) link.count = Boolean(b.count);
    if (b.main) {
      const p = db.people[link.personId];
      if (p) {
        const old = p.mainChannelId;
        if (old && old !== link.id && db.channels[old]?.role === "principal") db.channels[old].role = "secundário";
        p.mainChannelId = link.id;
        link.role = "principal";
      }
    }
    return { channel: link, save: true };
  },
  "POST channel/unlink": async ({ db, b }) => {
    detachChannel(db, b.channelId);
    return { ok: true, save: true };
  },
  "POST channel/monthly": async ({ db, b }) => {
    const link = db.channels[b.channelId];
    if (!link) throw new HttpError(404, "Canal não encontrado.");
    link.monthly ||= {};
    for (const e of b.entries || []) {
      if (!/^\d{4}-\d{2}$/.test(e.month)) continue;
      if (e.v === null || e.v === "" || e.v === undefined) delete link.monthly[e.month];
      else link.monthly[e.month] = { v: Math.max(0, Math.round(Number(e.v) || 0)), src: e.src || "manual", ...(e.lock ? { lock: 1 } : {}) };
    }
    return { ok: true, monthly: link.monthly, save: true };
  },

  // ---------- Ligar a folha antiga aos canais ----------
  "POST match/guess": async ({ db, b }) => {
    const limit = Math.min(Number(b.limit) || 25, 60);
    const pending = Object.values(db.people)
      .filter((p) => !p.channels.length && !db.suggestions[p.id] && !p.noMatch)
      .slice(0, limit);
    let found = 0;
    await pool(pending, 4, async (p) => {
      const tried = [];
      for (const h of handleGuesses(p.name).slice(0, 3)) {
        const ch = await resolveChannel("@" + h).catch(() => null);
        if (ch && !db.channels[ch.id] && !tried.some((t) => t.id === ch.id)) tried.push(ch);
        if (tried.length) break;
      }
      db.suggestions[p.id] = { at: new Date().toISOString(), method: "handle", list: markCandidates(db, tried) };
      if (tried.length) found++;
    });
    const remaining = Object.values(db.people).filter((p) => !p.channels.length && !db.suggestions[p.id] && !p.noMatch).length;
    return { tried: pending.length, found, remaining, save: true };
  },
  "POST match/search": async ({ db, b }) => {
    const p = db.people[b.personId];
    if (!p) throw new HttpError(404, "Pessoa não encontrada.");
    const list = await searchChannels(b.q || p.name, { max: 8 });
    db.suggestions[p.id] = { at: new Date().toISOString(), method: "search", list: markCandidates(db, list) };
    return { suggestion: db.suggestions[p.id], save: true };
  },
  "POST match/clear": async ({ db, b }) => {
    delete db.suggestions[b.personId];
    if (b.noMatch && db.people[b.personId]) db.people[b.personId].noMatch = true;
    return { ok: true, save: true };
  },

  // ---------- Descobrir canais novos ----------
  "POST discover/search": async ({ db, b }) => {
    const list = await searchChannels(b.q, { max: 25, pageToken: b.pageToken });
    return { candidates: markCandidates(db, list), nextPageToken: list.nextPageToken };
  },
  "POST discover/featured": async ({ db, b }) => {
    const limit = Math.min(Number(b.limit) || 25, 50);
    const state = await getJSON("discover", { cursor: 0 });
    const all = Object.keys(db.channels);
    const slice = [];
    for (let i = 0; i < Math.min(limit, all.length); i++) slice.push(all[(state.cursor + i) % all.length]);
    state.cursor = all.length ? (state.cursor + slice.length) % all.length : 0;
    await setJSON("discover", state);
    const { known, rejected } = knownSets(db);
    const counts = new Map();
    await pool(slice, 4, async (id) => {
      for (const f of await featuredChannels(id).catch(() => [])) {
        if (known.has(f) || rejected.has(f)) continue;
        counts.set(f, (counts.get(f) || 0) + 1);
      }
    });
    const chans = await channelsByIds([...counts.keys()]);
    for (const c of chans) c.mentions = counts.get(c.id);
    chans.sort((a, b) => b.mentions - a.mentions || b.subs - a.subs);
    return { candidates: markCandidates(db, chans), scanned: slice.length };
  },
  "POST reject": async ({ db, b }) => {
    db.rejected[b.channelId] = { title: b.title || "", reason: b.reason || "", at: new Date().toISOString() };
    return { ok: true, save: true };
  },
  "POST unreject": async ({ db, b }) => {
    delete db.rejected[b.channelId];
    return { ok: true, save: true };
  },

  // ---------- Projetos ----------
  "POST project/preview": async ({ b }) => {
    const src = parseProjectSource(b.text);
    const info = src.playlistId ? await playlistInfo(src.playlistId) : null;
    return { source: src, playlist: info };
  },
  "POST project": async ({ db, b }) => {
    const input = b.project || {};
    const id = input.id && db.projects[input.id] ? input.id : "pr_" + Date.now().toString(36);
    const old = db.projects[id];
    const p = {
      id,
      name: String(input.name || "Projeto sem nome").trim(),
      type: input.type || "série",
      personId: input.personId || "",
      guests: [...new Set(input.guests || [])].filter((g) => g && g !== input.personId),
      description: input.description || "",
      cover: input.cover || "",
      year: input.year ? Number(input.year) : null,
      tags: input.tags || [],
      status: input.status || "",
      ratings: input.ratings || null,
      manual: input.manual || null,
      source: input.source || null,
      createdAt: old?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (p.source) {
      p.source = {
        playlistId: p.source.playlistId || null,
        videoIds: [...new Set(p.source.videoIds || [])],
        exclude: [...new Set(p.source.exclude || [])],
      };
    }
    db.projects[id] = p;
    const changed = JSON.stringify(old?.source || null) !== JSON.stringify(p.source || null);
    if (p.source && (changed || b.refresh)) {
      const projvids = await getJSON("projvids", {});
      projvids[id] = await fetchProjectVideos(p);
      await setJSON("projvids", projvids);
    }
    return { project: p, save: true };
  },
  "POST project/delete": async ({ db, b }) => {
    delete db.projects[b.id];
    const projvids = await getJSON("projvids", {});
    delete projvids[b.id];
    await setJSON("projvids", projvids);
    return { ok: true, save: true };
  },

  // ---------- Social Blade ----------
  "POST import/socialblade": async ({ db, b }) => {
    const tiktok = cleanTikTok(b.payload?.tt);
    // Só TikTok (marcador aberto numa página de TikTok do Social Blade)
    if (b.payload?.soTikTok) {
      if (!tiktok) throw new HttpError(400, "Não há dados do TikTok para importar.");
      const user = tiktok.info.user.toLowerCase();
      const dono =
        (db.people[b.personId] && b.personId) ||
        Object.values(db.people).find((p) => {
          const s = p.socials?.tiktok;
          return (s?.handle || "").toLowerCase() === user || /tiktok\.com\/@([\w.]+)/i.exec(s?.url || "")?.[1]?.toLowerCase() === user;
        })?.id;
      if (!dono) return { needsTarget: true, tiktok: true, data: { title: tiktok.info.nome || tiktok.info.user, handle: tiktok.info.user, months: tiktok.m ? tiktok.m.f.length : 0, days: 0 } };
      const tt = applyTikTok(db, dono, tiktok);
      await saveTikToks({ [dono]: tiktok });
      return { tiktok: tiktok.info.user, ttEntradas: tt, personId: dono, save: true };
    }
    const data = cleanPayload(b.payload);
    const stats = await getJSON("stats", {});
    let channelId = b.channelId || findChannel(db, stats, data);
    let personId = b.personId || "";
    if (!channelId && personId && hasApiKey() && (data.channelId || data.handle)) {
      const ch = await resolveChannel(data.channelId || "@" + data.handle).catch(() => null);
      if (ch) {
        if (db.channels[ch.id] && db.channels[ch.id].personId !== personId) throw new HttpError(409, "Esse canal está ligado a outra pessoa.");
        if (!db.channels[ch.id]) attachChannel(db, personId, ch, db.people[personId]?.channels.length ? "secundário" : "principal");
        await storeChannelNumbers([ch]);
        channelId = ch.id;
      }
    }
    if (!channelId && !personId) {
      return { needsTarget: true, data: { title: data.title, handle: data.handle, channelId: data.channelId, months: data.monthly.length, days: data.daily.length } };
    }
    const extra = channelId ? cleanExtra(b.payload?.sb) : null;
    if (extra && !data.daily.length) data.daily = dailyFromExtra(extra);
    const result = await applyImport(db, data, { channelId, personId });
    const dono = channelId ? db.channels[channelId].personId : personId;
    let redes = 0;
    if (extra) {
      await saveExtras({ [channelId]: extra });
      redes = fillSocials(db, dono, extra.info?.redes);
    }
    if (tiktok && dono) {
      applyTikTok(db, dono, tiktok);
      await saveTikToks({ [dono]: tiktok });
    }
    return { ...result, redes, extra: Boolean(extra), tiktok: tiktok?.info.user || "", channelId, personId: dono, save: true };
  },

  "POST import/socialblade-lote": async ({ db, b }) => {
    const itens = Array.isArray(b.itens) ? b.itens.slice(0, 80) : [];
    let canais = 0;
    let meses = 0;
    const ignorados = [];
    const extras = {};
    const tiktoks = {};
    const diarios = [];
    let redes = 0;
    for (const it of itens) {
      if (!it || !db.channels[it.channelId]) {
        ignorados.push(it?.channelId || "");
        continue;
      }
      const data = cleanPayload({ channelId: it.channelId, monthly: it.monthly });
      const n = applyMonths(db, data.monthly, { channelId: it.channelId });
      const extra = cleanExtra(it.sb);
      if (extra) {
        extras[it.channelId] = extra;
        diarios.push({ channelId: it.channelId, daily: dailyFromExtra(extra) });
        redes += fillSocials(db, db.channels[it.channelId].personId, extra.info?.redes);
      }
      const tiktok = cleanTikTok(it.tt);
      if (tiktok) {
        const dono = db.channels[it.channelId].personId;
        applyTikTok(db, dono, tiktok);
        tiktoks[dono] = tiktok;
      }
      if (n || extra || tiktok) canais++;
      meses += n;
    }
    await saveExtras(extras);
    await saveTikToks(tiktoks);
    const dias = await applyDaily(diarios);
    return { canais, meses, dias, redes, extras: Object.keys(extras).length, tiktok: Object.keys(tiktoks).length, ignorados, save: canais > 0 };
  },

  // ---------- Estimativa dos meses em falta ----------
  "POST estimate": async ({ db, b }) => {
    try {
      const r = await estimarPessoa(db, b.personId, { forcar: Boolean(b.refresh) });
      return { result: r, save: true };
    } finally {
      const u = unidadesUsadas();
      if (u) await addQuota(u);
    }
  },
  "POST estimate/clear": async ({ db, b }) => {
    const n = apagarEstimativas(db, b.personId || null);
    return { removed: n, save: true };
  },

  // ---------- Recolha manual, definições, cópias ----------
  "POST collect": async ({ db, b }) => {
    const what = b.what || "daily";
    let r;
    if (what === "daily") r = await runDaily(db);
    else if (what === "videos") r = await runVideos(db, { limit: Math.min(Number(b.limit) || 15, 30), only: b.only });
    else if (what === "projects") r = await refreshProjects(db, { limit: Math.min(Number(b.limit) || 4, 10), only: b.only });
    else throw new HttpError(400, "Tipo de recolha desconhecido.");
    return { result: r, rebuild: true };
  },
  "POST settings": async ({ db, b }) => {
    const s = b.settings || {};
    if (s.weights) {
      const w = {};
      for (const k of Object.keys(DEFAULT_SETTINGS.weights)) w[k] = Math.max(0, Number(s.weights[k]) || 0);
      db.settings.weights = w;
    }
    if (s.alcanceTopo) db.settings.alcanceTopo = Math.max(10000, Number(s.alcanceTopo) || DEFAULT_SETTINGS.alcanceTopo);
    if (typeof s.siteTitle === "string" && s.siteTitle.trim()) db.settings.siteTitle = s.siteTitle.trim().slice(0, 80);
    if (s.canal && typeof s.canal === "object") {
      const c = {};
      for (const k of ["nome", "youtube", "tiktok", "instagram", "hashtags"]) c[k] = String(s.canal[k] ?? "").trim().slice(0, k === "hashtags" ? 300 : 80);
      if (!c.nome) c.nome = DEFAULT_SETTINGS.canal.nome;
      db.settings.canal = c;
    }
    return { settings: db.settings, save: true };
  },
  "GET export": async () => {
    const keys = ["db", "stats", "ytstart", "videosummary", "projvids", "meta", "vstate", "sbextra", "ttextra"];
    const out = { kind: "placar-backup", version: 2, at: new Date().toISOString(), data: {} };
    for (const k of keys) out.data[k] = await getJSON(k, null);
    for (const k of await listKeys("snap/")) out.data[k] = await getJSON(k, null);
    out.colecoes = { [COLECAO_PALCO]: await lerLinhas(COLECAO_PALCO), [COLECAO_PUB]: await lerLinhas(COLECAO_PUB) };
    return out;
  },
  "POST import/backup": async ({ b }) => {
    const bk = b.backup;
    if (!bk || bk.kind !== "placar-backup" || !bk.data?.db?.people) throw new HttpError(400, "Ficheiro de cópia inválido.");
    for (const [k, v] of Object.entries(bk.data)) {
      if (v === null) continue;
      if (!/^(db|stats|ytstart|videosummary|projvids|meta|vstate|sbextra|ttextra|snap\/\d{4}-\d{2})$/.test(k)) continue;
      await setJSON(k, v);
    }
    // Histórico do Palco: só entra se ainda estiver vazio (não duplica resultados)
    for (const col of [COLECAO_PALCO, COLECAO_PUB]) {
      const hist = bk.colecoes?.[col];
      if (Array.isArray(hist) && hist.length && !(await lerLinhas(col)).length) await adicionarLinhas(col, hist.map(({ id, ...resto }) => resto));
    }
    const db = await loadDB();
    return { ok: true, people: Object.keys(db.people).length, rebuildWith: db };
  },
  "POST rebuild": async () => ({ ok: true, rebuild: true }),

  // ---------- Histórico do Palco (resultados dos vídeos gravados) ----------
  "POST palco/resultados": async ({ b }) => {
    const n = await guardarResultados(b.resultados, { espetaculo: b.espetaculo, tema: b.tema, formato: b.formato });
    const pub = b.publicacao ? await guardarPublicacao({ ...b.publicacao, espetaculo: b.espetaculo, tema: b.tema, formato: b.formato }) : 0;
    return { ok: true, guardados: n, publicacao: Boolean(pub) };
  },

  // ---------- Vídeos publicados (aparecem na página pública) ----------
  "GET publicacoes": async () => ({ publicacoes: await listarPublicacoes({ todas: true }) }),
  "POST publicacao": async ({ b }) => {
    await mudarPublicacao(b.id, b);
    return { ok: true };
  },
  "POST publicacao/apagar": async ({ b }) => {
    await apagarPublicacao(b.id);
    return { ok: true };
  },

  // ---------- Página pública (o que aparece) ----------
  "GET vitrine": async () => ({ config: await lerConfig(), blocos: BLOCOS, abas: ABAS }),
  "POST vitrine": async ({ b }) => ({ ok: true, config: await guardarConfig(b.config) }),

  // ---------- Votações ----------
  "GET votacoes": async () => listarVotacoes({ todas: true }),
  "POST votacao": async ({ db, b }) => ({ ok: true, id: await guardarVotacao(b.votacao || {}, db) }),
  "POST votacao/apagar": async ({ b }) => {
    await apagarVotacao(b.id);
    return { ok: true };
  },
  "POST votacao/estado": async ({ b }) => {
    await mudarEstado(b.id, b.estado);
    return { ok: true };
  },
  "POST votacao/resolver": async ({ b }) => {
    await resolverVotacao(b.id, b.resultado || null, { fechar: b.fechar !== false });
    return { ok: true };
  },
  "POST torneio": async ({ db, b }) => ({ ok: true, grupo: await criarTorneio(b.torneio || {}, db) }),
  "POST torneio/avancar": async ({ db, b }) => ({ ok: true, ...(await avancarTorneio(b.grupo, b.vencedores || {}, db, { fecha: b.fecha })) }),
  "POST torneio/apagar": async ({ b }) => {
    await apagarTorneio(b.grupo);
    return { ok: true };
  },

  // ---------- Supabase ----------
  "GET supabase": async () => ({ ...(await estadoSupabase()), armazenamento: await armazenamentoAtual() }),
  "POST supabase/migrar": async ({ b }) => {
    const r = await migrarParaSupabase({ colecoes: [COLECAO_PALCO, COLECAO_PUB], inicio: Number(b.inicio) || 0 });
    return { ok: true, ...r };
  },
};

/** O histórico do Palco só com os Youtubers que aparecem na página pública. */
function historicoPublico(h, vivos) {
  const pares = {};
  for (const [k, v] of Object.entries(h.pares || {})) if (k.split("|").every((id) => vivos.has(id))) pares[k] = v;
  const pessoas = Object.fromEntries(Object.entries(h.pessoas || {}).filter(([id]) => vivos.has(id)));
  return { pares, pessoas, classicos: (h.classicos || []).filter((c) => c.par.every((id) => vivos.has(id))) };
}

// Dados do painel: só com sessão iniciada (o painel é só para o dono do site)
const PRIVADAS = new Set(["GET dataset", "GET videos", "GET daily", "GET sb", "GET palco/historico"]);

export default async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  try {
    // Perfil público: vídeos, últimos dias e crescimento de um canal (só o que estiver ligado no painel)
    const mCanal = req.method === "GET" && /^publico\/canal\/(UC[\w-]{22})$/.exec(route);
    if (mCanal) {
      const [ds, cfg] = await Promise.all([getDataset(req), lerConfig()]);
      const r = await canalPublico(ds, cfg, mCanal[1]);
      if (!r) throw new HttpError(404, "Este canal não está disponível.");
      return json(r, 200, { "cache-control": "public, max-age=300" });
    }
    const pub = publicRoutes[`${req.method} ${route}`];
    if (pub && PRIVADAS.has(`${req.method} ${route}`) && !verifyToken(tokenFromRequest(req))) throw new HttpError(401, "Entra no painel para ver estes dados.");
    if (pub) {
      const r = await pub(req, url);
      // Os dados do painel nunca ficam em caches partilhadas (CDN, proxies)
      if (PRIVADAS.has(`${req.method} ${route}`)) r.headers.set("cache-control", "private, no-store");
      return r;
    }

    if (route.startsWith("admin/")) {
      if (!verifyToken(tokenFromRequest(req))) throw new HttpError(401, "Sessão expirada. Entra outra vez.");
      const name = route.slice(6);
      const handler = adminRoutes[`${req.method} ${name}`];
      if (!handler) throw new HttpError(404, "Rota desconhecida.");
      const db = await loadDB(originOf(req));
      const b = req.method === "POST" ? await body(req) : {};
      const result = await handler({ db, b, req, url });
      const units = takeUnits();
      if (units) await addQuota(units);
      let finalDb = db;
      if (result.rebuildWith) finalDb = result.rebuildWith;
      if (result.save) await saveDB(finalDb);
      if (result.videosFor?.length) {
        await runVideos(finalDb, { only: result.videosFor, limit: 5 }).catch((e) => console.error(e.message));
      }
      if (result.save || result.rebuild || result.rebuildWith) await rebuild(finalDb);
      delete result.save;
      delete result.rebuild;
      delete result.rebuildWith;
      delete result.videosFor;
      return json(result);
    }
    throw new HttpError(404, "Rota desconhecida.");
  } catch (e) {
    const units = takeUnits();
    if (units) await addQuota(units).catch(() => {});
    if (!(e instanceof HttpError)) console.error(e);
    return json({ error: e.message || "Erro inesperado." }, e.status || 500);
  }
};
