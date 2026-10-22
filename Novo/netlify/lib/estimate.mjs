// Estimativa dos meses sem dados (por exemplo agosto 2025 até ao início da recolha).
//
// Ideia: cada vídeo ganha a maior parte das views nas primeiras semanas e depois cada vez menos.
// Sabemos a data de cada vídeo e as views que tem hoje, por isso conseguimos "espalhar" essas views
// pelos meses desde que saiu. Somando todos os vídeos de um canal, temos as views de cada mês.
// A curva (rapidez com que um vídeo junta views) e um fator de escala são afinados para cada
// pessoa com os meses que já conhecemos (folha, Social Blade, YouTube). Assim, o erro nos meses
// conhecidos dá uma ideia da confiança da estimativa.
//
// Uma estimativa nunca passa à frente de dados reais: só preenche meses vazios.

import { getJSON, setJSON } from "./storage.mjs";
import { ytMonthly } from "./dataset.mjs";
import { todayLisbon, monthRange, nextMonth, prevMonth, pool } from "./util.mjs";

const API = "https://www.googleapis.com/youtube/v3/";
const DIA = 86400000;
const CURVAS = [0.5, 1, 2, 3, 5, 8, 12, 18, 25, 35, 50, 75, 110, 160, 240, 365];
export const MAX_VIDEOS = 1000;
export const PRIMEIRO_MES = "2024-12";

let unidades = 0;
export function unidadesUsadas() {
  const u = unidades;
  unidades = 0;
  return u;
}

async function chamar(endpoint, params) {
  unidades += 1;
  if (process.env.YT_MOCK === "1") return mock(endpoint, params);
  const url = new URL(API + endpoint);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY || "");
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data?.error?.errors?.[0]?.reason === "quotaExceeded") throw new Error("A quota diária da API do YouTube acabou. Continua amanhã.");
    if (res.status === 404) return { items: [] };
    throw new Error(`YouTube API (${endpoint}): ${data?.error?.message || res.status}`);
  }
  return data;
}

/** Histórico de vídeos de um canal: [dia de publicação, views de hoje]. Guardado durante 7 dias. */
export async function historico(channelId, { forcar = false } = {}) {
  const chave = "hist/" + channelId;
  const guardado = await getJSON(chave);
  if (guardado && !forcar && Date.now() - Date.parse(guardado.at) < 7 * DIA) return guardado;
  const playlist = "UU" + channelId.slice(2);
  const itens = [];
  let pageToken;
  do {
    const d = await chamar("playlistItems", { part: "contentDetails", playlistId: playlist, maxResults: 50, pageToken });
    for (const it of d.items || []) {
      const id = it.contentDetails?.videoId;
      const p = it.contentDetails?.videoPublishedAt;
      if (id && p) itens.push({ id, dia: Math.floor(Date.parse(p) / DIA) });
    }
    pageToken = d.nextPageToken;
  } while (pageToken && itens.length < MAX_VIDEOS);
  const lotes = [];
  for (let i = 0; i < itens.length; i += 50) lotes.push(itens.slice(i, i + 50));
  const views = new Map();
  await pool(lotes, 4, async (lote) => {
    const d = await chamar("videos", { part: "statistics", id: lote.map((x) => x.id).join(","), maxResults: 50 });
    for (const v of d.items || []) views.set(v.id, Number(v.statistics?.viewCount || 0));
  });
  const videos = itens.filter((x) => views.has(x.id)).map((x) => [x.dia, views.get(x.id)]);
  const r = { at: new Date().toISOString(), videos, completo: !pageToken };
  await setJSON(chave, r);
  return r;
}

function limitesMes(m, hoje) {
  const [y, mo] = m.split("-").map(Number);
  const ini = Date.UTC(y, mo - 1, 1) / DIA;
  const fim = Math.min(Date.UTC(y, mo, 1) / DIA, hoje);
  return [ini, fim];
}

/** Views que o modelo atribui a cada mês, para uma curva k. */
export function modelar(videos, meses, k, hoje) {
  const lim = meses.map((m) => limitesMes(m, hoje));
  const out = new Array(meses.length).fill(0);
  for (const [dia, v] of videos) {
    if (!v) continue;
    const idade = Math.max(1, hoje - dia);
    const total = idade / (idade + k);
    for (let i = 0; i < lim.length; i++) {
      const [a, b] = lim[i];
      if (b <= dia) continue;
      const t1 = Math.min(idade, Math.max(0, a - dia));
      const t2 = Math.min(idade, Math.max(0, b - dia));
      if (t2 <= t1) continue;
      out[i] += (v * (t2 / (t2 + k) - t1 / (t1 + k))) / total;
    }
  }
  return out;
}

/** Meses com dados reais de uma pessoa (sem contar estimativas). */
export function mesesReais(db, p, ytstart, hoje) {
  const contados = p.channels.filter((c) => db.channels[c] && db.channels[c].count !== false);
  const yt = Object.fromEntries(contados.map((c) => [c, ytMonthly(ytstart[c], hoje)]));
  const meses = new Set(Object.keys(p.monthly || {}));
  for (const c of contados) {
    for (const m of Object.keys(yt[c])) meses.add(m);
    for (const m of Object.keys(db.channels[c].monthly || {})) meses.add(m);
  }
  const out = {};
  for (const m of meses) {
    let soma = 0;
    let tem = false;
    for (const c of contados) {
      const man = db.channels[c].monthly?.[m];
      const y = yt[c][m];
      const v = man?.lock ? man : y && !y.p ? y : man || null;
      if (v) {
        soma += v.v;
        tem = true;
      }
    }
    if (tem) out[m] = soma;
    else if (p.monthly?.[m] && p.monthly[m].src !== "estimativa") out[m] = p.monthly[m].v;
  }
  return out;
}

/** Calcula e grava a estimativa de uma pessoa. */
export async function estimarPessoa(db, personId, { forcar = false } = {}) {
  const p = db.people[personId];
  if (!p) throw new Error("Pessoa não encontrada.");
  const canais = p.channels.filter((c) => db.channels[c] && db.channels[c].count !== false);
  if (!canais.length) throw new Error(`${p.name} ainda não tem canal ligado.`);
  const hojeStr = todayLisbon();
  const hoje = Math.floor(Date.parse(hojeStr) / DIA);
  const ytstart = await getJSON("ytstart", {});
  const reais = mesesReais(db, p, ytstart, hojeStr);
  const ultimoCompleto = prevMonth(hojeStr.slice(0, 7));
  const meses = monthRange(PRIMEIRO_MES, ultimoCompleto);

  let videos = [];
  let incompleto = false;
  await pool(canais, 2, async (c) => {
    const h = await historico(c, { forcar });
    videos = videos.concat(h.videos);
    if (!h.completo) incompleto = true;
  });
  if (!videos.length) throw new Error(`Não encontrei vídeos nos canais de ${p.name}.`);

  // Escolher a curva e o fator de escala que melhor explicam os meses conhecidos
  const conhecidos = meses.map((m, i) => [i, reais[m]]).filter(([, v]) => v > 0);
  let melhor = { k: 18, s: 1, erro: null };
  const modelos = new Map();
  for (const k of CURVAS) modelos.set(k, modelar(videos, meses, k, hoje));
  if (conhecidos.length >= 2) {
    let melhorErro = Infinity;
    for (const k of CURVAS) {
      const mod = modelos.get(k);
      const pares = conhecidos.filter(([i]) => mod[i] > 0);
      if (pares.length < 2) continue;
      const logs = pares.map(([i, v]) => Math.log(v) - Math.log(mod[i]));
      const ls = logs.reduce((a, b) => a + b, 0) / logs.length;
      const erro = Math.sqrt(logs.reduce((a, b) => a + (b - ls) ** 2, 0) / logs.length);
      if (erro < melhorErro) {
        melhorErro = erro;
        melhor = { k, s: Math.exp(ls), erro };
      }
    }
  } else if (conhecidos.length === 1) {
    const [i, v] = conhecidos[0];
    const mod = modelos.get(melhor.k);
    if (mod[i] > 0) melhor.s = v / mod[i];
  }
  const modelo = modelos.get(melhor.k);
  const erroPct = melhor.erro === null ? null : Math.round((Math.exp(melhor.erro) - 1) * 100);

  // Preencher só os meses sem dados reais (e refazer estimativas antigas)
  let preenchidos = 0;
  p.monthly ||= {};
  meses.forEach((m, i) => {
    if (reais[m] !== undefined) return;
    const atual = p.monthly[m];
    if (atual && atual.src !== "estimativa") return;
    const v = Math.max(0, Math.round(modelo[i] * melhor.s));
    p.monthly[m] = { v, src: "estimativa", ...(erroPct !== null ? { erro: erroPct } : {}) };
    preenchidos++;
  });
  p.estimativa = {
    at: new Date().toISOString(),
    curva: melhor.k,
    escala: Math.round(melhor.s * 1000) / 1000,
    erro: erroPct,
    calibracao: conhecidos.length,
    videos: videos.length,
    incompleto,
    meses: preenchidos,
  };
  p.updatedAt = new Date().toISOString();
  return { personId, nome: p.name, ...p.estimativa };
}

/** Apaga todas as estimativas de uma pessoa (ou de todas). */
export function apagarEstimativas(db, personId) {
  let n = 0;
  for (const p of personId ? [db.people[personId]].filter(Boolean) : Object.values(db.people)) {
    for (const [m, v] of Object.entries(p.monthly || {})) {
      if (v.src === "estimativa") {
        delete p.monthly[m];
        n++;
      }
    }
    delete p.estimativa;
  }
  return n;
}

// ---------- Respostas falsas para testes locais ----------
function mock(endpoint, p) {
  if (endpoint === "playlistItems") {
    const base = p.playlistId.slice(2, 10);
    const total = 260;
    const ini = p.pageToken ? Number(p.pageToken) : 0;
    const items = [];
    for (let i = ini; i < Math.min(total, ini + 50); i++) {
      items.push({ contentDetails: { videoId: (base + "h" + i).slice(-11).padStart(11, "x"), videoPublishedAt: new Date(Date.now() - i * 3 * DIA).toISOString() } });
    }
    return { items, nextPageToken: ini + 50 < total ? String(ini + 50) : undefined };
  }
  if (endpoint === "videos") {
    return { items: p.id.split(",").map((id, i) => ({ id, statistics: { viewCount: String(20000 + ((i * 7919) % 90000)) } })) };
  }
  return { items: [] };
}

export { nextMonth };

/**
 * Corre a estimativa para algumas pessoas que ainda não a têm (usado de hora a hora).
 * Para não apagar alterações feitas ao mesmo tempo na área de edição, volta a ler a base
 * de dados antes de gravar e só copia os meses estimados.
 */
export async function estimarAutomatico(loadDB, saveDB, limite = 4) {
  const db = await loadDB();
  const alvo = Object.values(db.people)
    .filter((p) => p.channels.some((c) => db.channels[c]?.count !== false) && !p.estimativa)
    .slice(0, limite);
  const feitos = [];
  for (const p of alvo) {
    try {
      feitos.push(await estimarPessoa(db, p.id));
    } catch (e) {
      p.estimativa = { at: new Date().toISOString(), falhou: e.message, meses: 0 };
      feitos.push({ personId: p.id, falhou: e.message });
      if (/quota/i.test(e.message)) break;
    }
  }
  if (!feitos.length) return { pessoas: 0 };
  const fresco = await loadDB();
  for (const f of feitos) {
    const de = db.people[f.personId];
    const para = fresco.people[f.personId];
    if (!de || !para) continue;
    para.monthly ||= {};
    for (const [m, v] of Object.entries(de.monthly || {})) {
      if (v.src !== "estimativa") continue;
      const atual = para.monthly[m];
      if (!atual || atual.src === "estimativa") para.monthly[m] = v;
    }
    para.estimativa = de.estimativa;
  }
  await saveDB(fresco);
  return { pessoas: feitos.length, fresco };
}
